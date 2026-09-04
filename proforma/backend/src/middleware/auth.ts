import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import type { Role } from '@prisma/client'

export interface AuthedRequest extends Request {
  userId?: string
  companyId?: string
  role?: Role
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.token
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentification requise' })
  }
  try {
    const payload = verifyToken(token)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Session invalide ou expirée' })
  }
}

/**
 * Charge la Membership de l'utilisateur pour une entreprise donnée (ou null
 * s'il n'y a pas accès) — remplace les anciens checks directs sur
 * Company.userId maintenant que plusieurs comptes peuvent partager une
 * entreprise avec des rôles différents (§ multi-utilisateurs).
 */
export async function getMembership(userId: string, companyId: string) {
  return prisma.membership.findUnique({ where: { userId_companyId: { userId, companyId } } })
}

/**
 * Middleware factory : vérifie que l'utilisateur a une Membership sur
 * l'entreprise ciblée (paramètre :companyId, body.companyId ou
 * query.companyId), et — si `roles` est fourni — que son rôle y figure.
 * Pose req.companyId et req.role pour les handlers suivants.
 */
export function requireCompanyAccess(roles?: Role[]) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const companyId = req.params.companyId || req.body?.companyId || (req.query.companyId as string | undefined)
    if (!companyId) return res.status(400).json({ success: false, message: 'companyId manquant' })

    const membership = await getMembership(req.userId!, companyId)
    if (!membership) return res.status(404).json({ success: false, message: 'Entreprise introuvable' })

    if (roles && !roles.includes(membership.role)) {
      return res.status(403).json({ success: false, message: "Votre rôle ne permet pas cette action" })
    }

    req.companyId = companyId
    req.role = membership.role
    next()
  }
}

export function isAdmin(role?: Role) {
  return role === 'ADMIN'
}
