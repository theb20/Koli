import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../lib/jwt'

/** Middleware — vérifie le JWT (Bearer header ou cookie) */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization
    const tokenFromHeader = header?.startsWith('Bearer ') ? header.slice(7) : null
    const tokenFromCookie = req.cookies?.access_token as string | undefined

    const token = tokenFromHeader ?? tokenFromCookie
    if (!token) {
      res.status(401).json({ success: false, message: 'Authentification requise' })
      return
    }

    const payload = verifyAccessToken(token)
    req.user = payload
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Token invalide ou expiré' })
  }
}

/** Middleware — vérifie le rôle admin */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs' })
      return
    }
    next()
  })
}

/** Middleware — optionnel : injecte req.user si token présent, sans bloquer */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization
    const token  = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.access_token
    if (token) req.user = verifyAccessToken(token)
  } catch {
    // Token invalide ignoré
  }
  next()
}
