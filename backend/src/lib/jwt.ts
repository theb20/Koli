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
