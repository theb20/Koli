import { send }       from '../client'
import { baseLayout } from '../layout'
import { heading, paragraph, ctaButton, statusTag, highlightBox } from '../components'

const RETURN_STATUS_MAP: Record<string, {
  title: string; msg: (extra?: string) => string
  emoji: string; accent: string; accentBg: string; tag: string
}> = {
  requested: {
    title:    'Demande de retour reçue',
    tag:      'En attente',
    emoji:    '📥',
    accent:   '#d97706',
    accentBg: '#fef3c7',
    msg:      () => 'Votre demande de retour a bien été enregistrée. Notre équipe l\'examine et vous répond sous 48h ouvrées.',
  },
  approved: {
    title:    'Retour approuvé',
    tag:      'Approuvé',
    emoji:    '✅',
    accent:   '#059669',
    accentBg: '#d1fae5',
    msg:      () => 'Votre demande de retour a été approuvée. Merci de nous renvoyer le(s) article(s) selon les instructions communiquées.',
  },
  rejected: {
    title:    'Retour refusé',
    tag:      'Refusé',
    emoji:    '❌',
    accent:   '#dc2626',
    accentBg: '#fee2e2',
    msg:      (extra) => extra ? `Votre demande de retour n'a pas pu être acceptée. Motif : ${extra}` : "Votre demande de retour n'a pas pu être acceptée.",
  },
  received: {
    title:    'Article reçu',
    tag:      'Reçu',
    emoji:    '📦',
    accent:   '#0891b2',
    accentBg: '#e0f2fe',
    msg:      () => "Nous avons bien reçu et contrôlé votre retour. Le remboursement est en cours de traitement.",
  },
  refunded: {
    title:    'Remboursement effectué',
    tag:      'Remboursé',
    emoji:    '💳',
    accent:   '#059669',
    accentBg: '#d1fae5',
    msg:      () => 'Votre remboursement a été traité. Comptez 3 à 5 jours ouvrés pour voir les fonds sur votre moyen de paiement.',
  },
  cancelled: {
    title:    'Retour annulé',
    tag:      'Annulé',
    emoji:    '🚫',
    accent:   '#6b7280',
    accentBg: '#f3f4f6',
    msg:      () => 'Votre demande de retour a été annulée à votre demande.',
  },
}

export async function sendReturnStatusEmail(
  to: string,
  prenom: string,
  orderNumber: string,
  status: string,
  extra?: string,
): Promise<void> {
  const info = RETURN_STATUS_MAP[status]
  if (!info) return

  const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com'
  const message = info.msg(extra)

  const html = await baseLayout(`
      ${statusTag(info.tag, info.accent, info.accentBg)}
      ${heading(info.title)}
      ${paragraph(`Bonjour <strong style="color:#111827">${prenom}</strong>,`)}
      ${paragraph(message)}

      ${highlightBox(`
        <p style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;color:#6b7280;margin:0 0 6px;text-transform:uppercase;letter-spacing:.5px">Commande concernée</p>
        <p style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#111827;margin:0;letter-spacing:.5px">${orderNumber}</p>
      `)}

      ${ctaButton('Suivre ma commande', `${frontUrl}/commandes/${orderNumber}`, info.accent)}
    `, message)

  await send(to, `${info.emoji} ${info.title} · ${orderNumber}`, html)
}
