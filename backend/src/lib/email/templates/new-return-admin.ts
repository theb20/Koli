import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, divider, ctaButton, metaTable } from '../components'

export type NewReturnAdminPayload = {
  orderNumber: string
  clientNom:   string
  clientEmail: string
  reason:      string
  itemsLabel:  string
  returnId:    string
}

const REASON_LABELS: Record<string, string> = {
  defective:         'Article défectueux',
  wrong_item:        'Mauvais article reçu',
  not_as_described:  "Ne correspond pas à la description",
  no_longer_needed:  "N'en a plus besoin",
  other:             'Autre',
}

export async function sendNewReturnAdminEmail(to: string, r: NewReturnAdminPayload): Promise<void> {
  const adminUrl = process.env.ADMIN_URL ?? 'https://adminskignas.web.app'

  const html = await baseLayout(`
      ${subheading('Nouvelle demande de retour')}
      ${heading(`🔄 Retour · ${r.orderNumber}`)}
      ${paragraph(`<strong style="color:#111827">${r.clientNom}</strong> souhaite retourner un ou plusieurs articles de sa commande.`)}

      ${divider()}

      ${metaTable([
        ['Commande', r.orderNumber],
        ['Client', r.clientNom],
        ['Email', r.clientEmail],
        ['Motif', REASON_LABELS[r.reason] ?? r.reason],
        ['Articles', r.itemsLabel],
      ])}

      ${ctaButton('Traiter la demande', `${adminUrl}/returns/${r.returnId}`)}
    `, `Nouvelle demande de retour — ${r.orderNumber}`)

  await send(to, `🔄 Nouvelle demande de retour · ${r.orderNumber}`, html)
}
