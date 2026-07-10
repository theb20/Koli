import { send }       from '../client'
import { baseLayout } from '../layout'
import { heading, paragraph, divider, ctaButton, checkBadge, featureBlock } from '../components'

export async function sendWelcomeEmail(to: string, prenom: string): Promise<void> {
  const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com'

  const html = await baseLayout(`
      ${checkBadge('Compte activé')}
      ${heading(`Bienvenue, ${prenom} !`)}
      ${paragraph("Votre compte Skignas est prêt. Vous rejoignez <strong style=\"color:#202124;font-weight:500\">+1&nbsp;000</strong> clients satisfaits à travers la Côte d'Ivoire.")}

      ${featureBlock([
        { icon: '📦', iconBg: '#e8f0fe', title: 'Suivi en temps réel', desc: 'Vos commandes à portée de main' },
        { icon: '❤️', iconBg: '#fce8e6', title: 'Liste de souhaits', desc: 'Retrouvez vos favoris à tout moment' },
        { icon: '🎁', iconBg: '#fef7e0', title: 'Offres exclusives', desc: 'Réservées aux membres Skignas' },
      ])}

      ${divider()}
      ${paragraph('Parcourez des milliers de produits sélectionnés avec soin, livrés chez vous en 48–72h.')}
      ${ctaButton('Découvrir le catalogue', `${frontUrl}/catalogue`)}
      `, `Bienvenue chez Skignas, ${prenom} — votre compte est actif.`)

  await send(to, `Bienvenue chez Skignas, ${prenom} 🎉`, html)
}
