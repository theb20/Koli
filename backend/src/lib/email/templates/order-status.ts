import { send }       from '../client'
import { baseLayout } from '../layout'
import { heading, paragraph, ctaButton, statusTag, highlightBox } from '../components'

const ORDER_STATUS_MAP: Record<string, {
  title: string; msg: string
  emoji: string; accent: string; accentBg: string; tag: string
}> = {
  confirmed: {
    title:    'Commande confirmée',
    tag:      'Confirmée',
    emoji:    '✅',
    accent:   '#059669',
    accentBg: '#d1fae5',
    msg:      'Votre commande a été confirmée et est en cours de préparation.',
  },
  processing: {
    title:    'En préparation',
    tag:      'Préparation',
    emoji:    '📦',
    accent:   '#d97706',
    accentBg: '#fef3c7',
    msg:      'Notre équipe prépare soigneusement votre colis.',
  },
  shipped: {
    title:    'En livraison',
    tag:      'Expédiée',
    emoji:    '🚚',
    accent:   '#0891b2',
    accentBg: '#e0f2fe',
    msg:      'Votre colis est en route. Le livreur vous contactera pour la remise.',
  },
  delivered: {
    title:    'Commande livrée',
    tag:      'Livrée',
    emoji:    '🎉',
    accent:   '#059669',
    accentBg: '#d1fae5',
    msg:      "Votre commande vous a bien été remise. Nous espérons qu'elle vous satisfait pleinement.",
  },
  cancelled: {
    title:    'Commande annulée',
    tag:      'Annulée',
    emoji:    '❌',
    accent:   '#dc2626',
    accentBg: '#fee2e2',
    msg:      'Votre commande a été annulée. Un remboursement sera effectué sous 48h ouvrées si applicable.',
  },
  refunded: {
    title:    'Commande remboursée',
    tag:      'Remboursée',
    emoji:    '💳',
    accent:   '#dc2626',
    accentBg: '#fee2e2',
    msg:      'Votre remboursement a été traité. Comptez 3 à 5 jours ouvrés pour voir les fonds sur votre moyen de paiement.',
  },
}

export async function sendOrderStatusEmail(
  to: string,
  prenom: string,
  orderNumber: string,
  status: string,
): Promise<void> {
  const info = ORDER_STATUS_MAP[status]
  if (!info) return

  const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.ahobaut.fr'

  const html = await baseLayout(`
      ${statusTag(info.tag, info.accent, info.accentBg)}
      ${heading(info.title)}
      ${paragraph(`Bonjour <strong style="color:#111827">${prenom}</strong>,`)}
      ${paragraph(info.msg)}

      ${highlightBox(`
        <p style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;color:#6b7280;margin:0 0 6px;text-transform:uppercase;letter-spacing:.5px">Référence commande</p>
        <p style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#111827;margin:0;letter-spacing:.5px">${orderNumber}</p>
      `)}

      ${ctaButton('Voir ma commande', `${frontUrl}/commandes/${orderNumber}`, info.accent)}
    `, info.msg)

  await send(to, `${info.emoji} ${info.title} · ${orderNumber}`, html)
}
