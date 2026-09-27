import { P, Strong, Ul, InfoBox, SubTitle, Table } from "../../components/ui/LegalLayout";
import { openCookieSettings } from "../../lib/consent";

/* Politique de confidentialité — alignée sur le fonctionnement RÉEL de la
   plateforme (prestataires effectivement appelés par le code, hébergement,
   cookies). À mettre à jour à chaque nouveau prestataire ou nouvel usage. */

export const PRIVACY_LAST_UPDATED = "27 septembre 2026";
const CONTACT = "support@skignas.com";

const mailLink = <a href={`mailto:${CONTACT}`} className="text-blue-600 underline underline-offset-2">{CONTACT}</a>;

export const SECTIONS = [
  {
    id: "intro",
    title: "Qui sommes-nous et pourquoi cette politique ?",
    content: (
      <>
        <P>
          <Strong>Skignas SAS</Strong> (ci-après « Skignas », « nous ») est responsable du traitement des
          données personnelles collectées via la plateforme skignas.com, ses espaces marchands et ses services
          associés (e-mails, SMS, WhatsApp).
        </P>
        <P>
          Cette politique s'applique à toute personne qui visite le site, crée un compte, passe commande,
          demande un devis, laisse un avis, contacte le support ou vend sur la plateforme.
        </P>
        <InfoBox variant="green">
          Nos traitements sont soumis à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection
          des données à caractère personnel, sous le contrôle de l'Autorité de Régulation des
          Télécommunications/TIC de Côte d'Ivoire (ARTCI).
        </InfoBox>
      </>
    ),
  },
  {
    id: "collecte",
    title: "Données que nous collectons",
    content: (
      <>
        <SubTitle>Données que vous nous fournissez</SubTitle>
        <Ul
          items={[
            "Compte : nom, prénom, e-mail, téléphone, date de naissance et genre (facultatifs), mot de passe (stocké uniquement sous forme chiffrée irréversible)",
            "Commandes : adresses de livraison, produits achetés, montants, mode de livraison et de paiement, historique des statuts",
            "Paiement en ligne : saisi directement chez notre prestataire WiniPayer — Skignas ne reçoit ni ne stocke vos numéros de carte ou codes mobile money",
            "Demandes de sourcing et devis : description du produit recherché, photos, budget, adresse de livraison, acceptation ou refus du devis et motif éventuel",
            "Retours : motif, commentaire et photos envoyés",
            "Avis : note, commentaire, photos éventuelles",
            "Messages : formulaire de contact, échanges WhatsApp avec le support, messages saisis dans l'assistant de discussion du site",
            "Marchands : informations de la boutique et documents de vérification d'identité (via Didit)",
          ]}
        />
        <SubTitle>Données collectées automatiquement</SubTitle>
        <Ul
          items={[
            "Sessions de connexion : adresse IP et navigateur (sécurité du compte, détection des connexions suspectes)",
            "Activité sur le site : produits consultés (historique de navigation de votre compte), favoris, panier, listes cadeaux, points de fidélité et parrainage",
            "Mesure d'audience : uniquement si vous l'acceptez (voir la section Cookies)",
            "Journaux techniques : erreurs et performances du service",
          ]}
        />
        <SubTitle>Données provenant de tiers</SubTitle>
        <Ul
          items={[
            "Connexion avec Google : nom, prénom, e-mail et photo de profil de votre compte Google",
            "Statut de paiement transmis par WiniPayer (réussi, annulé, échoué)",
            "Résultat de la vérification d'identité des marchands transmis par Didit",
          ]}
        />
      </>
    ),
  },
  {
    id: "finalites",
    title: "Finalités et bases légales",
    content: (
      <Table
        head={["Finalité", "Base légale"]}
        rows={[
          ["Création et gestion de votre compte", "Exécution du contrat"],
          ["Traitement des commandes, paiements, livraisons et retours", "Exécution du contrat"],
          ["Devis de sourcing (envoi, acceptation, paiement)", "Exécution de mesures précontractuelles / du contrat"],
          ["E-mails et SMS transactionnels (confirmation, suivi, devis, lien d'avis)", "Exécution du contrat"],
          ["Publication de vos avis (prénom + initiale du nom, mention « Achat vérifié »)", "Consentement (vous choisissez de publier)"],
          ["Support client et assistant de discussion", "Exécution du contrat / intérêt légitime"],
          ["Sécurité, prévention de la fraude, anti-robot (reCAPTCHA)", "Intérêt légitime"],
          ["Mesure d'audience (Google Analytics)", "Consentement"],
          ["Newsletter et offres commerciales", "Consentement"],
          ["Conservation des factures et pièces comptables", "Obligation légale"],
        ]}
      />
    ),
  },
  {
    id: "partage",
    title: "Prestataires et destinataires",
    content: (
      <>
        <P>
          Nous ne vendons jamais vos données. Elles sont accessibles à l'équipe Skignas habilitée et, pour les
          commandes contenant leurs produits, au marchand concerné, dans la limite nécessaire à la préparation et
          à la livraison de ses produits. Nous faisons appel aux prestataires suivants :
        </P>
        <Table
          head={["Prestataire", "Rôle", "Données concernées"]}
          rows={[
            ["Railway", "Hébergement de l'API et de la base de données", "Ensemble des données de compte, commandes et messages"],
            ["Google (Firebase Hosting)", "Hébergement du site web", "Adresse IP, journaux techniques"],
            ["Google (Firebase Authentication)", "Connexion avec Google", "Identifiants du compte Google"],
            ["Google (Analytics, Tag Manager)", "Mesure d'audience — après consentement uniquement", "Identifiants de navigation, pages vues"],
            ["Google (reCAPTCHA)", "Protection anti-robot des formulaires", "Adresse IP, données d'interaction"],
            ["Google (Fonts)", "Affichage de polices de caractères", "Adresse IP"],
            ["WiniPayer", "Paiement en ligne : Orange Money, MTN Mobile Money, Wave, carte bancaire", "Montant, référence de commande, données de paiement saisies"],
            ["Resend", "Envoi des e-mails", "E-mail, contenu des messages"],
            ["Zavu", "Envoi des SMS (codes, suivi, devis, liens d'avis)", "Numéro de téléphone, contenu des SMS"],
            ["Meta (WhatsApp Business)", "Support client et notifications internes de commande", "Nom, téléphone, contenu des messages, montant et numéro de commande"],
            ["Groq", "Assistant de discussion du site", "Messages saisis dans l'assistant"],
            ["Cloudmersive", "Analyse antivirus des fichiers envoyés", "Photos et fichiers téléversés"],
            ["Didit", "Vérification d'identité des marchands", "Pièces d'identité et selfie des marchands"],
            ["AppSignal", "Supervision technique", "Journaux d'erreurs et de performance"],
          ]}
        />
        <SubTitle>Autorités</SubTitle>
        <P>Vos données peuvent être communiquées aux autorités compétentes sur réquisition judiciaire ou administrative.</P>
      </>
    ),
  },
  {
    id: "transferts",
    title: "Transferts hors de Côte d'Ivoire",
    content: (
      <>
        <P>
          Plusieurs de nos prestataires traitent vos données hors de Côte d'Ivoire. En particulier, notre API et
          notre base de données sont hébergées aux <Strong>États-Unis</Strong> (Railway), de même que les
          services de Google, Meta, Groq, Resend et Cloudmersive. Le site web est diffusé via le réseau mondial
          de Google (Firebase Hosting).
        </P>
        <P>
          Ces transferts sont soumis aux formalités préalables prévues par la loi n° 2013-450 auprès de l'ARTCI.
          Vous pouvez obtenir des informations sur ces transferts en nous écrivant à {mailLink}.
        </P>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies et traceurs",
    content: (
      <>
        <P>
          Aucun cookie de mesure d'audience ni de publicité n'est déposé avant votre choix dans le bandeau
          cookies. Tant que vous n'avez pas accepté, Google Tag Manager et Google Analytics ne sont pas chargés.
        </P>
        <Table
          head={["Catégorie", "Exemples", "Durée", "Consentement"]}
          rows={[
            ["Essentiels", "Session de connexion (cookie sécurisé), panier, choix cookies, protection anti-robot reCAPTCHA", "Session à 30 jours", "Non requis"],
            ["Mesure d'audience", "Google Analytics 4 via Google Tag Manager (_ga, _ga_*), Firebase Analytics", "13 mois maximum", "Requis"],
            ["Préférences", "Mémorisation de réglages d'affichage", "12 mois", "Requis"],
            ["Marketing", "Aucun cookie publicitaire n'est utilisé à ce jour ; cette catégorie ne serait activée qu'avec votre accord", "—", "Requis"],
          ]}
        />
        <P>
          Vous pouvez modifier ou retirer votre consentement à tout moment ; les cookies de mesure d'audience
          sont alors supprimés.
        </P>
        <button type="button" onClick={openCookieSettings}
          className="mb-4 inline-flex items-center rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors">
          Gérer mes cookies
        </button>
      </>
    ),
  },
  {
    id: "conservation",
    title: "Durées de conservation",
    content: (
      <Table
        head={["Données", "Durée"]}
        rows={[
          ["Compte actif", "Tant que le compte existe"],
          ["Compte supprimé", "Suppression des données de compte ; les commandes sont conservées de façon anonymisée ou pour la durée légale comptable"],
          ["Commandes, factures et pièces comptables", "10 ans (obligation comptable OHADA)"],
          ["Avis publiés", "Tant qu'ils sont en ligne ; supprimables sur demande"],
          ["Devis de sourcing non acceptés", "3 ans après la dernière interaction"],
          ["Sessions et journaux de sécurité", "12 mois"],
          ["Cookies de mesure d'audience", "13 mois maximum"],
          ["Documents de vérification des marchands", "Durée de la relation commerciale + délais légaux"],
        ]}
      />
    ),
  },
  {
    id: "droits",
    title: "Vos droits",
    content: (
      <>
        <P>Conformément à la loi n° 2013-450, vous disposez des droits suivants sur vos données :</P>
        <Ul
          items={[
            "droit d'accès et d'information",
            "droit de rectification",
            "droit d'opposition, notamment à la prospection commerciale",
            "droit à l'effacement (suppression de compte possible depuis « Mon profil »)",
            "droit de retirer à tout moment un consentement donné (cookies, newsletter, publication d'un avis)",
          ]}
        />
        <SubTitle>Comment exercer vos droits</SubTitle>
        <P>
          Écrivez à {mailLink} (objet : « Données personnelles ») ou par courrier à Skignas SAS, Cocody, Abidjan,
          Côte d'Ivoire. Nous répondons dans un délai d'un mois. Une pièce justificative d'identité peut vous être
          demandée en cas de doute sur votre identité.
        </P>
        <P>
          Vous pouvez également introduire une réclamation auprès de l'ARTCI :{" "}
          <a href="https://www.artci.ci" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2">www.artci.ci</a>.
        </P>
      </>
    ),
  },
  {
    id: "securite",
    title: "Sécurité des données",
    content: (
      <>
        <P>Les mesures en place sur la plateforme :</P>
        <Ul
          items={[
            "Connexions chiffrées (HTTPS) sur l'ensemble du site et de l'API",
            "Mots de passe stockés uniquement sous forme hachée (bcrypt), jamais en clair",
            "Session de connexion protégée par un cookie sécurisé inaccessible aux scripts",
            "Double authentification disponible pour les comptes",
            "Limitation des tentatives de connexion et protection anti-robot",
            "Analyse antivirus des fichiers envoyés",
            "Accès aux données limité à l'équipe habilitée ; actions d'administration journalisées",
            "Paiements traités par un prestataire spécialisé : aucune donnée de carte ou de mobile money stockée par Skignas",
          ]}
        />
        <P>
          En cas de violation de données présentant un risque pour vos droits, nous vous en informerons dans les
          meilleurs délais et procéderons aux notifications prévues par la réglementation ivoirienne.
        </P>
      </>
    ),
  },
  {
    id: "mineurs",
    title: "Mineurs",
    content: (
      <P>
        Les achats sur Skignas sont réservés aux personnes majeures. Si vous constatez qu'un mineur nous a transmis
        des données sans l'accord de ses représentants légaux, écrivez-nous à {mailLink} : nous les supprimerons.
      </P>
    ),
  },
  {
    id: "modifications",
    title: "Modifications de cette politique",
    content: (
      <>
        <P>
          Nous pouvons mettre à jour cette politique, notamment en cas de nouveau prestataire ou de nouvel usage
          de vos données. En cas de modification importante, vous en serez informé par e-mail ou par une
          notification dans votre espace client avant son entrée en vigueur.
        </P>
        <P>La date de dernière mise à jour figure en haut de ce document. Version en vigueur : skignas.com/privacy.</P>
      </>
    ),
  },
];
