import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, highlightBox } from '../components'

export async function sendTwoFactorEnabledEmail(to: string, prenom: string): Promise<void> {
  const html = await baseLayout(`
      ${subheading('Sécurité du compte')}
      ${heading(`Bonjour ${prenom},`)}
      ${paragraph("La double authentification (2FA) vient d'être activée sur votre compte Skignas.")}

      ${highlightBox(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;font-size:20px;width:32px">🔐</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.5">
              À chaque connexion, un code généré par votre application d'authentification vous sera désormais demandé en plus de votre mot de passe.
            </td>
          </tr>
        </table>
      `)}

      ${paragraph("Si vous n'êtes pas à l'origine de cette activation, contactez le support immédiatement — votre compte pourrait être compromis.", 'font-size:13px;color:#ef4444;font-weight:600')}
      `, 'La double authentification a été activée sur votre compte Skignas.')

  await send(to, 'Double authentification activée 🔐', html)
}
