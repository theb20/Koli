import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, divider, ctaButton, metaTable } from '../components'

export type NewProductRequestAdminPayload = {
  id:              string
  productName:     string
  description:     string
  clientNom:       string
  clientEmail:     string
  clientTelephone?: string | null
  quantity?:       number | null
  budget?:         number | null
  deliveryAddress: string
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR') + '&nbsp;FCFA'
}

export async function sendNewProductRequestAdminEmail(to: string, req: NewProductRequestAdminPayload): Promise<void> {
  const adminUrl = process.env.ADMIN_URL ?? 'https://adminskignas.web.app'

  const html = await baseLayout(`
      ${subheading('Nouvelle demande de sourcing')}
      ${heading(req.productName)}
      ${paragraph(`<strong style="color:#111827">${req.clientNom}</strong> recherche ce produit :`)}
      ${paragraph(req.description, 'background:#f8faff;border-radius:12px;padding:14px 16px')}

      ${divider()}
      ${metaTable([
        ['Client', req.clientNom],
        ['Email', req.clientEmail],
        ...(req.clientTelephone ? [['Téléphone', req.clientTelephone] as [string, string]] : []),
        ...(req.quantity ? [['Quantité', String(req.quantity)] as [string, string]] : []),
        ...(req.budget ? [['Budget', fmt(req.budget)] as [string, string]] : []),
        ['Livraison', req.deliveryAddress],
      ])}

      ${ctaButton('Répondre à la demande', `${adminUrl}/product-requests/${req.id}`)}
    `, `Nouvelle demande de sourcing : ${req.productName}`)

  await send(to, `🔎 Nouvelle demande de sourcing — ${req.productName}`, html)
}
