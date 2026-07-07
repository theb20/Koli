import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, dealProductCard, ctaButton } from '../components'

export type FlashDealProduct = {
  id: number
  name: string
  image: string
  price: number
  salePrice: number
}

export async function sendFlashDealEmail(
  to: string,
  prenom: string,
  products: FlashDealProduct[],
  endsAt: Date,
): Promise<void> {
  const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.ahobaut.fr'
  const endLabel  = endsAt.toLocaleString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
  const title     = products.length === 1
    ? `Vente flash sur ${products[0]!.name}`
    : `Vente flash sur ${products.length} produits`

  const cards = products
    .map(p => dealProductCard({ ...p, url: `${frontUrl}/catalogue/${p.id}` }))
    .join('')

  const html = await baseLayout(`
      ${subheading('Vente flash ⚡')}
      ${heading(`Bonjour ${prenom},`)}
      ${paragraph(`Une promotion à durée limitée vient d'être lancée${products.length > 1 ? ' sur plusieurs produits' : ''} — jusqu'à <strong style="color:#dc2626">-${Math.max(...products.map(p => Math.round(((p.price - p.salePrice) / p.price) * 100)))}%</strong>.`)}

      ${cards}

      ${paragraph(`⏳ Offre valable jusqu'au <strong style="color:#111827">${endLabel}</strong>, dans la limite des stocks disponibles.`)}

      ${ctaButton('Voir la vente flash', `${frontUrl}/catalogue?badge=sale`, '#dc2626')}
    `, title)

  await send(to, `⚡ ${title} — à ne pas manquer`, html)
}
