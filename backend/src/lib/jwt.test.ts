import { describe, it, expect, afterEach, vi } from 'vitest'
import jwt from 'jsonwebtoken'
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  isTokenExpiredError,
  signTwoFactorPendingToken,
  verifyTwoFactorPendingToken,
  unsafeDecodeExpiredRefreshToken,
} from './jwt'

const PAYLOAD = { userId: 'user_123', email: 'test@skignas.com', role: 'customer' }

describe('access token', () => {
  it('signe puis vérifie un aller-retour correct', () => {
    const token = signAccessToken(PAYLOAD)
    const decoded = verifyAccessToken(token)
    expect(decoded.userId).toBe(PAYLOAD.userId)
    expect(decoded.email).toBe(PAYLOAD.email)
    expect(decoded.role).toBe(PAYLOAD.role)
  })

  it('rejette un token signé avec un secret différent', () => {
    // Un access token ne doit jamais être accepté comme refresh token —
    // refresh utilise SECRET + '_refresh', une clé effectivement différente.
    const token = signAccessToken(PAYLOAD)
    expect(() => verifyRefreshToken(token)).toThrow()
  })

  it('rejette un token altéré (signature invalide)', () => {
    const token = signAccessToken(PAYLOAD)
    const tampered = token.slice(0, -3) + 'xxx'
    expect(() => verifyAccessToken(tampered)).toThrow()
  })
})

describe('refresh token', () => {
  it('signe puis vérifie un aller-retour correct', () => {
    const token = signRefreshToken({ userId: PAYLOAD.userId })
    const decoded = verifyRefreshToken(token)
    expect(decoded.userId).toBe(PAYLOAD.userId)
  })

  it('isTokenExpiredError distingue une expiration d\'une autre erreur', () => {
    expect(isTokenExpiredError(new Error('autre chose'))).toBe(false)
  })

  it('unsafeDecodeExpiredRefreshToken relit le payload sans vérifier la signature', () => {
    const token = signRefreshToken({ userId: PAYLOAD.userId })
    expect(unsafeDecodeExpiredRefreshToken(token)).toBe(PAYLOAD.userId)
  })

  it('unsafeDecodeExpiredRefreshToken renvoie null pour un jeton illisible', () => {
    expect(unsafeDecodeExpiredRefreshToken('pas-un-jwt')).toBeNull()
  })
})

describe('token 2FA intermédiaire', () => {
  it('signe puis vérifie un aller-retour correct', () => {
    const token = signTwoFactorPendingToken(PAYLOAD.userId)
    expect(verifyTwoFactorPendingToken(token).userId).toBe(PAYLOAD.userId)
  })

  it('rejette un access token présenté comme jeton 2FA', () => {
    // Trois secrets dérivés distincts (accès, refresh, 2fa_pending) — un jeton
    // émis pour un usage ne doit jamais être accepté pour un autre.
    const accessToken = signAccessToken(PAYLOAD)
    expect(() => verifyTwoFactorPendingToken(accessToken)).toThrow()
  })

  it('rejette un jeton dont purpose ne vaut pas 2fa_pending', () => {
    // signTwoFactorPendingToken est la seule fonction de la lib à poser `purpose`,
    // donc simuler un jeton du même secret mais sans le bon purpose nécessite de
    // resigner à la main — vérifie que verifyTwoFactorPendingToken ne se fie pas
    // qu'à la signature.
    const fake = jwt.sign({ userId: PAYLOAD.userId, purpose: 'autre_chose' }, process.env.JWT_SECRET + '_2fa_pending')
    expect(() => verifyTwoFactorPendingToken(fake)).toThrow('Token invalide')
  })
})

describe('bascule vers un secret refresh/2FA indépendant', () => {
  // jwt.ts lit JWT_REFRESH_SECRET/JWT_2FA_SECRET au chargement du module —
  // il faut donc réinitialiser le cache de modules et réimporter dynamiquement
  // après avoir posé les variables pour que le changement soit pris en compte.
  afterEach(() => {
    delete process.env.JWT_REFRESH_SECRET
    delete process.env.JWT_2FA_SECRET
    vi.resetModules()
  })

  it('un refresh token émis AVANT la bascule reste valide APRÈS (fallback sur le secret dérivé)', async () => {
    const legacyToken = signRefreshToken({ userId: PAYLOAD.userId })

    process.env.JWT_REFRESH_SECRET = 'independent-refresh-secret-at-least-32-chars'
    vi.resetModules()
    const fresh = await import('./jwt')

    expect(fresh.verifyRefreshToken(legacyToken).userId).toBe(PAYLOAD.userId)
  })

  it('un refresh token émis APRÈS la bascule utilise le nouveau secret (rejeté par l\'ancien seul)', async () => {
    process.env.JWT_REFRESH_SECRET = 'independent-refresh-secret-at-least-32-chars'
    vi.resetModules()
    const fresh = await import('./jwt')
    const newToken = fresh.signRefreshToken({ userId: PAYLOAD.userId })

    expect(fresh.verifyRefreshToken(newToken).userId).toBe(PAYLOAD.userId)
    expect(() => jwt.verify(newToken, process.env.JWT_SECRET + '_refresh')).toThrow()
  })

  it('un token 2FA intermédiaire émis AVANT la bascule reste valide APRÈS', async () => {
    const legacyToken = signTwoFactorPendingToken(PAYLOAD.userId)

    process.env.JWT_2FA_SECRET = 'independent-2fa-secret-at-least-32-characters'
    vi.resetModules()
    const fresh = await import('./jwt')

    expect(fresh.verifyTwoFactorPendingToken(legacyToken).userId).toBe(PAYLOAD.userId)
  })
})
