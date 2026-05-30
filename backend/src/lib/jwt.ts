import jwt from 'jsonwebtoken'

const SECRET  = process.env.JWT_SECRET ?? 'koli-dev-secret-key'
const EXPIRES = process.env.JWT_EXPIRES_IN ?? '7d'
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d'

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
  return jwt.sign(payload, SECRET + '_refresh', { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions)
}

/** Vérifie et décode un access token */
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}

/** Vérifie et décode un refresh token */
export function verifyRefreshToken(token: string): Pick<JwtPayload, 'userId'> {
  return jwt.verify(token, SECRET + '_refresh') as Pick<JwtPayload, 'userId'>
}

/** Génère un magic-link token (15 min) */
export function signMagicToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email, type: 'magic' },
    SECRET + '_magic',
    { expiresIn: '15m' } as jwt.SignOptions,
  )
}

/** Vérifie un magic-link token */
export function verifyMagicToken(token: string): { userId: string; email: string; type: string } {
  return jwt.verify(token, SECRET + '_magic') as { userId: string; email: string; type: string }
}
