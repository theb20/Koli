import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const resend = apiKey ? new Resend(apiKey) : null

export const emailConfigured = Boolean(resend)

const NOT_CONFIGURED_MESSAGE =
  "Envoi d'e-mail non configuré : ajoute RESEND_API_KEY dans backend/.env pour activer cette fonctionnalité."

function requireResend() {
  if (!resend) throw new Error(NOT_CONFIGURED_MESSAGE)
  return resend
}

function fromAddress() {
  return process.env.EMAIL_FROM || 'Proforma <onboarding@resend.dev>'
}

function wrapper(bodyHtml: string) {
  return `<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1f2933">${bodyHtml}</div>`
}

function ctaButton(url: string, label: string) {
  return `<p style="text-align:center;margin:28px 0">
    <a href="${url}" style="background:#0a5c36;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a>
  </p>`
}

export async function sendProformaEmail(opts: {
  to: string
  companyName: string
  clientName: string
  documentNumber: string
  totalLabel: string
  expiryLabel?: string
  publicUrl: string
  pdfBuffer: Buffer
  senderName?: string | null
  signature?: string | null
}) {
  const client = requireResend()
  await client.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: `${opts.companyName} — Facture proforma ${opts.documentNumber}`,
    html: wrapper(`
      <p>Bonjour ${opts.clientName},</p>
      <p>${opts.companyName} vous a envoyé une facture proforma.</p>
      <table style="width:100%;margin:20px 0;font-size:14px">
        <tr><td style="color:#6b7280">Numéro</td><td style="text-align:right;font-weight:600">${opts.documentNumber}</td></tr>
        <tr><td style="color:#6b7280">Montant</td><td style="text-align:right;font-weight:600">${opts.totalLabel}</td></tr>
        ${opts.expiryLabel ? `<tr><td style="color:#6b7280">Valable jusqu'au</td><td style="text-align:right;font-weight:600">${opts.expiryLabel}</td></tr>` : ''}
      </table>
      ${ctaButton(opts.publicUrl, 'Consulter la proforma')}
      <p style="font-size:13px;color:#6b7280">Le document PDF est joint à cet e-mail.</p>
      ${opts.signature ? `<p style="font-size:13px;color:#6b7280;white-space:pre-wrap">${opts.signature}</p>` : ''}
    `),
    attachments: [{ filename: `${opts.documentNumber}.pdf`, content: opts.pdfBuffer }],
  })
}

const REMINDER_COPY: Record<'J7' | 'J3' | 'J0' | 'FOLLOWUP', { subject: (n: string) => string; intro: (n: string) => string }> = {
  J7: {
    subject: (n) => `Rappel — la proforma ${n} expire dans 7 jours`,
    intro: (n) => `Votre facture proforma <strong>${n}</strong> arrive à expiration dans 7 jours.`,
  },
  J3: {
    subject: (n) => `Rappel — la proforma ${n} expire dans 3 jours`,
    intro: (n) => `Votre facture proforma <strong>${n}</strong> arrive à expiration dans 3 jours.`,
  },
  J0: {
    subject: (n) => `Dernier jour — la proforma ${n} expire aujourd'hui`,
    intro: (n) => `Votre facture proforma <strong>${n}</strong> expire aujourd'hui.`,
  },
  FOLLOWUP: {
    subject: (n) => `Relance — en attente de votre réponse sur la proforma ${n}`,
    intro: (n) => `Nous n'avons pas encore reçu de réponse concernant la facture proforma <strong>${n}</strong>.`,
  },
}

export async function sendReminderEmail(opts: {
  kind: 'J7' | 'J3' | 'J0' | 'FOLLOWUP'
  to: string
  companyName: string
  clientName: string
  documentNumber: string
  totalLabel: string
  publicUrl: string
}) {
  const client = requireResend()
  const copy = REMINDER_COPY[opts.kind]
  await client.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: `${opts.companyName} — ${copy.subject(opts.documentNumber)}`,
    html: wrapper(`
      <p>Bonjour ${opts.clientName},</p>
      <p>${copy.intro(opts.documentNumber)}</p>
      <p style="font-size:14px"><strong>Montant :</strong> ${opts.totalLabel}</p>
      ${ctaButton(opts.publicUrl, 'Consulter la proforma')}
      <p style="font-size:12px;color:#9ca3af">Relance automatique envoyée par ${opts.companyName}.</p>
    `),
  })
}

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Administrateur', COMMERCIAL: 'Commercial', COMPTABLE: 'Comptable' }

export async function sendTeamInviteEmail(opts: { to: string; companyName: string; role: string; inviterName: string }) {
  const client = requireResend()
  await client.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: `${opts.inviterName} vous a ajouté à l'équipe ${opts.companyName} sur Proforma`,
    html: wrapper(`
      <p>Bonjour,</p>
      <p><strong>${opts.inviterName}</strong> vous a ajouté à l'équipe <strong>${opts.companyName}</strong> sur Proforma, avec le rôle <strong>${ROLE_LABEL[opts.role] || opts.role}</strong>.</p>
      <p>Connectez-vous avec votre compte existant pour accéder à cette entreprise depuis le sélecteur en haut de page.</p>
    `),
  })
}

export async function sendActivityNotificationEmail(opts: { to: string; companyName: string; documentNumber: string; action: string; publicOrAppUrl: string }) {
  const client = requireResend()
  await client.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: `${opts.companyName} — ${opts.action} : ${opts.documentNumber}`,
    html: wrapper(`
      <p>${opts.action} : <strong>${opts.documentNumber}</strong>.</p>
      ${ctaButton(opts.publicOrAppUrl, 'Voir le document')}
    `),
  })
}
