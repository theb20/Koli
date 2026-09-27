import { LegalLayout, P, Strong, Ul, InfoBox, SubTitle } from "../components/ui/LegalLayout";
import { PageMeta } from "../components/seo/PageMeta";
import { useSiteSettings, type SiteSettings } from "../hooks/useSiteSettings";

/* Coordonnées issues des réglages du site (modifiables dans l'admin) : une
   seule adresse e-mail et un seul téléphone pour tous les documents légaux. */
function getSections(settings: SiteSettings) {
  return [
  {
    id: "editeur",
    title: "Éditeur du site",
    content: (
      <>
        <P>
          Le site <Strong>skignas.com</Strong> est édité par la société :
        </P>
        <div className="mb-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
          <table className="w-full text-sm">
            <tbody>
              {[
                ["Raison sociale",    "Skignas "],
                ["Forme juridique",   "Société par Actions Simplifiée (SAS)"],
                ["Capital social",    "1 000 000 Fcfa"],
                ["RCCM",             "En cours d'immatriculation"],
                ["Siège social",      settings.address],
                ["Téléphone",         settings.supportPhone],
                ["E-mail",            settings.supportEmail],
                ["N° de compte contribuable (NCC)", "En cours d'immatriculation"],
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
          Le directeur de la publication est <Strong>M. Serge Soro</Strong>,
          Président de Skignas SAS.
        </P>
        <P>
          Toute demande relative au contenu éditorial du site peut être adressée à :
          {" "}<a href={`mailto:${settings.supportEmail}`} className="text-blue-600 underline underline-offset-2">
            {settings.supportEmail}
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
        <SubTitle>Site web</SubTitle>
        <P>Les pages du site skignas.com sont hébergées et diffusées par <Strong>Google (Firebase Hosting)</Strong>, via un réseau de serveurs répartis dans le monde — firebase.google.com.</P>
        <SubTitle>API et base de données</SubTitle>
        <P>Le serveur applicatif et la base de données sont hébergés par <Strong>Railway Corporation</Strong> (railway.com), sur des serveurs situés aux <Strong>États-Unis</Strong>.</P>
        <P>
          Les transferts de données correspondants sont décrits dans notre{" "}
          <a href="/privacy#transferts" className="text-blue-600 underline underline-offset-2">Politique de confidentialité</a>.
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
          icônes, sons, vidéos, logiciels) est protégé par les lois ivoiriennes et internationales
          relatives à la propriété intellectuelle.
        </P>
        <P>
          Toute reproduction, distribution, modification, adaptation, retransmission ou publication,
          même partielle, de ces différents éléments est strictement interdite sans l'accord
          écrit de Skignas SAS.
        </P>
        <SubTitle>Marques déposées</SubTitle>
        <P>
          « Skignas » et son logotype font l'objet d'une démarche de protection en cours
          auprès de l'OAPI (Organisation Africaine de la Propriété Intellectuelle). Toute
          utilisation non autorisée constitue une contrefaçon susceptible d'engager la
          responsabilité civile et pénale de son auteur.
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
          Skignas SAS traite des données à caractère personnel conformément à la loi ivoirienne
          n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel,
          sous le contrôle de l'Autorité de Régulation des Télécommunications/TIC de Côte d'Ivoire
          (ARTCI).
        </P>
        <P>
          Le responsable du traitement est Skignas SAS, représenté par son Président. Pour toute
          question relative à vos données personnelles :
          {" "}<a href={`mailto:${settings.supportEmail}`} className="text-blue-600 underline underline-offset-2">
            {settings.supportEmail}
          </a> (objet : « Données personnelles »)
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
          Le site utilise des cookies essentiels à son fonctionnement et, uniquement avec votre
          accord, des cookies de mesure d'audience (Google Analytics). Aucun cookie publicitaire
          n'est utilisé à ce jour.
        </P>
        <P>
          Le détail des cookies, leur durée et la façon de modifier vos choix figurent dans la{" "}
          <a href="/privacy#cookies" className="text-blue-600 underline underline-offset-2">section Cookies de la Politique de confidentialité</a>.
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
          Dans les limites permises par la loi, et sans préjudice des droits des consommateurs,
          Skignas SAS ne saurait être tenue responsable en cas de :
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
          ressort du siège social de Skignas SAS (Cocody, Abidjan), conformément au droit ivoirien.
        </P>
        <InfoBox variant="green">
          Conformément à la réglementation ivoirienne relative à la protection du consommateur,
          tout client dispose du droit de rechercher une résolution amiable de tout litige avant
          toute action judiciaire.
        </InfoBox>
      </>
    ),
  },
  ];
}

export default function LegalPage() {
  const settings = useSiteSettings();
  const SECTIONS = getSections(settings);
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
        subtitle="Informations légales relatives à l'éditeur du site, à l'hébergement, à la propriété intellectuelle et aux conditions d'utilisation de skignas.com."
        lastUpdated="27 septembre 2026"
        readTime="5 min"
        sections={SECTIONS}
      />
    </>
  );
}
