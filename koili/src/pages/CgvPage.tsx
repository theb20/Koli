import { LegalLayout, P, Strong, Ul, InfoBox, SubTitle } from "../components/ui/LegalLayout";
import { PageMeta } from "../components/seo/PageMeta";
import { useSiteSettings, waLink, type SiteSettings } from "../hooks/useSiteSettings";

/* Conditions Générales de Vente — décrivent les règles RÉELLEMENT appliquées
   par la plateforme (prix HT + TVA, frais de livraison, retours 14 jours,
   plafond de remboursement, assistance technique, devis de sourcing).
   Toute modification de ces règles dans le code doit être répercutée ici. */

const L = "text-blue-600 underline underline-offset-2";

function getSections(s: SiteSettings) {
  return [
    {
      id: "champ",
      title: "Champ d'application",
      content: (
        <>
          <P>
            Les présentes Conditions Générales de Vente (« CGV ») s'appliquent à toute commande passée sur
            skignas.com par un acheteur, que le produit soit vendu par <Strong>Skignas</Strong> ou par un
            marchand présent sur la plateforme. Elles complètent les{" "}
            <a href="/cgu" className={L}>Conditions Générales d'Utilisation</a>.
          </P>
          <P>
            Skignas encaisse le paiement, organise la livraison et reste l'interlocuteur unique de l'acheteur
            pour toute commande (réclamation, retour, remboursement), quel que soit le vendeur du produit.
          </P>
          <InfoBox variant="blue">
            Version 1.0 — en vigueur depuis le 27 septembre 2026. Chaque commande est régie par la version des
            CGV en vigueur au moment où elle est passée.
          </InfoBox>
        </>
      ),
    },
    {
      id: "prix",
      title: "Produits et prix",
      content: (
        <>
          <P>
            Les caractéristiques essentielles de chaque produit sont présentées sur sa fiche. Les prix sont
            indiqués en francs CFA (FCFA), <Strong>hors taxes</Strong>. La TVA au taux en vigueur est ajoutée
            au panier, et le <Strong>montant total TTC</Strong> — frais de livraison et options compris — est
            affiché avant la validation de la commande.
          </P>
          <P>
            Les codes promo sont soumis aux conditions affichées lors de leur utilisation (montant minimum,
            durée, nombre d'utilisations) et s'appliquent au prix des produits.
          </P>
        </>
      ),
    },
    {
      id: "commande",
      title: "Commande",
      content: (
        <>
          <P>
            La commande est passée depuis le panier : choix des produits et options, adresse et mode de
            livraison, mode de paiement, puis validation. Un e-mail de confirmation est envoyé ; le suivi est
            disponible dans « Mes commandes » (en attente, confirmée, en préparation, expédiée, livrée).
          </P>
          <P>
            La vente est conclue à la validation de la commande, sous réserve de disponibilité du stock, vérifiée
            au moment de la validation.
          </P>
        </>
      ),
    },
    {
      id: "paiement",
      title: "Paiement",
      content: (
        <>
          <Ul
            items={[
              "Paiement en ligne, via notre prestataire WiniPayer : Orange Money, MTN Mobile Money, Wave ou carte bancaire. Skignas ne reçoit ni ne conserve vos données de carte ou de mobile money.",
              "Paiement à la livraison (espèces), lorsqu'il est proposé au moment de la commande.",
            ]}
          />
          <P>
            Un paiement en ligne n'est considéré comme effectué qu'après confirmation par WiniPayer. En cas de
            paiement annulé ou refusé, aucun montant n'est débité et la commande est annulée.
          </P>
        </>
      ),
    },
    {
      id: "livraison",
      title: "Livraison",
      content: (
        <>
          <P>Les livraisons sont effectuées en Côte d'Ivoire, à l'adresse indiquée par l'acheteur :</P>
          <Ul
            items={[
              "Standard — 3 à 5 jours ouvrés, 1 500 FCFA, gratuite dès 25 000 FCFA d'achat (hors taxes)",
              "Express — 24 à 72 heures, 3 500 FCFA",
            ]}
          />
          <P>
            Les délais courent à compter de la confirmation de la commande (et du paiement, pour un paiement en
            ligne). En cas de retard, Skignas informe l'acheteur ; celui-ci peut contacter le service client
            pour toute difficulté.
          </P>
        </>
      ),
    },
    {
      id: "annulation",
      title: "Annulation avant expédition",
      content: (
        <P>
          L'acheteur peut annuler gratuitement sa commande tant qu'elle est « en attente » ou « confirmée »,
          depuis « Mes commandes ». Au-delà, il contacte le service client. Un paiement déjà effectué est alors
          intégralement remboursé.
        </P>
      ),
    },
    {
      id: "retours",
      title: "Retours et remboursements",
      content: (
        <>
          <P>
            Sans préjudice des droits que la loi reconnaît au consommateur, l'acheteur peut demander le
            retour de tout ou partie d'une commande <Strong>dans les 14 jours suivant sa livraison</Strong>,
            depuis « Mes commandes » (un compte client est nécessaire), en indiquant le motif : produit
            défectueux, produit erroné, non conforme à la description, ne correspond plus au besoin, autre. Des
            photos peuvent être jointes (4 au maximum).
          </P>
          <SubTitle>Traitement de la demande</SubTitle>
          <Ul
            items={[
              "Chaque demande est examinée par le service client, qui l'accepte ou la refuse de façon motivée ; l'acheteur est informé par e-mail à chaque étape",
              "Si elle est acceptée, les modalités de renvoi ou d'enlèvement du produit sont communiquées à l'acheteur",
              "Le produit doit être retourné complet, dans son emballage d'origine si possible, avec ses accessoires",
              "Le remboursement intervient après réception et vérification du produit",
            ]}
          />
          <SubTitle>Montant remboursé</SubTitle>
          <P>
            Le remboursement porte sur le <Strong>prix payé des articles retournés, TVA comprise</Strong> (au
            prorata d'une éventuelle remise obtenue par code promo). Les frais de livraison et l'option
            « Assistance technique », lorsque la prestation a été réalisée, ne sont pas remboursés. Le
            remboursement est effectué par mobile money ou par le moyen convenu avec l'acheteur.
          </P>
        </>
      ),
    },
    {
      id: "garanties",
      title: "Garanties légales",
      content: (
        <>
          <P>
            Les produits bénéficient des garanties légales prévues par la législation ivoirienne, notamment la
            loi n° 2016-412 du 15 juin 2016 relative à la consommation : l'acheteur a droit à un produit
            conforme au contrat et exempt de vices cachés.
          </P>
          <P>
            En cas de produit défectueux ou non conforme, l'acheteur contacte le service client, qui propose
            selon le cas la réparation, le remplacement ou le remboursement. Une garantie commerciale du
            fabricant, lorsqu'elle existe, est indiquée sur la fiche produit et s'ajoute aux garanties légales.
          </P>
        </>
      ),
    },
    {
      id: "assistance",
      title: "Option « Assistance technique »",
      content: (
        <>
          <P>
            Certains produits peuvent être accompagnés d'une option payante <Strong>Assistance technique</Strong>,
            réalisée par Skignas. Son prix est affiché sur la fiche produit et au panier ; il est facturé
            <Strong> une fois par produit commandé, quelle que soit la quantité</Strong>, et soumis à la TVA.
          </P>
          <P>
            L'option est choisie librement par l'acheteur, qui peut la retirer du panier avant la validation de
            la commande.
          </P>
        </>
      ),
    },
    {
      id: "sourcing",
      title: "Devis de sourcing",
      content: (
        <>
          <P>
            Pour un produit recherché via « Trouver un produit », Skignas peut adresser un devis en ligne
            (e-mail, SMS et lien personnel). Le devis indique le prix unitaire hors taxes, livraison incluse,
            la quantité, la TVA et le total TTC.
          </P>
          <Ul
            items={[
              "Le devis est valable 7 jours ; au-delà, un nouveau prix doit être demandé",
              "Son acceptation entraîne le paiement intégral en ligne (Orange Money, MTN Mobile Money, Wave ou carte) ; le paiement à la livraison n'est pas proposé pour les devis",
              "L'achat du produit auprès du fournisseur n'est lancé qu'après confirmation du paiement",
              "Le client peut refuser le devis sans frais, en indiquant s'il le souhaite un motif",
            ]}
          />
        </>
      ),
    },
    {
      id: "service-client",
      title: "Service client et réclamations",
      content: (
        <P>
          Pour toute question ou réclamation : e-mail{" "}
          <a href={`mailto:${s.supportEmail}`} className={L}>{s.supportEmail}</a>, téléphone {s.supportPhone},
          ou{" "}
          <a href={waLink(s.whatsappNumber)} target="_blank" rel="noreferrer" className={L}>WhatsApp</a>.
        </P>
      ),
    },
    {
      id: "litiges",
      title: "Droit applicable et litiges",
      content: (
        <P>
          Les présentes CGV sont soumises au droit ivoirien. En cas de litige, l'acheteur est invité à contacter
          d'abord le service client afin de rechercher une solution amiable. À défaut, le litige est porté devant
          les juridictions compétentes, sans préjudice des règles protectrices du consommateur.
        </P>
      ),
    },
  ];
}

export default function CgvPage() {
  const settings = useSiteSettings();
  return (
    <>
      <PageMeta
        title="Conditions Générales de Vente"
        description="CGV Skignas : prix, paiement (Orange Money, MTN, Wave, carte, livraison), frais et délais de livraison, retours sous 14 jours, garanties, assistance technique et devis de sourcing."
        path="/cgv"
      />
      <LegalLayout
        badge="CGV"
        accentColor="#ea580c"
        title="Conditions Générales de Vente"
        subtitle="Prix, paiement, livraison, retours et garanties : les règles qui s'appliquent à vos commandes sur Skignas."
        lastUpdated="27 septembre 2026"
        readTime="6 min"
        sections={getSections(settings)}
        contactEmail={settings.supportEmail}
      />
    </>
  );
}
