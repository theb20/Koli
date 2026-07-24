import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { verifyAccessToken } from '../lib/jwt'
import { prisma } from '../lib/prisma'

/**
 * Middleware — vérifie le JWT (Bearer header ou cookie).
 * Vérifie aussi le statut banni en base à chaque requête : le JWT étant
 * stateless, ne pas le faire laisserait un compte banni actif jusqu'à
 * l'expiration de son access token (jusqu'à 15 min) au lieu d'une
 * déconnexion immédiate.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { isBanned: true } })
    if (!user || user.isBanned) {
      res.status(401).json({ success: false, message: 'Compte suspendu' })
      return
    }

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

/** Middleware — vérifie le rôle seller (marchand) */
export function requireSeller(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'seller') {
      res.status(403).json({ success: false, message: 'Accès réservé aux marchands' })
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

/**
 * Middleware — protège une route par clé API statique (header `x-api-key`
 * ou paramètre `?key=`), pour les intégrations externes qui ne peuvent pas
 * gérer un token JWT qui expire (ex: Google Sheets / Apps Script).
 * Comparaison en temps constant pour éviter une attaque par timing.
 */
export function requireApiKey(envVar: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const expected = process.env[envVar]
    const provided = (req.headers['x-api-key'] as string | undefined) ?? (req.query['key'] as string | undefined)

    if (!expected || !provided) {
      res.status(401).json({ success: false, message: 'Clé API requise' })
      return
    }

    const a = Buffer.from(provided)
    const b = Buffer.from(expected)
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b)
    if (!valid) {
      res.status(401).json({ success: false, message: 'Clé API invalide' })
      return
    }

    next()
  }
}
