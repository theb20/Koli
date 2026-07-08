import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, divider, highlightBox, ctaButton } from '../components'

function fmt(n: number): string {
  return n.toLocaleString('fr-FR') + '&nbsp;FCFA'
}

export async function sendProductRequestReplyEmail(
  to: string,
  prenom: string,
  productName: string,
  replyMessage: string,
  quotedPrice?: number | null,
): Promise<void> {
  const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com'

  const html = await baseLayout(`
      ${subheading('Réponse à votre demande')}
      ${heading(`Concernant : ${productName}`)}
      ${paragraph(`Bonjour <strong style="color:#111827">${prenom}</strong>,`)}
      ${paragraph(`Notre équipe a étudié votre demande de sourcing. Voici notre réponse :`)}

      ${highlightBox(`<p style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#111827;line-height:1.7;white-space:pre-line;margin:0">${replyMessage}</p>`)}

      ${quotedPrice != null ? `
        ${divider()}
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#6b7280">Prix proposé</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:22px;font-weight:900;color:#0421ff;text-align:right;letter-spacing:-0.5px">${fmt(quotedPrice)}</td>
          </tr>
        </table>
      ` : ''}

      ${ctaButton('Nous contacter', `${frontUrl}/contact`)}
    `, `Réponse à votre demande de sourcing : ${productName}`)

  await send(to, `Réponse à votre demande — ${productName}`, html)
}
