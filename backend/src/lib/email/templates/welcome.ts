import { send }       from '../client'
import { baseLayout } from '../layout'
import { subheading, heading, paragraph, divider, ctaButton, highlightBox, iconRow } from '../components'

export async function sendWelcomeEmail(to: string, prenom: string): Promise<void> {
  const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.ahobaut.fr'

  await send(
    to,
    `Bienvenue chez Skignas, ${prenom} 🎉`,
    baseLayout(`
      ${subheading('Compte activé')}
      ${heading(`Bienvenue, ${prenom} !`)}
      ${paragraph("Votre compte Skignas est prêt. Vous rejoignez <strong style=\"color:#111827\">+12&nbsp;000</strong> clients satisfaits à travers la Côte d'Ivoire.")}

      ${highlightBox(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tbody>
            ${iconRow('📦', '<strong style="color:#111827">Suivi en temps réel</strong> · Vos commandes à portée de main')}
            ${iconRow('❤️',  '<strong style="color:#111827">Liste de souhaits</strong> · Retrouvez vos favoris à tout moment')}
            ${iconRow('🎁', '<strong style="color:#111827">Offres exclusives</strong> · Réservées aux membres Skignas')}
          </tbody>
        </table>
      `)}

      ${divider()}
      ${paragraph('Parcourez des milliers de produits sélectionnés avec soin, livrés chez vous en 48–72h.', 'color:#6b7280')}
      ${ctaButton('Découvrir le catalogue', `${frontUrl}/catalogue`)}
      `, `Bienvenue chez Skignas, ${prenom} — votre compte est actif.`),
  )
}
