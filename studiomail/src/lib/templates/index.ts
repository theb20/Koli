/* ─────────────────────────────────────────────────────────────
   Modèles de démonstration — un par catégorie du cahier des charges,
   contenu crédible (pas de lorem ipsum), objet suggéré, prêt à être
   personnalisé. Les images sont des gabarits neutres (placehold.co) à
   remplacer par de vraies images — ce studio n'héberge aucune image.
───────────────────────────────────────────────────────────── */
import type { EmailDocument, ProjectCategory } from '@/types/document'
import { button, columns, divider, footer, heading, image, logo, paragraph, section, social } from './builders'

export type TemplateDef = {
  id: string
  label: string
  category: ProjectCategory
  suggestedSubject: string
  description: string
  document: EmailDocument
}

const LOGO = 'https://placehold.co/160x44/5b4df0/ffffff?text=Marque'
const BANNER = 'https://placehold.co/600x280/efecfd/5b4df0?text=Image'
const PRODUCT = 'https://placehold.co/260x200/f4f3f1/19181a?text=Produit'

function doc(partial: Partial<EmailDocument> & { sections: EmailDocument['sections'] }): EmailDocument {
  return { subject: '', preheader: '', pageBackground: '#f4f3f1', fontFamily: 'sans', ...partial }
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'newsletter', label: 'Newsletter', category: 'newsletter',
    suggestedSubject: 'Votre sélection du mois — 3 nouveautés à ne pas manquer',
    description: 'Lettre d’information périodique avec plusieurs articles.',
    document: doc({
      subject: 'Votre sélection du mois — 3 nouveautés à ne pas manquer',
      preheader: 'Les articles, offres et actualités qui ont marqué le mois.',
      sections: [
        section([logo(LOGO), heading('La sélection du mois', { align: 'center' }), paragraph('<p>Bonjour, voici ce qu’il ne fallait pas manquer ces dernières semaines.</p>', { align: 'center' })]),
        section([
          columns([
            [image(PRODUCT, 'Article 1'), heading('Article 1', { level: 'h3', fontSize: 18 }), paragraph('<p>Un court résumé qui donne envie de cliquer pour en savoir plus.</p>'), button('Lire la suite', '#', { fullWidth: true, align: 'center' })],
            [image(PRODUCT, 'Article 2'), heading('Article 2', { level: 'h3', fontSize: 18 }), paragraph('<p>Un second sujet traité ce mois-ci, avec le même soin éditorial.</p>'), button('Lire la suite', '#', { fullWidth: true, align: 'center' })],
          ]),
        ]),
        section([divider(), social(), footer('Votre entreprise', { address: '12 rue Example, 75000 Paris' })]),
      ],
    }),
  },
  {
    id: 'welcome', label: 'Bienvenue / onboarding', category: 'onboarding',
    suggestedSubject: 'Bienvenue ! Voici comment bien démarrer',
    description: 'Accueil d’un nouvel utilisateur avec les premières étapes.',
    document: doc({
      subject: 'Bienvenue ! Voici comment bien démarrer',
      preheader: 'Trois étapes simples pour profiter pleinement de votre compte.',
      sections: [
        section([logo(LOGO)], { backgroundColor: '#5b4df0' }),
        section([
          heading('Bienvenue parmi nous 👋', { align: 'center' }),
          paragraph('<p style="text-align:center">Votre compte est prêt. Voici trois étapes pour bien démarrer :</p>', { align: 'center' }),
          paragraph('<p><strong>1. Complétez votre profil</strong><br/>Ajoutez une photo et vos informations pour une expérience personnalisée.</p>'),
          paragraph('<p><strong>2. Explorez les fonctionnalités</strong><br/>Un tour guidé de 2 minutes vous attend dans votre tableau de bord.</p>'),
          paragraph('<p><strong>3. Invitez votre équipe</strong><br/>Travaillez à plusieurs dès aujourd’hui.</p>'),
          button('Accéder à mon compte', '#', { align: 'center', fullWidth: false }),
        ]),
        section([divider(), footer('Votre entreprise')]),
      ],
    }),
  },
  {
    id: 'product-launch', label: 'Lancement de produit', category: 'product-launch',
    suggestedSubject: 'Nouveau : découvrez-le en avant-première',
    description: 'Annonce d’un nouveau produit ou d’une nouvelle fonctionnalité.',
    document: doc({
      subject: 'Nouveau : découvrez-le en avant-première',
      preheader: 'Disponible dès aujourd’hui, en exclusivité pour vous.',
      sections: [
        section([logo(LOGO)]),
        section([image(BANNER, 'Nouveau produit')]),
        section([
          heading('Il est enfin là', { align: 'center' }),
          paragraph('<p style="text-align:center">Après des mois de travail, nous sommes fiers de vous présenter notre dernière création. Pensé pour vous, à partir de vos retours.</p>', { align: 'center' }),
          button('Découvrir', '#', { align: 'center' }),
        ]),
        section([divider(), footer('Votre entreprise')]),
      ],
    }),
  },
  {
    id: 'promotion', label: 'Promotion / soldes', category: 'promotion',
    suggestedSubject: '-30% sur toute la boutique, aujourd’hui seulement',
    description: 'Opération commerciale avec date limite.',
    document: doc({
      subject: '-30% sur toute la boutique, aujourd’hui seulement',
      preheader: 'Offre valable jusqu’à minuit — profitez-en.',
      sections: [
        section([heading('-30%', { align: 'center', fontSize: 44, color: '#ffffff' }), paragraph('<p style="text-align:center;color:#ffffff">Sur toute la boutique, aujourd’hui seulement</p>', { align: 'center', color: '#ffffff' })], { backgroundColor: '#5b4df0' }),
        section([
          paragraph('<p style="text-align:center">Utilisez le code ci-dessous au moment du paiement.</p>', { align: 'center' }),
          heading('PROMO30', { align: 'center', level: 'h2', color: '#5b4df0' }),
          button('J’en profite', '#', { align: 'center' }),
        ]),
        section([divider(), footer('Votre entreprise')]),
      ],
    }),
  },
  {
    id: 'abandoned-cart', label: 'Panier abandonné', category: 'abandoned-cart',
    suggestedSubject: 'Vous avez oublié quelque chose...',
    description: 'Relance d’un panier non finalisé, avec rappel des articles.',
    document: doc({
      subject: 'Vous avez oublié quelque chose...',
      preheader: 'Votre panier vous attend — finalisez votre commande en 2 minutes.',
      sections: [
        section([logo(LOGO)]),
        section([
          heading('Votre panier vous attend', { align: 'center' }),
          paragraph('<p style="text-align:center">Ces articles sont toujours réservés pour vous, mais plus pour longtemps.</p>', { align: 'center' }),
        ]),
        section([columns([[image(PRODUCT, 'Article'), paragraph('<p style="text-align:center"><strong>Nom du produit</strong><br/>29,99 €</p>', { align: 'center' })]])]),
        section([button('Finaliser ma commande', '#', { align: 'center' })]),
        section([divider(), footer('Votre entreprise')]),
      ],
    }),
  },
  {
    id: 'order-confirmation', label: 'Confirmation de commande', category: 'order-confirmation',
    suggestedSubject: 'Commande #10234 confirmée',
    description: 'Accusé de réception transactionnel après achat.',
    document: doc({
      subject: 'Commande #10234 confirmée',
      preheader: 'Merci pour votre commande, voici le récapitulatif.',
      sections: [
        section([logo(LOGO)]),
        section([
          heading('Merci pour votre commande', { align: 'center', level: 'h2' }),
          paragraph('<p style="text-align:center">Commande <strong>#10234</strong> confirmée le ' + new Date().toLocaleDateString('fr-FR') + '.</p>', { align: 'center' }),
        ]),
        section([
          paragraph('<p><strong>1×</strong> Nom du produit — 29,99 €</p>'),
          paragraph('<p><strong>2×</strong> Autre produit — 19,98 €</p>'),
          divider(),
          paragraph('<p style="text-align:right"><strong>Total : 49,97 €</strong></p>', { align: 'right' }),
        ]),
        section([button('Suivre ma commande', '#', { align: 'center' })]),
        section([divider(), footer('Votre entreprise')]),
      ],
    }),
  },
  {
    id: 'invoice', label: 'Facture et reçu', category: 'invoice',
    suggestedSubject: 'Votre facture est disponible',
    description: 'Transmission d’une facture ou d’un reçu de paiement.',
    document: doc({
      subject: 'Votre facture est disponible',
      preheader: 'Facture n°F-2026-00042 — paiement reçu, merci.',
      sections: [
        section([logo(LOGO)]),
        section([
          heading('Facture n°F-2026-00042', { level: 'h2' }),
          paragraph('<p>Nous confirmons la réception de votre paiement. Votre facture est jointe et disponible dans votre espace client.</p>'),
          divider(),
          paragraph('<p style="text-align:right"><strong>Montant payé : 120,00 €</strong></p>', { align: 'right' }),
        ]),
        section([button('Télécharger la facture', '#', { align: 'left' })]),
        section([divider(), footer('Votre entreprise', { address: 'SIRET 000 000 000 00000' })]),
      ],
    }),
  },
  {
    id: 'password-reset', label: 'Réinitialisation de mot de passe', category: 'password-reset',
    suggestedSubject: 'Réinitialisez votre mot de passe',
    description: 'E-mail transactionnel de sécurité, lien à durée limitée.',
    document: doc({
      subject: 'Réinitialisez votre mot de passe',
      preheader: 'Ce lien expire dans 1 heure.',
      sections: [
        section([logo(LOGO)]),
        section([
          heading('Réinitialisation de mot de passe', { align: 'center', level: 'h2' }),
          paragraph('<p style="text-align:center">Vous avez demandé à réinitialiser votre mot de passe. Cliquez ci-dessous pour en choisir un nouveau. Ce lien expire dans <strong>1 heure</strong>.</p>', { align: 'center' }),
          button('Réinitialiser mon mot de passe', '#', { align: 'center' }),
          paragraph('<p style="text-align:center;font-size:13px;color:#9a958c">Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>', { align: 'center', fontSize: 13, color: '#9a958c' }),
        ]),
        section([divider(), footer('Votre entreprise')]),
      ],
    }),
  },
  {
    id: 'transactional', label: 'Notification transactionnelle', category: 'transactional',
    suggestedSubject: 'Mise à jour concernant votre compte',
    description: 'Notification ponctuelle liée à une action ou un événement du compte.',
    document: doc({
      subject: 'Mise à jour concernant votre compte',
      preheader: 'Une action a été effectuée sur votre compte.',
      sections: [
        section([logo(LOGO)]),
        section([
          heading('Notification', { level: 'h2' }),
          paragraph('<p>Nous vous informons qu’une action vient d’être effectuée sur votre compte. Si vous en êtes à l’origine, aucune action n’est requise.</p>'),
          button('Voir le détail', '#', { align: 'left' }),
        ]),
        section([divider(), footer('Votre entreprise')]),
      ],
    }),
  },
  {
    id: 'b2b-outreach', label: 'Prospection B2B', category: 'b2b-outreach',
    suggestedSubject: 'Une question rapide sur [Entreprise]',
    description: 'Premier contact commercial, ton direct et personnalisé.',
    document: doc({
      subject: 'Une question rapide sur [Entreprise]',
      preheader: '',
      sections: [
        section([
          paragraph('<p>Bonjour [Prénom],</p>'),
          paragraph('<p>Je me permets de vous contacter car [Entreprise] pourrait bénéficier de [bénéfice concret]. Plusieurs équipes similaires à la vôtre ont déjà gagné [résultat chiffré].</p>'),
          paragraph('<p>Auriez-vous 15 minutes cette semaine pour en discuter ?</p>'),
          button('Réserver un créneau', '#', { align: 'left' }),
          paragraph('<p>Cordialement,<br/>[Votre nom]</p>'),
        ]),
      ],
    }),
  },
  {
    id: 'event', label: 'Invitation et événement', category: 'event',
    suggestedSubject: 'Vous êtes invité(e) — [Nom de l’événement]',
    description: 'Invitation à un événement avec date, lieu et inscription.',
    document: doc({
      subject: 'Vous êtes invité(e) — [Nom de l’événement]',
      preheader: 'Le [date], à [lieu]. Places limitées.',
      sections: [
        section([image(BANNER, 'Événement')]),
        section([
          heading('Vous êtes invité(e)', { align: 'center' }),
          paragraph('<p style="text-align:center"><strong>[Nom de l’événement]</strong><br/>[Date] — [Lieu]</p>', { align: 'center' }),
          button('Je m’inscris', '#', { align: 'center' }),
        ]),
        section([divider(), footer('Votre entreprise')]),
      ],
    }),
  },
  {
    id: 'internal', label: 'Recrutement / communication interne', category: 'internal',
    suggestedSubject: 'Les actualités internes de la semaine',
    description: 'Communication interne à l’équipe ou annonce de recrutement.',
    document: doc({
      subject: 'Les actualités internes de la semaine',
      preheader: '',
      sections: [
        section([logo(LOGO)]),
        section([
          heading('Les actualités de la semaine'),
          paragraph('<p><strong>Nouvelle recrue</strong><br/>Nous accueillons [Prénom Nom] au poste de [Poste]. Bienvenue !</p>'),
          paragraph('<p><strong>Poste ouvert</strong><br/>Nous recherchons un(e) [Intitulé du poste] pour rejoindre l’équipe.</p>'),
          button('Voir l’offre', '#', { align: 'left' }),
        ]),
        section([divider(), footer('Votre entreprise')]),
      ],
    }),
  },
]

export function getTemplate(id: string): TemplateDef | undefined {
  return TEMPLATES.find(t => t.id === id)
}

export function blankDocument(): EmailDocument {
  return doc({ sections: [section([])] })
}
