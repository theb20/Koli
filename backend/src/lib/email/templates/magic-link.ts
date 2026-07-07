import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, divider, ctaButton, highlightBox } from '../components'

export async function sendMagicLinkEmail(to: string, prenom: string, link: string): Promise<void> {
  const html = await baseLayout(`
      ${subheading('Connexion sécurisée')}
      ${heading(`Bonjour ${prenom},`)}
      ${paragraph('Vous avez demandé un lien de connexion à votre compte Skignas. Cliquez sur le bouton ci-dessous pour vous connecter instantanément.')}

      ${highlightBox(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;font-size:20px;width:32px">⏱</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.5">
              Ce lien est valable <strong style="color:#0421ff">15 minutes</strong>
              et ne peut être utilisé qu'une seule fois.
            </td>
          </tr>
        </table>
      `)}

      ${ctaButton('Me connecter', link)}

      ${divider()}
      ${paragraph("Si vous n'avez pas demandé ce lien, ignorez cet email. Votre compte reste sécurisé.", 'font-size:13px;color:#9ca3af')}
      `, 'Votre lien de connexion Skignas — valable 15 minutes.')

  await send(to, 'Votre lien de connexion Skignas 🔑', html)
}
