/* ─────────────────────────────────────────────────────────────
   Exécution d'une campagne d'e-mail de sécurité — toujours en tâche de
   fond, jamais attendue par la requête HTTP qui crée la campagne (voir
   routes/admin-security-emails.ts, qui répond dès la ligne créée).
   Envoie par lots avec un court délai entre chaque lot pour ne jamais
   dépasser le débit d'envoi de Resend — valeurs par défaut prudentes,
   ajustables via SECURITY_EMAIL_BATCH_SIZE / SECURITY_EMAIL_BATCH_DELAY_MS.
───────────────────────────────────────────────────────────── */
import { prisma } from './prisma'
import { logger } from './logger'
import { sendSecurityAlertEmail } from './mailer'

const BATCH_SIZE = Number(process.env.SECURITY_EMAIL_BATCH_SIZE) || 10
const BATCH_DELAY_MS = Number(process.env.SECURITY_EMAIL_BATCH_DELAY_MS) || 1000
// Diagnostic seulement — jamais une liste illimitée en base.
const MAX_FAILED_EMAILS_LOGGED = 50

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function resolveRecipients(campaign: { audience: string; targetUserIds: string | null }): Promise<{ email: string; prenom: string }[]> {
  if (campaign.audience === 'targeted') {
    const ids: string[] = campaign.targetUserIds ? JSON.parse(campaign.targetUserIds) : []
    return prisma.user.findMany({ where: { id: { in: ids } }, select: { email: true, prenom: true } })
  }
  // 'all' — exclut les comptes bannis (suspendus, ne peuvent plus se
  // connecter), même logique que POST /api/notifications/broadcast.
  return prisma.user.findMany({ where: { isBanned: false }, select: { email: true, prenom: true } })
}

export async function runSecurityEmailCampaign(campaignId: string): Promise<void> {
  const campaign = await prisma.securityEmailCampaign.findUnique({ where: { id: campaignId } })
  if (!campaign || campaign.status !== 'pending') return

  try {
    const recipients = await resolveRecipients(campaign)
    await prisma.securityEmailCampaign.update({
      where: { id: campaignId },
      data: { status: 'sending', startedAt: new Date(), totalRecipients: recipients.length },
    })

    let sent = 0
    let failed = 0
    const failedEmails: string[] = []

    for (const batch of chunk(recipients, BATCH_SIZE)) {
      const results = await Promise.allSettled(batch.map(u => sendSecurityAlertEmail(u.email, u.prenom, campaign.subject, campaign.message)))
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          sent++
        } else {
          failed++
          if (failedEmails.length < MAX_FAILED_EMAILS_LOGGED) failedEmails.push(batch[i]!.email)
          logger.error('[security-email-campaign] échec envoi', campaignId, batch[i]!.email, r.reason)
        }
      })
      await prisma.securityEmailCampaign.update({ where: { id: campaignId }, data: { sentCount: sent, failedCount: failed } })
      await sleep(BATCH_DELAY_MS)
    }

    await prisma.securityEmailCampaign.update({
      where: { id: campaignId },
      data: { status: 'done', completedAt: new Date(), failedEmails: failedEmails.length ? JSON.stringify(failedEmails) : null },
    })
  } catch (err) {
    logger.error('[security-email-campaign] échec campagne', campaignId, err)
    await prisma.securityEmailCampaign.update({ where: { id: campaignId }, data: { status: 'failed', completedAt: new Date() } }).catch(() => {})
  }
}
