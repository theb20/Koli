import { P, Strong, Ul, InfoBox, SubTitle } from "../../components/ui/LegalLayout";

export const SECTIONS = [
  {
    id: "intro",
    title: "Qui sommes-nous et pourquoi cette politique ?",
    content: (
      <>
        <P>
          <Strong>Skignas SAS</Strong> (ci-après « Skignas », « nous ») est responsable du
          traitement des données personnelles collectées via la plateforme skignas.ahobaut.fr et ses
          services associés. Nous attachons la plus grande importance à la protection de votre
          vie privée et nous nous engageons à traiter vos données de manière transparente,
          loyale et sécurisée.
        </P>
        <P>
          La présente politique s'applique à toute personne qui visite notre site, crée un compte,
          effectue un achat ou interagit avec nos services, quelle que soit sa localisation.
        </P>
        <InfoBox variant="green">
          Notre traitement des données est conforme au Règlement Général sur la Protection des
          Données (RGPD – Règlement UE 2016/679) et à la loi Informatique et Libertés modifiée
          du 6 janvier 1978.
        </InfoBox>
      </>
    ),
  },
  {
    id: "collecte",
    title: "Données que nous collectons",
    content: (
      <>
        <P>
          Nous collectons uniquement les données strictement nécessaires à la fourniture de nos
          services. Voici les catégories de données concernées :
        </P>
        <SubTitle>Données que vous nous fournissez directement</SubTitle>
        <Ul
          items={[
            "Identité : nom, prénom, nom de votre boutique",
            "Coordonnées : adresse e-mail, numéro de téléphone, adresse postale",
            "Informations de connexion : identifiants, mots de passe hashés",
            "Informations de paiement : coordonnées bancaires (traitées par Stripe, non stockées par nous)",
            "Documents d'identité et justificatifs (pour la vérification des marchands)",
          ]}
        />
        <SubTitle>Données collectées automatiquement</SubTitle>
        <Ul
          items={[
            "Données de navigation : adresse IP (anonymisée), navigateur, système d'exploitation",
            "Données d'utilisation : pages visitées, durée de session, clics, fonctionnalités utilisées",
            "Données techniques : journaux d'erreurs, performances, cookies (voir section dédiée)",
          ]}
        />
        <SubTitle>Données provenant de tiers</SubTitle>
        <Ul
          items={[
            "Informations de profil lors d'une connexion via Google ou Facebook",
            "Données de vérification d'identité via notre partenaire Onfido",
          ]}
        />
      </>
    ),
  },
  {
    id: "finalites",
    title: "Finalités et bases légales du traitement",
    content: (
      <>
        <P>
          Nous traitons vos données uniquement pour des finalités déterminées, légitimes et
          fondées sur l'une des bases légales suivantes :
        </P>
        <div className="mb-4 overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Finalité</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Base légale</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Création et gestion de votre compte", "Exécution du contrat"],
                ["Traitement des commandes et paiements", "Exécution du contrat"],
                ["Envoi de communications transactionnelles", "Exécution du contrat"],
                ["Amélioration de la plateforme", "Intérêt légitime"],
                ["Analyse d'audience (anonymisée)", "Intérêt légitime"],
                ["Envoi de newsletter et offres commerciales", "Consentement"],
                ["Prévention de la fraude", "Obligation légale"],
                ["Conservation des factures", "Obligation légale (7 ans)"],
              ].map(([f, b]) => (
                <tr key={f} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-600">{f}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        b === "Consentement"
                          ? "bg-blue-50 text-blue-700"
                          : b === "Obligation légale (7 ans)" || b === "Obligation légale"
                          ? "bg-amber-50 text-amber-700"
                          : b === "Exécution du contrat"
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {b}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "partage",
    title: "Partage et transfert des données",
    content: (
      <>
        <P>
          Nous ne vendons jamais vos données personnelles à des tiers. Nous pouvons en revanche
          les partager dans les cas suivants :
        </P>
        <SubTitle>Sous-traitants techniques</SubTitle>
        <Ul
          items={[
            "Stripe (paiements en ligne) — données bancaires chiffrées, siège aux États-Unis (clauses contractuelles types)",
            "Vercel (hébergement) — journaux de serveur, siège aux États-Unis (SCCs, région EU)",
            "Postmark (e-mails transactionnels) — adresse e-mail, contenu des e-mails",
            "Plausible Analytics (statistiques) — données anonymisées, sans cookies, hébergé en UE",
            "Intercom (support client) — données de profil et conversations",
          ]}
        />
        <SubTitle>Autorités légales</SubTitle>
        <P>
          Nous pouvons divulguer vos données aux autorités compétentes sur réquisition judiciaire
          ou administrative, conformément à la législation applicable.
        </P>
        <InfoBox variant="amber">
          Tout transfert hors UE est encadré par des garanties appropriées (clauses contractuelles
          types, décision d'adéquation de la Commission européenne).
        </InfoBox>
      </>
    ),
  },
  {
    id: "conservation",
    title: "Durées de conservation",
    content: (
      <>
        <P>
          Vos données sont conservées pour la durée strictement nécessaire aux finalités pour
          lesquelles elles ont été collectées, dans les limites imposées par la loi.
        </P>
        <div className="mb-4 overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Type de donnée</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Durée</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Données de compte actif", "Durée de vie du compte + 90 jours"],
                ["Données après résiliation", "90 jours (export possible), puis suppression"],
                ["Factures et données comptables", "10 ans (obligation légale)"],
                ["Journaux de sécurité", "12 mois"],
                ["Données de navigation anonymisées", "13 mois maximum"],
                ["Candidatures non retenues", "2 ans"],
              ].map(([t, d]) => (
                <tr key={t} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-600">{t}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "droits",
    title: "Vos droits",
    content: (
      <>
        <P>
          Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :
        </P>
        <Ul
          items={[
            "Droit d'accès — obtenir une copie de toutes les données que nous détenons sur vous",
            "Droit de rectification — corriger des données inexactes ou incomplètes",
            "Droit à l'effacement — demander la suppression de vos données (« droit à l'oubli »)",
            "Droit à la limitation — restreindre le traitement dans certaines circonstances",
            "Droit à la portabilité — recevoir vos données dans un format structuré et lisible",
            "Droit d'opposition — vous opposer à un traitement fondé sur l'intérêt légitime",
            "Droit de retirer votre consentement — à tout moment et sans conséquence",
            "Droit de définir des directives post-mortem — relatives au sort de vos données après décès",
          ]}
        />
        <SubTitle>Comment exercer vos droits</SubTitle>
        <P>
          Adressez votre demande par e-mail à notre DPO :{" "}
          <a href="mailto:dpo@skignas.ahobaut.fr" className="font-medium text-blue-600 underline underline-offset-2">
            dpo@skignas.ahobaut.fr
          </a>
          {" "}ou par courrier à Skignas SAS – DPO, 42 rue du Commerce, 75015 Paris.
          Nous vous répondrons dans un délai d'un mois (prorogeable de deux mois en cas de
          demande complexe).
        </P>
        <InfoBox variant="blue">
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une
          réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés)
          {" "}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
          >
            www.cnil.fr
          </a>
          .
        </InfoBox>
      </>
    ),
  },
  {
    id: "securite",
    title: "Sécurité des données",
    content: (
      <>
        <P>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour
          protéger vos données contre tout accès non autorisé, toute altération, divulgation ou
          destruction.
        </P>
        <Ul
          items={[
            "Chiffrement des données en transit (TLS 1.3) et au repos (AES-256)",
            "Mots de passe hashés avec bcrypt (facteur de coût élevé)",
            "Accès aux données restreint au personnel habilité, selon le principe du moindre privilège",
            "Journaux d'accès et d'audit conservés 12 mois",
            "Tests de pénétration annuels réalisés par un prestataire indépendant",
            "Plan de réponse aux incidents de sécurité documenté et testé",
          ]}
        />
        <P>
          En cas de violation de données susceptible d'engendrer un risque pour vos droits et
          libertés, nous vous notifierons dans les 72 heures suivant sa découverte, conformément
          à l'article 34 du RGPD.
        </P>
      </>
    ),
  },
  {
    id: "mineurs",
    title: "Protection des mineurs",
    content: (
      <>
        <P>
          Nos services sont exclusivement destinés aux personnes majeures (18 ans ou plus).
          Nous ne collectons pas sciemment de données personnelles concernant des mineurs.
        </P>
        <P>
          Si nous apprenons qu'un mineur nous a fourni des données sans le consentement de ses
          parents ou tuteurs légaux, nous procéderons à la suppression de ces données dans les
          meilleurs délais. Veuillez nous contacter à{" "}
          <a href="mailto:privacy@skignas.ahobaut.fr" className="text-blue-600 underline underline-offset-2">
            privacy@skignas.ahobaut.fr
          </a>{" "}
          si vous avez connaissance d'une telle situation.
        </P>
      </>
    ),
  },
  {
    id: "modifications",
    title: "Modifications de cette politique",
    content: (
      <>
        <P>
          Skignas se réserve le droit de modifier la présente politique à tout moment.
          En cas de modification substantielle, nous vous en informerons par e-mail et/ou
          par une notification dans votre espace client, au moins 30 jours avant l'entrée
          en vigueur des nouvelles dispositions.
        </P>
        <P>
          La poursuite de l'utilisation de nos services après la date d'entrée en vigueur
          des modifications constitue votre acceptation de la politique mise à jour.
        </P>
        <InfoBox variant="green">
          La version en vigueur est toujours disponible à l'adresse{" "}
          <a href="/privacy" className="font-semibold underline underline-offset-2">
            skignas.ahobaut.fr/privacy
          </a>
          .
          La date de dernière mise à jour est indiquée en haut de ce document.
        </InfoBox>
      </>
    ),
  },
];