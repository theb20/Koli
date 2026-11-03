import { send }         from '../client'
import { baseLayout }   from '../layout'
import { heading, paragraph, ctaButton, statusTag, metaTable } from '../components'

function fmtFCFA(n: number): string {
  return n.toLocaleString('fr-FR') + '&nbsp;FCFA'
}

const MONTH_LABELS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

export type MonthlySettlementPayload = {
  storeName:        string
  periodStart:      Date // 1er du mois couvert
  grossAmount:      number
  commissionAmount: number
  netAmount:        number
  transactionCount: number
}

/**
 * Relevé mensuel envoyé PAR Skignas AU marchand (jamais l'inverse) — même
 * doctrine que les autres emails marchand (new-order-merchant.ts) : contenu
 * minimal ici, le détail transaction par transaction reste dans l'espace
 * marchand (section "Relevés"), ce mail sert de notification + résumé.
 */
export async function sendMonthlySettlementEmail(to: string, s: MonthlySettlementPayload): Promise<void> {
  const merchantUrl = process.env.MERCHANT_URL ?? 'https://me.skignas.com'
  const monthLabel = `${MONTH_LABELS[s.periodStart.getMonth()]} ${s.periodStart.getFullYear()}`

  const html = await baseLayout(`
      ${statusTag('Relevé mensuel', '#059669', '#d1fae5')}
      ${heading(`Votre relevé de ${monthLabel}`)}
      ${paragraph(`Bonjour, voici le résumé de votre activité sur Skignas pour <strong style="color:#111827">${s.storeName}</strong> en ${monthLabel}.`)}

      ${metaTable([
        ['Ventes brutes', fmtFCFA(s.grossAmount)],
        ['Commission Skignas', `− ${fmtFCFA(s.commissionAmount)}`],
        ['Net', `<strong>${fmtFCFA(s.netAmount)}</strong>`],
        ['Transactions', String(s.transactionCount)],
      ])}

      ${paragraph('Le détail complet (vente par vente, remboursements inclus) est disponible dans votre espace marchand, section Relevés.', 'color:#6b7280;font-size:14px')}

      ${ctaButton('Voir mon relevé', `${merchantUrl}/releves`)}
    `, `Relevé ${monthLabel} — ${fmtFCFA(s.netAmount)} net`)

  await send(to, `📄 Relevé ${monthLabel} — ${fmtFCFA(s.netAmount).replace('&nbsp;', ' ')} net`, html)
}
