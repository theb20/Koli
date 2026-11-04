import { send }         from '../client'
import { baseLayout }   from '../layout'
import { heading, paragraph, ctaButton, statusTag, metaTable } from '../components'

function fmtFCFA(n: number): string {
  return n.toLocaleString('fr-FR') + '&nbsp;FCFA'
}

export type SubscriptionInvoicePayload = {
  amount:     number
  checkoutUrl: string
  dueAt:      Date
  periodLabel: string // ex: "Novembre 2026"
}

/** Facture d'abonnement mensuelle — générée et envoyée automatiquement, voir merchantgo (SubscriptionInvoice). */
export async function sendSubscriptionInvoiceEmail(to: string, p: SubscriptionInvoicePayload): Promise<void> {
  const html = await baseLayout(`
      ${statusTag('Facture d\'abonnement', '#1a73e8', '#e8f0fe')}
      ${heading(`Abonnement — ${p.periodLabel}`)}
      ${paragraph(`Votre abonnement Skignas de ${p.periodLabel} est prêt à être réglé.`)}

      ${metaTable([
        ['Montant', `<strong>${fmtFCFA(p.amount)}</strong>`],
        ['À régler avant le', p.dueAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })],
      ])}

      ${paragraph('Passé ce délai, votre boutique sera automatiquement suspendue (catalogue masqué) jusqu\'au paiement — la réactivation est elle aussi automatique, dès le paiement reçu.', 'color:#dc2626;font-size:13px')}

      ${ctaButton('Payer maintenant', p.checkoutUrl)}
    `, `Facture d'abonnement ${p.periodLabel} — ${fmtFCFA(p.amount)}`)

  await send(to, `💳 Facture d'abonnement ${p.periodLabel} — ${fmtFCFA(p.amount).replace('&nbsp;', ' ')}`, html)
}

export type StoreSuspendedPayload = { reason: string; checkoutUrl?: string }

/** Suspension automatique — jamais déclenchée manuellement sans raison (voir SellerStore.suspendedAt). */
export async function sendStoreSuspendedEmail(to: string, p: StoreSuspendedPayload): Promise<void> {
  const html = await baseLayout(`
      ${statusTag('Boutique suspendue', '#dc2626', '#fee2e2')}
      ${heading('⛔ Votre boutique a été suspendue')}
      ${paragraph(p.reason)}
      ${paragraph('Votre catalogue est momentanément masqué du site. La réactivation est automatique dès que le paiement est reçu.', 'color:#6b7280;font-size:14px')}
      ${p.checkoutUrl ? ctaButton('Régulariser maintenant', p.checkoutUrl, '#dc2626') : ''}
    `, 'Votre boutique a été suspendue')

  await send(to, '⛔ Votre boutique Skignas a été suspendue', html)
}

/** Réactivation automatique, au paiement. */
export async function sendStoreReactivatedEmail(to: string): Promise<void> {
  const html = await baseLayout(`
      ${statusTag('Boutique réactivée', '#059669', '#d1fae5')}
      ${heading('✅ Votre boutique est de nouveau active')}
      ${paragraph('Votre paiement a été reçu — votre catalogue est de nouveau visible sur le site. Merci !')}
    `, 'Votre boutique est réactivée')

  await send(to, '✅ Votre boutique Skignas est réactivée', html)
}
