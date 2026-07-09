import { LegalLayout, P, Strong, Ul, InfoBox, SubTitle } from "../components/ui/LegalLayout";
import { PageMeta } from "../components/seo/PageMeta";
import { useSiteSettings, waLink, telLink, type SiteSettings } from "../hooks/useSiteSettings";

function getSections(settings: SiteSettings) {
  return [
  {
    id: "objet",
    title: "Objet, définitions et acceptation",
    content: (
      <>
        <P>
          Les présentes Conditions Générales d'Utilisation (« CGU ») définissent les modalités
          d'accès et d'utilisation de la plateforme de vente en ligne <Strong>Skignas</Strong>{" "}
          (skignas.com), ainsi que les droits et obligations des utilisateurs et de l'exploitant.
          Toute utilisation de la plateforme implique l'acceptation pleine et entière des présentes CGU.
        </P>
        <InfoBox variant="blue">
          Version 1.0 — en vigueur depuis le 9 juillet 2026. La version actuelle est toujours
          consultable à l'adresse skignas.com/cgu.
        </InfoBox>
        <SubTitle>Définitions</SubTitle>
        <Ul
          items={[
            "Plateforme : le site skignas.com et ses services associés, permettant la consultation et l'achat de produits en ligne",
            "Exploitant / Skignas : la société assurant l'administration de la plateforme",
            "Utilisateur : toute personne accédant à la plateforme, visiteur ou compte enregistré",
            "Acheteur : utilisateur effectuant une commande",
            "Magasin / Fournisseur : entité dont les produits sont référencés sur la plateforme",
            "Compte utilisateur : espace personnel créé sur la plateforme (commandes, adresses, favoris, points fidélité)",
            "Produit : tout bien proposé à la vente sur la plateforme",
            "Commande : engagement d'achat validé par un utilisateur au terme du parcours panier → livraison → paiement → confirmation",
          ]}
        />
        <SubTitle>Champ d'application</SubTitle>
        <P>
          Ces CGU s'appliquent à tout visiteur, tout acheteur et tout partenaire (magasin,
          fournisseur) utilisant les services de la plateforme. L'inscription ou la passation
          d'une commande vaut acceptation sans réserve des présentes CGU.
        </P>
      </>
    ),
  },
  {
    id: "acces",
    title: "Accès à la plateforme et compte utilisateur",
    content: (
      <>
        <SubTitle>Conditions d'accès</SubTitle>
        <P>La plateforme est accessible à toute personne :</P>
        <Ul
          items={[
            "âgée d'au moins dix-huit (18) ans ou légalement émancipée",
            "disposant de la capacité juridique de contracter",
            "respectant les présentes CGU",
          ]}
        />
        <SubTitle>Création d'un compte</SubTitle>
        <P>
          La création d'un compte se fait par e-mail et mot de passe, ou via connexion Google.
          Elle nécessite notamment un nom, un prénom, une adresse e-mail valide et un numéro de
          téléphone. Un lien de connexion sans mot de passe peut également être envoyé par e-mail
          (« magic link »). L'utilisateur garantit l'exactitude des informations communiquées et
          peut les corriger à tout moment depuis son espace « Mon Profil ».
        </P>
        <SubTitle>Sécurité du compte</SubTitle>
        <P>
          L'utilisateur est seul responsable de la confidentialité de son mot de passe et de
          toute utilisation effectuée depuis son compte. Il s'engage à informer immédiatement{" "}
          <a href={`mailto:${settings.supportEmail}`} className="text-blue-600 underline underline-offset-2">
            {settings.supportEmail}
          </a>{" "}
          de toute utilisation frauduleuse suspectée.
        </P>
      </>
    ),
  },
  {
    id: "services",
    title: "Services proposés",
    content: (
      <>
        <P>La plateforme permet notamment :</P>
        <Ul
          items={[
            "la consultation et la recherche de produits, filtrables par catégorie, prix et note",
            "la commande en ligne avec panier, code promo et plusieurs modes de livraison",
            "le paiement sécurisé et le suivi de commande, avec notification à chaque étape",
            "un programme de fidélité : des points sont crédités sur chaque commande confirmée et cumulables sur le compte",
            "une liste de souhaits et des listes cadeaux partageables",
            "un carnet d'adresses de livraison, réutilisable et complété automatiquement lors des commandes",
            "les avis et évaluations sur les produits",
          ]}
        />
        <SubTitle>Demande de sourcing (« Trouver un produit »)</SubTitle>
        <P>
          Tout utilisateur peut soumettre, via la page{" "}
          <a href="/demande" className="text-blue-600 underline underline-offset-2">skignas.com/demande</a>,
          une demande décrivant un produit qu'il souhaite se procurer (nom, description, photos,
          quantité, budget indicatif, adresse de livraison). Skignas étudie chaque demande et
          répond par e-mail à l'adresse communiquée, généralement sous 24 à 48 heures, avec une
          proposition de prix le cas échéant. La soumission d'une demande n'emporte aucune
          obligation d'achat ni de fourniture du produit recherché.
        </P>
        <SubTitle>Disponibilité</SubTitle>
        <P>
          Skignas s'efforce d'assurer une disponibilité de la plateforme 24h/24 et 7j/7. Des
          interruptions ponctuelles peuvent survenir pour maintenance ou incident technique, sans
          garantie de disponibilité continue.
        </P>
      </>
    ),
  },
  {
    id: "obligations",
    title: "Obligations des utilisateurs et produits interdits",
    content: (
      <>
        <SubTitle>Obligations générales</SubTitle>
        <P>L'utilisateur s'engage à :</P>
        <Ul
          items={[
            "respecter les lois en vigueur en Côte d'Ivoire",
            "fournir des informations exactes lors de son inscription et de ses commandes",
            "ne pas porter atteinte aux droits des tiers",
            "ne pas diffuser de contenus illicites (avis, messages)",
            "utiliser la plateforme de bonne foi, sans tenter de contourner ses mesures de sécurité",
          ]}
        />
        <SubTitle>Obligations des magasins et fournisseurs partenaires</SubTitle>
        <P>Les produits référencés sur la plateforme proviennent de magasins et fournisseurs partenaires, qui s'engagent à :</P>
        <Ul
          items={[
            "proposer uniquement des produits licites et conformes à leur description",
            "afficher des prix exacts et à jour",
            "respecter les délais de préparation annoncés",
          ]}
        />
        <SubTitle>Produits interdits</SubTitle>
        <P>Il est interdit de commercialiser via la plateforme, notamment :</P>
        <Ul
          items={[
            "les armes",
            "les stupéfiants",
            "les médicaments soumis à prescription",
            "les produits contrefaits",
            "les espèces protégées",
            "les contenus pornographiques illicites",
            "tout produit interdit par la législation ivoirienne en vigueur",
          ]}
        />
        <InfoBox variant="amber">
          Skignas se réserve le droit de retirer tout produit non conforme et de suspendre le
          compte associé, sans préavis en cas de manquement grave.
        </InfoBox>
      </>
    ),
  },
  {
    id: "commandes",
    title: "Commandes, paiement et livraison",
    content: (
      <>
        <SubTitle>Processus de commande</SubTitle>
        <P>Toute commande suit les étapes suivantes : sélection du produit, ajout au panier, saisie de l'adresse de livraison, choix du mode de paiement, puis confirmation. Un code promo peut être appliqué avant validation.</P>
        <SubTitle>Moyens de paiement</SubTitle>
        <P>Les paiements peuvent être effectués par :</P>
        <Ul
          items={[
            "Orange Money",
            "MTN Mobile Money",
            "Wave",
            "Paiement à la livraison (espèces, à réception du colis)",
          ]}
        />
        <P>
          La commande est confirmée dès sa validation ; le paiement mobile money est vérifié
          manuellement par notre équipe, qui met à jour le statut de la commande en conséquence.
        </P>
        <SubTitle>Livraison</SubTitle>
        <P>Deux modes de livraison sont proposés à la validation de la commande :</P>
        <Ul
          items={[
            "Standard — 3 à 5 jours ouvrés, 1 500 FCFA (gratuite dès 25 000 FCFA d'achat)",
            "Express — 24 à 72h garanties, 3 500 FCFA",
          ]}
        />
        <P>
          Les produits sont livrés à l'adresse indiquée par l'acheteur lors de la commande.
          Skignas informe l'acheteur de toute difficulté susceptible de retarder la livraison.
        </P>
        <SubTitle>Suivi et étapes de la commande</SubTitle>
        <P>
          Chaque commande suit un cycle de statuts — <em>en attente, confirmée, en préparation,
          expédiée, livrée</em> — consultable à tout moment depuis « Mes commandes ». Un e-mail est
          envoyé à l'acheteur à chaque changement de statut.
        </P>
        <SubTitle>Annulation et remboursement</SubTitle>
        <P>
          L'acheteur peut annuler gratuitement une commande tant qu'elle est au statut « en
          attente » ou « confirmée », depuis son espace « Mes commandes ». Au-delà, l'annulation
          doit être demandée auprès du service client. Toute commande annulée ou remboursée fait
          l'objet d'un e-mail de confirmation.
        </P>
      </>
    ),
  },
  {
    id: "donnees",
    title: "Protection des données personnelles",
    content: (
      <>
        <P>La plateforme collecte uniquement les données nécessaires :</P>
        <Ul
          items={[
            "à la gestion du compte utilisateur",
            "au traitement et au suivi des commandes",
            "au paiement et à la livraison",
            "au service client et au traitement des demandes de sourcing",
          ]}
        />
        <SubTitle>Droits des utilisateurs</SubTitle>
        <P>Conformément à la réglementation applicable, chaque utilisateur dispose notamment des droits suivants :</P>
        <Ul
          items={[
            "droit d'accès",
            "droit de rectification",
            "droit d'opposition",
            "droit à l'effacement",
            "droit à la limitation",
            "droit à la portabilité",
          ]}
        />
        <P>
          Toute demande peut être adressée à{" "}
          <a href={`mailto:${settings.supportEmail}`} className="text-blue-600 underline underline-offset-2">
            {settings.supportEmail}
          </a>. Pour plus de détails, consultez notre{" "}
          <a href="/privacy" className="text-blue-600 underline underline-offset-2">politique de confidentialité</a>.
        </P>
      </>
    ),
  },
  {
    id: "propriete",
    title: "Propriété intellectuelle",
    content: (
      <>
        <P>Demeurent la propriété exclusive de la plateforme : logo, marque, logiciel, bases de données, photographies, illustrations et textes qui lui sont propres.</P>
        <P>Toute reproduction, représentation ou exploitation, totale ou partielle, sans autorisation écrite préalable de Skignas est interdite.</P>
      </>
    ),
  },
  {
    id: "responsabilite",
    title: "Responsabilité",
    content: (
      <>
        <P>Skignas agit comme intermédiaire entre magasins/fournisseurs partenaires et acheteurs. Elle ne peut être tenue responsable :</P>
        <Ul
          items={[
            "des descriptions inexactes fournies par un magasin partenaire",
            "des retards imputables aux transporteurs",
            "des cas de force majeure",
          ]}
        />
      </>
    ),
  },
  {
    id: "suspension",
    title: "Suspension et résiliation",
    content: (
      <>
        <P>Skignas peut suspendre ou supprimer un compte notamment en cas :</P>
        <Ul
          items={[
            "de fraude",
            "d'usurpation d'identité",
            "de non-respect des présentes CGU",
            "de diffusion de contenus illicites",
          ]}
        />
        <P>
          L'utilisateur peut à tout moment demander la suppression de son compte depuis son
          espace « Mon Profil » ou en écrivant à{" "}
          <a href={`mailto:${settings.supportEmail}`} className="text-blue-600 underline underline-offset-2">
            {settings.supportEmail}
          </a>.
        </P>
      </>
    ),
  },
  {
    id: "litiges",
    title: "Règlement des litiges et droit applicable",
    content: (
      <>
        <P>
          Toute réclamation doit être adressée en priorité au service clientèle, par e-mail à{" "}
          <a href={`mailto:${settings.supportEmail}`} className="text-blue-600 underline underline-offset-2">
            {settings.supportEmail}
          </a>{" "}
          ou via{" "}
          <a href={waLink(settings.whatsappNumber)} target="_blank" rel="noreferrer" className="text-blue-600 underline underline-offset-2">
            WhatsApp
          </a>.
        </P>
        <P>
          Les présentes CGU sont régies par le droit ivoirien. À défaut d'accord amiable, les
          tribunaux compétents du ressort du siège de l'exploitant ({settings.address}) seront
          seuls compétents, sauf dispositions légales contraires.
        </P>
      </>
    ),
  },
  {
    id: "finales",
    title: "Modification des CGU et dispositions finales",
    content: (
      <>
        <P>
          Les présentes CGU peuvent être modifiées à tout moment. Toute nouvelle version est
          publiée sur cette page et entre en vigueur à sa date de publication ; la poursuite de
          l'utilisation de la plateforme après publication vaut acceptation de la version mise à jour.
        </P>
        <SubTitle>Contact</SubTitle>
        <P>Pour toute question relative aux présentes CGU :</P>
        <Ul
          items={[
            `Adresse : ${settings.address}`,
            `Téléphone : ${settings.supportPhone}`,
            `E-mail : ${settings.supportEmail}`,
            "Site web : www.skignas.com",
          ]}
        />
        <InfoBox variant="green">
          <a href={telLink(settings.supportPhone)} className="font-medium underline underline-offset-2">
            Appeler le support
          </a>{" "}
          ·{" "}
          <a href={waLink(settings.whatsappNumber)} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-2">
            Écrire sur WhatsApp
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
        description="Consultez les CGU de Skignas : objet du contrat, conditions d'utilisation, commandes, paiement, livraison, propriété intellectuelle et droits des utilisateurs."
        path="/cgu"
      />
      <LegalLayout
        badge="CGU"
        accentColor="#3b9c3c"
        title="Conditions Générales d'Utilisation"
        subtitle="En utilisant la plateforme Skignas, vous acceptez les termes et conditions décrits dans ce document. Lisez-le attentivement avant toute utilisation."
        lastUpdated="9 juillet 2026"
        readTime="7 min"
        sections={SECTIONS}
        contactEmail={settings.supportEmail}
      />
    </>
  );
}
