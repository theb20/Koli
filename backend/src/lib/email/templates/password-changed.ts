import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, divider, highlightBox } from '../components'

export async function sendPasswordChangedEmail(to: string, prenom: string, ipAddress?: string): Promise<void> {
  const html = await baseLayout(`
      ${subheading('Sécurité du compte')}
      ${heading(`Bonjour ${prenom},`)}
      ${paragraph('Le mot de passe de votre compte Skignas vient d\'être modifié avec succès.')}

      ${highlightBox(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:middle;padding-right:12px;font-size:20px;width:32px">🛡️</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.5">
              Par mesure de sécurité, toutes vos sessions actives ont été déconnectées${ipAddress ? ` (demande depuis l'adresse ${ipAddress})` : ''}.
              Vous devrez vous reconnecter partout.
            </td>
          </tr>
        </table>
      `)}

      ${divider()}
      ${paragraph("Si vous n'êtes pas à l'origine de ce changement, contactez le support immédiatement — votre compte pourrait être compromis.", 'font-size:13px;color:#ef4444;font-weight:600')}
      `, 'Le mot de passe de votre compte Skignas a été modifié.')

  await send(to, 'Votre mot de passe Skignas a été modifié 🔒', html)
}
