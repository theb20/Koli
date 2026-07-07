import { LegalLayout, P, Strong, Ul, InfoBox, SubTitle } from "../components/ui/LegalLayout";
import { PageMeta } from "../components/seo/PageMeta";
import { useSiteSettings, type SiteSettings } from "../hooks/useSiteSettings";

function getSections(settings: SiteSettings) {
  return [
  {
    id: "objet",
    title: "Objet et champ d'application",
    content: (
      <>
        <P>
          Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et
          l'utilisation de la plateforme <Strong>Skignas</Strong> (skignas.ahobaut.fr), éditée par la société
          Skignas SAS (ci-après « Skignas », « nous »). En accédant ou en utilisant nos services,
          vous acceptez d'être lié par ces CGU.
        </P>
        <InfoBox variant="blue">
          Si vous n'acceptez pas l'une quelconque des dispositions ci-dessous, vous devez cesser
          immédiatement toute utilisation de la plateforme.
        </InfoBox>
        <P>
          Ces CGU s'appliquent à tout visiteur, utilisateur enregistré, marchand ou partenaire
          accédant à la plateforme, quelle que soit la nature de l'accès (web, mobile, API).
        </P>
        <Ul
          items={[
            "Toute personne physique majeure ou morale souhaitant naviguer sur le site",
            "Tout utilisateur créant un compte et bénéficiant des fonctionnalités réservées aux membres",
            "Tout marchand ou revendeur utilisant les outils de gestion mis à disposition",
          ]}
        />
      </>
    ),
  },
  {
    id: "compte",
    title: "Création et gestion de compte",
    content: (
      <>
        <P>
          Pour accéder aux fonctionnalités complètes de la plateforme, vous devez créer un compte
          en fournissant des informations exactes, complètes et à jour. Vous êtes seul responsable
          de la confidentialité de vos identifiants de connexion.
        </P>
        <SubTitle>Conditions d'éligibilité</SubTitle>
        <Ul
          items={[
            "Être âgé d'au moins 18 ans ou de l'âge de la majorité légale dans votre pays de résidence",
            "Ne pas avoir été préalablement suspendu ou exclu de la plateforme",
            "Avoir la capacité juridique de conclure des contrats contraignants",
            "Fournir une adresse e-mail valide et accessible",
          ]}
        />
        <SubTitle>Responsabilités liées au compte</SubTitle>
        <P>
          Vous êtes responsable de toutes les activités effectuées sous votre compte.
          Toute utilisation non autorisée de votre compte doit être signalée immédiatement à{" "}
          <a href={`mailto:${settings.supportEmail}`} className="text-blue-600 underline underline-offset-2">
            {settings.supportEmail}
          </a>.
        </P>
        <InfoBox variant="amber">
          Skignas se réserve le droit de suspendre ou de supprimer tout compte en cas de
          violation des présentes CGU, sans préavis ni remboursement.
        </InfoBox>
      </>
    ),
  },
  {
    id: "services",
    title: "Description des services",
    content: (
      <>
        <P>
          Skignas met à disposition une plateforme de commerce en ligne permettant à ses
          utilisateurs de référencer, commander et revendre des produits auprès de fournisseurs
          partenaires, sans gestion de stock propre (modèle dropshipping).
        </P>
        <SubTitle>Services inclus</SubTitle>
        <Ul
          items={[
            "Accès au catalogue de produits sélectionnés par nos équipes",
            "Outils de gestion des commandes et du suivi logistique",
            "Tableau de bord analytique (ventes, marges, performances)",
            "Intégration avec les principales plateformes e-commerce (Shopify, WooCommerce, etc.)",
            "Support client multicanal (chat, e-mail, téléphone)",
            "Bibliothèque de ressources et de formations (selon abonnement)",
          ]}
        />
        <SubTitle>Disponibilité</SubTitle>
        <P>
          Skignas s'efforce d'assurer une disponibilité de la plateforme 24h/24 et 7j/7.
          Toutefois, des interruptions de service peuvent survenir pour maintenance, mise à jour
          ou incidents techniques. Aucune garantie de disponibilité continue n'est offerte.
        </P>
      </>
    ),
  },
  {
    id: "obligations",
    title: "Obligations et comportements interdits",
    content: (
      <>
        <P>
          En utilisant Skignas, vous vous engagez à respecter la législation applicable et les
          droits des tiers. Les comportements suivants sont strictement interdits :
        </P>
        <Ul
          items={[
            "Utiliser la plateforme à des fins illégales, frauduleuses ou contraires à l'ordre public",
            "Reproduire, copier, vendre ou exploiter tout élément de la plateforme sans autorisation",
            "Publier des contenus diffamatoires, injurieux, obscènes ou portant atteinte aux droits de tiers",
            "Tenter de contourner les mesures de sécurité ou d'accéder aux systèmes de manière non autorisée",
            "Utiliser des robots, scrapers ou tout procédé automatisé sans autorisation écrite préalable",
            "Usurper l'identité d'une autre personne ou entité",
          ]}
        />
        <InfoBox variant="amber">
          Toute violation peut entraîner la suspension immédiate du compte et des poursuites
          judiciaires si les circonstances le justifient.
        </InfoBox>
      </>
    ),
  },
  {
    id: "propriete",
    title: "Propriété intellectuelle",
    content: (
      <>
        <P>
          L'ensemble des éléments constitutifs de la plateforme Skignas — logotypes, marques,
          textes, images, vidéos, interfaces, code source, bases de données — sont la propriété
          exclusive de Skignas SAS ou de ses concédants de licence.
        </P>
        <P>
          Toute reproduction, représentation, modification ou exploitation, totale ou partielle,
          sans l'autorisation écrite préalable de Skignas est strictement interdite et constitue
          une contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété
          intellectuelle.
        </P>
        <SubTitle>Licence limitée</SubTitle>
        <P>
          Skignas vous accorde une licence personnelle, non exclusive, non transférable et
          révocable, pour accéder et utiliser la plateforme à des fins commerciales conformes
          aux présentes CGU.
        </P>
      </>
    ),
  },
  {
    id: "paiement",
    title: "Tarification et paiement",
    content: (
      <>
        <P>
          Les tarifs en vigueur sont affichés sur la page de tarification de la plateforme.
          Skignas se réserve le droit de modifier ses prix à tout moment, sous réserve d'un
          préavis de 30 jours pour les abonnements en cours.
        </P>
        <SubTitle>Modalités</SubTitle>
        <Ul
          items={[
            "Les paiements sont effectués par carte bancaire, virement ou via les solutions de paiement partenaires",
            "Les abonnements sont renouvelés automatiquement à la date anniversaire",
            "En cas de défaut de paiement, l'accès aux services peut être suspendu sous 48h",
            "Toute facture est disponible dans l'espace client dans un délai de 5 jours ouvrés",
          ]}
        />
        <SubTitle>Remboursements</SubTitle>
        <P>
          Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation
          ne s'applique pas aux services numériques dont l'exécution a commencé avec l'accord
          express de l'utilisateur. Un remboursement peut toutefois être accordé à titre commercial
          dans un délai de 14 jours suivant la souscription, sur demande à{" "}
          <a href="mailto:billing@skignas.ahobaut.fr" className="text-blue-600 underline underline-offset-2">
            billing@skignas.ahobaut.fr
          </a>.
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
          Dans les limites permises par la loi applicable, Skignas ne pourra être tenu responsable
          des dommages indirects, accessoires, spéciaux ou consécutifs résultant de l'utilisation
          ou de l'impossibilité d'utiliser la plateforme.
        </P>
        <Ul
          items={[
            "Perte de profits, de données ou d'opportunités commerciales",
            "Interruptions ou erreurs du service liées à des tiers",
            "Comportements frauduleux de fournisseurs ou de tiers",
            "Contenus publiés par des utilisateurs tiers sur la plateforme",
          ]}
        />
        <P>
          La responsabilité totale de Skignas, pour quelque motif que ce soit, est limitée au
          montant payé par l'utilisateur au cours des 12 mois précédant le fait générateur du
          dommage.
        </P>
      </>
    ),
  },
  {
    id: "resiliation",
    title: "Résiliation",
    content: (
      <>
        <P>
          Vous pouvez résilier votre compte à tout moment depuis les paramètres de votre espace
          client ou en contactant notre support. La résiliation prend effet à la fin de la période
          d'abonnement en cours.
        </P>
        <P>
          Skignas peut résilier votre accès sans préavis en cas de violation grave des présentes
          CGU, d'activité frauduleuse avérée ou d'injonction judiciaire.
        </P>
        <InfoBox variant="green">
          Après résiliation, vos données sont conservées pendant 90 jours pour vous permettre de
          les exporter, puis supprimées conformément à notre politique de confidentialité.
        </InfoBox>
      </>
    ),
  },
  {
    id: "droit",
    title: "Droit applicable et règlement des litiges",
    content: (
      <>
        <P>
          Les présentes CGU sont régies par le droit français. En cas de litige relatif à leur
          interprétation ou à leur exécution, les parties s'engagent à rechercher une solution
          amiable avant tout recours judiciaire.
        </P>
        <P>
          À défaut d'accord amiable dans un délai de 30 jours, tout litige sera soumis à la
          compétence exclusive des tribunaux de Paris, nonobstant pluralité de défendeurs ou
          appel en garantie.
        </P>
        <InfoBox variant="blue">
          Conformément à l'article 14 du Règlement UE 524/2013, vous pouvez également recourir à
          la plateforme de règlement en ligne des litiges :{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
          >
            ec.europa.eu/consumers/odr
          </a>
        </InfoBox>
      </>
    ),
  },
  ];
}

export default function CguPage() {
  const settings = useSiteSettings();
  const SECTIONS = getSections(settings);
  return (
    <>
      <PageMeta
        title="Conditions Générales d'Utilisation"
        description="Consultez les CGU de Skignas : objet du contrat, conditions d'utilisation, services, paiement, propriété intellectuelle et droits des utilisateurs."
        path="/cgu"
      />
      <LegalLayout
        badge="CGU"
        accentColor="#3b9c3c"
        title="Conditions Générales d'Utilisation"
        subtitle="En utilisant la plateforme Skignas, vous acceptez les termes et conditions décrits dans ce document. Lisez-le attentivement avant toute utilisation."
        lastUpdated="1er janvier 2026"
        readTime="8 min"
        sections={SECTIONS}
      />
    </>
  );
}
