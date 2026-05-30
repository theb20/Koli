import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, ctaButton, highlightBox } from '../components'

export async function sendContactReply(to: string, prenom: string, sujet: string): Promise<void> {
  await send(
    to,
    `Re : ${sujet} — DropShip`,
    baseLayout(`
      ${subheading('Support client')}
      ${heading('Message bien reçu.')}
      ${paragraph(`Bonjour <strong style="color:#111827">${prenom}</strong>,`)}
      ${paragraph(`Votre message concernant <strong style="color:#111827">&laquo;&nbsp;${sujet}&nbsp;&raquo;</strong> a été transmis à notre équipe. Nous vous répondrons dans les <strong style="color:#111827">24 heures</strong> ouvrées.`)}

      ${highlightBox(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:top;padding-right:12px;font-size:18px;padding-top:2px;width:32px">💬</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.6">
              Pour toute urgence, notre équipe est disponible <strong style="color:#111827">7j/7</strong> sur WhatsApp.
            </td>
          </tr>
        </table>
      `)}

      ${ctaButton('Contacter via WhatsApp', 'https://wa.me/237600000000', '#059669')}
    `, `Nous avons bien reçu votre message concernant "${sujet}".`),
  )
}
