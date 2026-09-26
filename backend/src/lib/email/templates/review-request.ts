import { send }       from '../client'
import { baseLayout } from '../layout'
import { heading, paragraph, ctaButton, statusTag } from '../components'

/**
 * Envoyé à la première livraison d'une commande — lien personnel vers la
 * page "Laisser un avis" (/avis/:token), utilisable sans compte.
 */
export async function sendReviewRequestEmail(
  to: string,
  prenom: string,
  orderNumber: string,
  reviewLink: string,
): Promise<void> {
  const html = await baseLayout(`
      ${statusTag('Commande livrée', '#059669', '#ecfdf5')}
      ${heading(`Votre avis compte, ${prenom} !`)}
      ${paragraph(`Votre commande <strong style="color:#0421ff">${orderNumber}</strong> vous a été livrée. Qu'avez-vous pensé de vos produits et de notre service ?`)}
      ${paragraph(`Cela ne prend qu'une minute et aide les autres clients à bien choisir.`)}
      ${ctaButton('Laisser un avis', reviewLink)}
    `, `Donnez votre avis sur la commande ${orderNumber}`)

  await send(to, `Votre avis sur la commande ${orderNumber} ⭐`, html)
}
