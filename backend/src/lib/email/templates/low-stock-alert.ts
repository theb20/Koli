import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, ctaButton } from '../components'

export type LowStockAlertPayload = {
  productName: string
  variantName?: string | null
  stock:        number
  threshold:    number
}

export async function sendLowStockAlertEmail(to: string, item: LowStockAlertPayload): Promise<void> {
  const merchantUrl = process.env.MERCHANT_URL ?? 'https://me.skignas.com'
  const label = item.variantName ? `${item.productName} — ${item.variantName}` : item.productName

  const html = await baseLayout(`
      ${subheading('Stock bas')}
      ${heading('⚠️ Stock bas sur un produit')}
      ${paragraph(`
        <strong style="color:#111827">${label}</strong> est descendu à
        <strong style="color:#111827">${item.stock}</strong> en stock
        (seuil d'alerte : ${item.threshold}).
      `)}
      ${paragraph('Réapprovisionnez-le pour éviter une rupture.', 'color:#6b7280;font-size:14px')}
      ${ctaButton('Voir mes produits', `${merchantUrl}/produits`)}
    `, `Stock bas — ${label}`)

  await send(to, `⚠️ Stock bas — ${label}`, html)
}
