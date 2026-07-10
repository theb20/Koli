import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, divider, ctaButton, highlightBox } from '../components'

export async function sendPasswordResetEmail(to: string, prenom: string, link: string): Promise<void> {
  const html = await baseLayout(`
      ${subheading('Réinitialisation du mot de passe')}
      ${heading(`Bonjour ${prenom},`)}
      ${paragraph("Vous avez demandé la réinitialisation du mot de passe de votre compte Skignas. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.")}

      ${highlightBox(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;font-size:20px;width:32px">⏱</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.5">
              Ce lien est valable <strong style="color:#0421ff">30 minutes</strong>
              et ne peut être utilisé qu'une seule fois.
            </td>
          </tr>
        </table>
      `)}

      ${ctaButton('Réinitialiser mon mot de passe', link)}

      ${divider()}
      ${paragraph("Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe actuel reste inchangé. Si cela se reproduit, contactez le support.", 'font-size:13px;color:#9ca3af')}
      `, 'Réinitialisez votre mot de passe Skignas — lien valable 30 minutes.')

  await send(to, 'Réinitialisation de votre mot de passe Skignas 🔒', html)
}
