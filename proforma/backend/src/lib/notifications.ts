import { EventEmitter } from 'node:events'
import { prisma } from './prisma.js'
import type { Role } from '@prisma/client'

/**
 * Bus d'événements in-process : chaque connexion SSE ouverte (voir
 * routes/notifications.routes.ts) s'abonne au canal `user:<id>` et reçoit la
 * notification dès qu'elle est créée — c'est ce qui rend l'alerte "temps
 * réel" sans dépendre d'un rafraîchissement manuel ni d'un service de push
 * navigateur externe.
 */
export const notificationBus = new EventEmitter()
notificationBus.setMaxListeners(0)

export async function notifyCompany(
  companyId: string,
  input: { type: string; message: string; link?: string },
  opts: { rolesOnly?: Role[] } = {}
) {
  const memberships = await prisma.membership.findMany({
    where: { companyId, ...(opts.rolesOnly ? { role: { in: opts.rolesOnly } } : {}) },
    select: { userId: true },
  })

  const rows = await Promise.all(
    memberships.map((m) =>
      prisma.notification.create({
        data: { userId: m.userId, companyId, type: input.type, message: input.message, link: input.link },
      })
    )
  )

  for (const row of rows) notificationBus.emit(`user:${row.userId}`, row)
  return rows
}

export async function notifyCompanyAdmins(companyId: string, input: { type: string; message: string; link?: string }) {
  return notifyCompany(companyId, input, { rolesOnly: ['ADMIN'] })
}
