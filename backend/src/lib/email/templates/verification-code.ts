import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, highlightBox } from '../components'

export async function sendVerificationCodeEmail(to: string, code: string): Promise<void> {
  const html = await baseLayout(`
      ${subheading('Vérification de votre e-mail')}
      ${heading('Confirmez votre adresse')}
      ${paragraph("Voici votre code de vérification pour l'inscription marchand Skignas Business.")}

      ${highlightBox(`
        <p style="margin:0;font-family:system-ui,-apple-system,sans-serif;font-size:34px;font-weight:800;letter-spacing:10px;color:#0a0a0b;text-align:center">${code}</p>
      `)}

      ${paragraph('Ce code est valable <strong>15 minutes</strong> et ne peut être utilisé qu\'une seule fois. Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet e-mail.', 'font-size:13px;color:#9ca3af')}
      `, `Votre code de vérification Skignas : ${code}`)

  await send(to, `${code} — votre code de vérification Skignas`, html)
}
