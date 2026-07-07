import { LegalLayout, P, Strong, Ul, InfoBox, SubTitle } from "../components/ui/LegalLayout";
import { PageMeta } from "../components/seo/PageMeta";

const SECTIONS = [
  {
    id: "editeur",
    title: "Éditeur du site",
    content: (
      <>
        <P>
          Le site <Strong>skignas.ahobaut.fr</Strong> est édité par la société :
        </P>
        <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
          <table className="w-full text-sm">
            <tbody>
              {[
                ["Raison sociale",    "Skignas SAS"],
                ["Forme juridique",   "Société par Actions Simplifiée (SAS)"],
                ["Capital social",    "10 000 €"],
                ["RCS",              "Paris B 123 456 789"],
                ["Siège social",      "42 rue du Commerce, 75015 Paris, France"],
                ["Téléphone",         "+33 1 23 45 67 89"],
                ["E-mail",            "legal@skignas.ahobaut.fr"],
                ["N° TVA intracommunautaire", "FR 12 345 678 901"],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 last:border-none">
                  <td className="px-4 py-3 font-semibold text-gray-500 w-1/2">{k}</td>
                  <td className="px-4 py-3 text-gray-700">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "directeur",
    title: "Directeur de la publication",
    content: (
      <>
        <P>
          Le directeur de la publication est <Strong>M. Jean-Baptiste Moreau</Strong>,
          Président de Skignas SAS.
        </P>
        <P>
          Toute demande relative au contenu éditorial du site peut être adressée à :
          {" "}<a href="mailto:direction@skignas.ahobaut.fr" className="text-blue-600 underline underline-offset-2">
            direction@skignas.ahobaut.fr
          </a>
        </P>
      </>
    ),
  },
  {
    id: "hebergement",
    title: "Hébergement",
    content: (
      <>
        <P>
          Le site skignas.ahobaut.fr est hébergé par :
        </P>
        <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
          <table className="w-full text-sm">
            <tbody>
              {[
                ["Société",   "Google Ireland Limited (Firebase Hosting)"],
                ["Adresse",   "Gordon House, Barrow Street, Dublin 4, Irlande"],
                ["Site web",  "firebase.google.com"],
                ["Support",   "https://firebase.google.com/support"],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100 last:border-none">
                  <td className="px-4 py-3 font-semibold text-gray-500 w-1/3">{k}</td>
                  <td className="px-4 py-3 text-gray-700">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          L'infrastructure de traitement des données est localisée dans des centres de données
          situés en Europe (région EU West), conformément aux exigences du RGPD.
        </P>
      </>
    ),
  },
  {
    id: "propriete",
    title: "Propriété intellectuelle",
    content: (
      <>
        <P>
          L'ensemble des éléments présents sur le site (textes, images, graphismes, logotypes,
          icônes, sons, vidéos, logiciels) est protégé par les lois françaises et internationales
          relatives à la propriété intellectuelle.
        </P>
        <P>
          Toute reproduction, distribution, modification, adaptation, retransmission ou publication,
          même partielle, de ces différents éléments est strictement interdite sans l'accord
          écrit de Skignas SAS.
        </P>
        <SubTitle>Marques déposées</SubTitle>
        <P>
          « Skignas » et son logotype sont des marques déposées auprès de l'INPI sous le
          numéro de dépôt FR 4 567 890. Toute utilisation non autorisée constitue une contrefaçon
          susceptible d'engager la responsabilité civile et pénale de son auteur.
        </P>
      </>
    ),
  },
  {
    id: "donnees",
    title: "Données personnelles",
    content: (
      <>
        <P>
          Skignas SAS traite des données à caractère personnel conformément au Règlement
          Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés
          modifiée.
        </P>
        <P>
          Le responsable du traitement est Skignas SAS, représenté par son Président.
          Un délégué à la protection des données (DPO) est joignable à :
          {" "}<a href="mailto:dpo@skignas.ahobaut.fr" className="text-blue-600 underline underline-offset-2">
            dpo@skignas.ahobaut.fr
          </a>
        </P>
        <InfoBox variant="blue">
          Pour plus d'informations sur la collecte et le traitement de vos données, consultez
          notre <a href="/privacy" className="font-semibold underline underline-offset-2">
            Politique de confidentialité
          </a>.
        </InfoBox>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies et traceurs",
    content: (
      <>
        <P>
          Le site skignas.ahobaut.fr utilise des cookies et traceurs afin d'améliorer votre expérience
          de navigation, mesurer l'audience et personnaliser les contenus et publicités affichés.
        </P>
        <SubTitle>Types de cookies utilisés</SubTitle>
        <Ul
          items={[
            "Cookies essentiels — nécessaires au fonctionnement du site (session, authentification)",
            "Cookies analytiques — mesure d'audience via Google Analytics (Firebase Analytics)",
            "Cookies de personnalisation — mémorisation de vos préférences d'affichage",
            "Cookies tiers — intégrations Google Fonts et prestataires de paiement mobile (Orange Money, MTN Mobile Money, Wave)",
          ]}
        />
        <P>
          Vous pouvez à tout moment gérer vos préférences via le bandeau de consentement ou les
          paramètres de votre navigateur. Le refus de certains cookies peut altérer les
          fonctionnalités du site.
        </P>
      </>
    ),
  },
  {
    id: "responsabilite",
    title: "Limitation de responsabilité",
    content: (
      <>
        <P>
          Skignas SAS s'efforce d'assurer l'exactitude et la mise à jour des informations
          publiées sur son site, mais ne peut garantir leur exhaustivité ou leur absence d'erreur.
        </P>
        <P>
          Skignas SAS décline toute responsabilité en cas de :
        </P>
        <Ul
          items={[
            "Interruption, panne ou indisponibilité du site pour quelque raison que ce soit",
            "Dommages résultant d'une intrusion frauduleuse par un tiers",
            "Inexactitudes ou omissions dans les informations présentes sur le site",
            "Dommages liés à l'utilisation de liens hypertextes pointant vers des sites tiers",
          ]}
        />
      </>
    ),
  },
  {
    id: "litiges",
    title: "Règlement des litiges",
    content: (
      <>
        <P>
          En cas de litige relatif au site ou aux services de Skignas SAS, les parties s'engagent
          à rechercher une solution amiable dans un délai de 30 jours avant tout recours judiciaire.
        </P>
        <P>
          À défaut d'accord, le litige sera soumis à la compétence des tribunaux compétents du
          ressort du siège social de Skignas SAS (Paris), conformément au droit français.
        </P>
        <InfoBox variant="green">
          Conformément aux articles L.611-1 et suivants du Code de la consommation, tout
          consommateur a le droit de recourir gratuitement à un médiateur de la consommation
          en vue de la résolution amiable d'un litige.
        </InfoBox>
      </>
    ),
  },
];

export default function LegalPage() {
  return (
    <>
      <PageMeta
        title="Mentions légales"
        description="Mentions légales de Skignas : éditeur, directeur de publication, hébergeur, propriété intellectuelle et contact."
        path="/legal"
      />
      <LegalLayout
        badge="Mentions légales"
        accentColor="#2563eb"
        title="Mentions légales"
        subtitle="Informations légales relatives à l'éditeur du site, à l'hébergement, à la propriété intellectuelle et aux conditions d'utilisation de skignas.ahobaut.fr."
        lastUpdated="1er janvier 2025"
        readTime="5 min"
        sections={SECTIONS}
      />
    </>
  );
}
