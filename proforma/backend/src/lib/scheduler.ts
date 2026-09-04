import cron from 'node-cron'
import { prisma } from './prisma.js'
import { formatMoney, type Currency } from './money.js'
import { emailConfigured, sendReminderEmail } from './email.js'
import { createProformaFromContent, type ProformaContent } from './proformaBuilder.js'
import { notifyCompanyAdmins } from './notifications.js'

const DAY_MS = 86_400_000
const FOLLOWUP_INTERVAL_DAYS = 5
const FOLLOWUP_MAX = 3

function publicUrl(token: string) {
  return `${process.env.APP_PUBLIC_URL || 'http://localhost:5175'}/p/${token}`
}

/**
 * Relances J-7 / J-3 / jour J avant expiration, relance après
 * FOLLOWUP_INTERVAL_DAYS jours sans réponse, et passage automatique en
 * EXPIRED des proformas dont la date d'expiration est dépassée.
 */
export async function runReminders() {
  if (!emailConfigured) return { sent: 0, skipped: 'email non configuré' }

  const now = new Date()
  let sent = 0

  const active = await prisma.proforma.findMany({
    where: { status: { in: ['SENT', 'VIEWED', 'PENDING'] }, expiryDate: { not: null } },
    include: { client: true, company: true },
  })

  for (const p of active) {
    if (!p.client.email || !p.expiryDate) continue
    const daysLeft = Math.ceil((p.expiryDate.getTime() - now.getTime()) / DAY_MS)

    let kind: 'J7' | 'J3' | 'J0' | null = null
    if (daysLeft <= 7 && daysLeft > 3 && !p.reminderJ7SentAt) kind = 'J7'
    else if (daysLeft <= 3 && daysLeft > 0 && !p.reminderJ3SentAt) kind = 'J3'
    else if (daysLeft <= 0 && !p.reminderJ0SentAt) kind = 'J0'

    if (kind) {
      try {
        await sendReminderEmail({
          kind,
          to: p.client.email,
          companyName: p.company.name,
          clientName: p.client.name,
          documentNumber: p.number,
          totalLabel: formatMoney(p.total, p.currency as Currency),
          publicUrl: publicUrl(p.publicToken),
        })
        const field = kind === 'J7' ? 'reminderJ7SentAt' : kind === 'J3' ? 'reminderJ3SentAt' : 'reminderJ0SentAt'
        await prisma.proforma.update({
          where: { id: p.id },
          data: { [field]: now, activity: { create: { action: `Relance ${kind} envoyée`, actor: 'system' } } },
        })
        sent++
      } catch (err) {
        console.error(`[scheduler] échec relance ${kind} pour ${p.number}:`, err)
      }
      continue
    }

    // Relance "sans réponse" — indépendante des relances d'expiration ci-dessus
    const since = p.lastFollowUpAt || p.sentAt
    if (since && p.followUpCount < FOLLOWUP_MAX && now.getTime() - since.getTime() >= FOLLOWUP_INTERVAL_DAYS * DAY_MS) {
      try {
        await sendReminderEmail({
          kind: 'FOLLOWUP',
          to: p.client.email,
          companyName: p.company.name,
          clientName: p.client.name,
          documentNumber: p.number,
          totalLabel: formatMoney(p.total, p.currency as Currency),
          publicUrl: publicUrl(p.publicToken),
        })
        await prisma.proforma.update({
          where: { id: p.id },
          data: {
            lastFollowUpAt: now,
            followUpCount: { increment: 1 },
            activity: { create: { action: 'Relance automatique (sans réponse) envoyée', actor: 'system' } },
          },
        })
        sent++
      } catch (err) {
        console.error(`[scheduler] échec relance de suivi pour ${p.number}:`, err)
      }
    }
  }

  // Passage automatique en EXPIRED
  const expired = await prisma.proforma.updateMany({
    where: { status: { in: ['DRAFT', 'PENDING', 'SENT', 'VIEWED'] }, expiryDate: { lt: now } },
    data: { status: 'EXPIRED' },
  })

  return { sent, expired: expired.count }
}

/**
 * Facturation récurrente : génère une nouvelle proforma pour chaque plan
 * actif dont l'échéance est atteinte, puis avance nextRunAt.
 */
export async function runRecurringPlans() {
  const now = new Date()
  const due = await prisma.recurringPlan.findMany({ where: { active: true, nextRunAt: { lte: now } } })
  let generated = 0

  for (const plan of due) {
    try {
      const proforma = await createProformaFromContent({
        companyId: plan.companyId,
        clientId: plan.clientId,
        currency: plan.currency as Currency,
        content: plan.content as unknown as ProformaContent,
        activityLabel: `Générée automatiquement par le plan récurrent "${plan.label}"`,
        recurringPlanId: plan.id,
      })

      await prisma.recurringPlan.update({ where: { id: plan.id }, data: { nextRunAt: nextRunDate(plan.nextRunAt, plan.interval) } })

      await notifyCompanyAdmins(plan.companyId, {
        type: 'recurring_generated',
        message: `Proforma ${proforma.number} générée automatiquement (plan "${plan.label}")`,
        link: `/proformas/${proforma.id}`,
      })

      generated++
    } catch (err) {
      console.error(`[scheduler] échec génération récurrente pour le plan ${plan.id}:`, err)
    }
  }

  return { generated }
}

function nextRunDate(from: Date, interval: string): Date {
  const d = new Date(from)
  if (interval === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (interval === 'quarterly') d.setMonth(d.getMonth() + 3)
  else d.setFullYear(d.getFullYear() + 1)
  return d
}

let started = false

export function startScheduler() {
  if (started) return
  started = true
  const expr = process.env.REMINDER_CRON || '*/15 * * * *'
  cron.schedule(expr, async () => {
    try {
      const [reminders, recurring] = await Promise.all([runReminders(), runRecurringPlans()])
      if (reminders.sent || recurring.generated) {
        console.log('[scheduler]', reminders, recurring)
      }
    } catch (err) {
      console.error('[scheduler] erreur:', err)
    }
  })
  console.log(`[scheduler] démarré (${expr})`)
}
