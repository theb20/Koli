import jwt from 'jsonwebtoken'
import { logger } from './logger'

// Aucun repli silencieux : un secret manquant ou faible doit faire échouer le
// démarrage du serveur, pas se rabattre discrètement sur une valeur devinable.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error(
    'JWT_SECRET manquant ou trop court (min. 32 caractères) — défini-le dans .env avant de démarrer le serveur.'
  )
}

const SECRET  = process.env.JWT_SECRET
const EXPIRES = process.env.JWT_EXPIRES_IN ?? '15m'
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d'

/*
 * Secrets refresh/2FA — historiquement dérivés de SECRET par simple
 * concaténation (SECRET + '_refresh'), ce qui compromettait leur
 * indépendance en cas de fuite de JWT_SECRET. JWT_REFRESH_SECRET et
 * JWT_2FA_SECRET (optionnels) permettent une bascule vers des secrets
 * réellement indépendants SANS déconnecter tout le monde d'un coup : tant
 * qu'un ancien token (signé avec le secret dérivé) n'a pas expiré ou n'a
 * pas été rotaté (le refresh token change à chaque appel à /refresh), la
 * vérification retente avec l'ancien secret avant d'abandonner. Une fois
 * les deux variables renseignées en prod, ne PAS les retirer : les
 * supprimer reviendrait à repasser sur le secret dérivé pour tout nouveau
 * token signé, ce qui romprait la bascule dans l'autre sens.
 */
const LEGACY_REFRESH_SECRET = SECRET + '_refresh'
const REFRESH_SECRET        = process.env.JWT_REFRESH_SECRET ?? LEGACY_REFRESH_SECRET
const LEGACY_TWOFACTOR_SECRET = SECRET + '_2fa_pending'
const TWOFACTOR_SECRET        = process.env.JWT_2FA_SECRET ?? LEGACY_TWOFACTOR_SECRET

export type JwtPayload = {
  userId: string
  email: string
  role: string
}

/** Génère un access token (courte durée) */
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES } as jwt.SignOptions)
}

/** Génère un refresh token (longue durée) */
export function signRefreshToken(payload: Pick<JwtPayload, 'userId'>): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions)
}

/** Vérifie et décode un access token **/
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}

/**
 * Vérifie une signature avec le secret courant, puis retente avec l'ancien
 * secret dérivé si la signature ne correspond pas (token émis avant la
 * bascule vers un secret indépendant) — voir commentaire au-dessus de
 * REFRESH_SECRET. jwt.verify valide toujours la signature avant `exp` :
 * une TokenExpiredError signifie donc que LA signature testée était la
 * bonne, inutile de retenter avec l'autre secret dans ce cas.
 */
function verifyWithFallback<T>(token: string, current: string, legacy: string, label: string): T {
  if (current === legacy) return jwt.verify(token, current) as T
  try {
    return jwt.verify(token, current) as T
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError && !(err instanceof jwt.TokenExpiredError)) {
      const decoded = jwt.verify(token, legacy) as T
      // Signal de rollout : chaque log ici est un token encore émis avant la
      // bascule. Une fois ces logs taris (le plus long-vécu est le refresh
      // token, 30j), JWT_REFRESH_SECRET/JWT_2FA_SECRET peuvent perdre leur
      // filet de sécurité sans risquer de déconnecter qui que ce soit.
      logger.warn(`[jwt] token ${label} vérifié via le secret dérivé (legacy) — rotation en cours`)
      return decoded
    }
    throw err
  }
}

/** Vérifie et décode un refresh token */
export function verifyRefreshToken(token: string): Pick<JwtPayload, 'userId'> {
  return verifyWithFallback<Pick<JwtPayload, 'userId'>>(token, REFRESH_SECRET, LEGACY_REFRESH_SECRET, 'refresh')
}

export function isTokenExpiredError(err: unknown): boolean {
  return err instanceof jwt.TokenExpiredError
}

/*
 * Token intermédiaire émis quand le mot de passe/magic-link/Google vient
 * d'être validé mais que la 2FA reste à vérifier — ni un access token
 * (aucun rôle/droit dessus, refusé par requireAuth) ni un refresh token
 * (secret dédié, ne peut pas servir à /refresh). Courte durée de vie :
 * la fenêtre pendant laquelle un attaquant en possession du mot de passe
 * peut encore tenter de deviner le code TOTP doit rester minimale.
 */
export function signTwoFactorPendingToken(userId: string): string {
  return jwt.sign({ userId, purpose: '2fa_pending' }, TWOFACTOR_SECRET, { expiresIn: '5m' })
}

export function verifyTwoFactorPendingToken(token: string): { userId: string } {
  const decoded = verifyWithFallback<{ userId: string; purpose: string }>(token, TWOFACTOR_SECRET, LEGACY_TWOFACTOR_SECRET, '2fa_pending')
  if (decoded.purpose !== '2fa_pending') throw new Error('Token invalide')
  return { userId: decoded.userId }
}

/**
 * Extrait le userId d'un refresh token SANS vérifier sa validité — à
 * n'appeler qu'après avoir confirmé via isTokenExpiredError() que jsonwebtoken
 * a déjà validé la signature avant de rejeter pour cause d'expiration (jwt.verify
 * vérifie toujours la signature avant de contrôler `exp` — TokenExpiredError
 * ne peut donc être levée que pour un token dont la signature est authentique).
 */
export function unsafeDecodeExpiredRefreshToken(token: string): string | null {
  const decoded = jwt.decode(token) as { userId?: string } | null
  return decoded?.userId ?? null
}
