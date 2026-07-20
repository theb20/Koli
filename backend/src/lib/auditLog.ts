import type { Request } from 'express'
import { prisma } from './prisma'
import { logger } from './logger'

type AuditParams = {
  action: string
  targetType: string
  targetId: string
  metadata?: Record<string, unknown>
}

/**
 * Journalise une action admin sensible. Échoue silencieusement (log serveur
 * seulement) — un incident sur le journal ne doit jamais bloquer l'action
 * elle-même.
 */
export async function logAdminAction(req: Request, params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId:    req.user?.userId ?? null,
        actorEmail: req.user?.email ?? null,
        action:     params.action,
        targetType: params.targetType,
        targetId:   params.targetId,
        metadata:   params.metadata ? JSON.stringify(params.metadata) : null,
        ip:         req.ip ?? null,
      },
    })
  } catch (err) {
    logger.error('[audit-log]', err)
  }
}
