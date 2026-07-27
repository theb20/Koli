import { send }         from '../client'
import { baseLayout }   from '../layout'
import { getEmailTokens } from '../tokens'
import { subheading, heading, paragraph, ctaButton } from '../components'

export async function sendSecurityUpdateEmail(to: string, prenom: string): Promise<void> {
  const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com'
  const { greeting } = await getEmailTokens()

  const items = [
    ['Double authentification (2FA)', 'protection supplémentaire via une app comme Google Authenticator.'],
    ['Score de sécurité', 'un indicateur en temps réel de la protection de votre compte.'],
    ['Mot de passe optionnel', 'votre compte n\'en a pas (connexion par lien magique/Google) ; vous pouvez en définir un si vous le souhaitez.'],
  ]

  const list = `
    <ul style="font-family:Roboto,Arial,sans-serif;font-size:14px;color:#5f6368;line-height:1.7;margin:0 0 16px;padding-left:20px">
      ${items.map(([label, desc]) => `<li style="margin-bottom:8px"><strong style="color:#202124">${label}</strong> — ${desc}</li>`).join('')}
    </ul>`

  const html = await baseLayout(`
      ${subheading('Sécurité de votre compte')}
      ${heading(`${greeting} ${prenom},`)}
      ${paragraph('Votre compte Skignas bénéficie de nouvelles options de sécurité, disponibles dans Profil &gt; Sécurité :')}
      ${list}
      ${paragraph('Aucune action requise : ces nouveautés sont facultatives, votre connexion actuelle ne change pas.')}
      ${ctaButton('Voir mon profil', `${frontUrl}/profil`)}
      `, 'Nouvelles options de sécurité disponibles sur votre compte Skignas.')

  await send(to, 'Nouvelles options de sécurité sur votre compte Skignas', html)
}
