import type { Request, Response } from 'express'
import { prisma } from './prisma'
import { signAccessToken, signRefreshToken, signTwoFactorPendingToken } from './jwt'

/** User-Agent client tronqué avant stockage — header entièrement
 * contrôlé par l'appelant, aucune limite HTTP ne garantit une taille
 * raisonnable avant d'atteindre la base. */
export function safeUserAgent(req: Request): string | undefined {
  const raw = req.headers['user-agent']
  return typeof raw === 'string' ? raw.slice(0, 255) : undefined
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const isProd = process.env.NODE_ENV === 'production'
  // SameSite=None : le frontend (skignas.com) et l'API (skignas.up.railway.app)
  // sont deux domaines distincts — un cookie "Lax" n'est jamais envoyé sur les
  // appels fetch/XHR cross-site, seulement sur une navigation directe. "None"
  // exige Secure (HTTPS), déjà le cas en prod. En dev (http://localhost),
  // Secure serait rejeté par le navigateur — on garde "Lax" localement, où
  // le cookie ne sert de toute façon qu'en filet (le token est aussi renvoyé
  // dans le corps de la réponse pour l'en-tête Authorization).
  const crossSite = isProd
  res.cookie('access_token', accessToken, {
    httpOnly: true, secure: isProd, sameSite: crossSite ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7j
  })
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true, secure: isProd, sameSite: crossSite ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30j
  })
}

/** clearCookie doit recevoir les mêmes attributs que cookie() pour que le
 * navigateur identifie et supprime effectivement le bon cookie. */
export function clearAuthCookies(res: Response) {
  const isProd = process.env.NODE_ENV === 'production'
  const opts = { httpOnly: true, secure: isProd, sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax' }
  res.clearCookie('access_token', opts)
  res.clearCookie('refresh_token', opts)
}

export type SessionUser = {
  id: string; prenom: string; nom: string; email: string; role: string
  avatar: string | null; twoFactorEnabled: boolean
}

/** Émet les vrais tokens + crée la session — dernière étape commune à tout
 * login réussi (mot de passe, magic-link, Google, vérification 2FA). */
export async function issueTokensAndSession(user: SessionUser, req: Request, res: Response, extra: Record<string, unknown> = {}) {
  const accessToken  = signAccessToken({ userId: user.id, email: user.email, role: user.role })
  const refreshToken = signRefreshToken({ userId: user.id })

  await prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent: safeUserAgent(req),
      ipAddress: req.ip,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  setAuthCookies(res, accessToken, refreshToken)
  res.json({
    success: true,
    data: {
      user: { id: user.id, prenom: user.prenom, nom: user.nom, email: user.email, role: user.role, avatar: user.avatar },
      accessToken,
      ...extra,
    },
  })
}

/**
 * Point unique appelé après que login/magic-link/Google ait authentifié
 * l'utilisateur (mot de passe vérifié, lien consommé, ou compte Google
 * confirmé) — si la 2FA est activée, n'émet PAS de session : renvoie un
 * token intermédiaire à échanger contre de vrais tokens via
 * POST /api/auth/2fa/login-verify. Centralisé ici plutôt que dupliqué dans
 * chacun des trois chemins de connexion, pour qu'aucun ne puisse rester
 * non protégé par erreur.
 */
export async function completeAuthentication(user: SessionUser, req: Request, res: Response, extra: Record<string, unknown> = {}) {
  if (user.twoFactorEnabled) {
    res.json({ success: true, data: { requires2FA: true, tempToken: signTwoFactorPendingToken(user.id) } })
    return
  }
  await issueTokensAndSession(user, req, res, extra)
}
