/* ─────────────────────────────────────────────────────────────
   Dictionnaire des métriques du tableau de bord MARCHAND — source unique.
   Règle d'or : un indicateur absent d'ici n'apparaît pas dans le tableau
   de bord. Ce fichier alimente :
   - les requêtes (lib/sellerMetrics/queries.ts, dont chaque calcul cite
     l'identifiant de sa fiche) ;
   - les infobulles de koli-marchand (GET /api/seller/metrics/dictionary) ;
   - le document d'équipe docs/dictionnaire-metriques-marchand.md
     (npm run metrics:doc).

   Conventions communes à toutes les fiches :
   - Monnaie : F CFA (XOF), montants entiers, séparateur de milliers espace.
     HT par défaut (le prix catalogue est HT ; la TVA CI, 18 % configurable
     dans l'admin, s'ajoute au panier du client et n'est jamais au marchand).
   - Fuseau : Africa/Abidjan pour toutes les bornes de période et les jours.
   - Commande valide : payée (paymentStatus = paid), ni annulée ni
     remboursée en totalité, pas supprimée. Un marchand ne voit AUCUN
     chiffre issu d'une commande non encaissée.
   - Date de référence : la date de paiement (Order.paidAt) — pas la date
     de création. Pour les commandes payées avant le 27/09/2026 (date non
     enregistrée), la date de création est utilisée.
   - Périmètre marchand : uniquement SES lignes (produits de sa boutique) ;
     une commande peut mélanger plusieurs boutiques.
   - Remboursements : les quantités remboursées (retours au statut
     « remboursé ») sont retirées des lignes.
───────────────────────────────────────────────────────────── */

export type MetricDefinition = {
  id: string
  name: string
  definition: string
  formula: string
  included: string
  excluded: string
  source: string
  refresh: string
  owner: string
}

const OWNER = 'Équipe produit Skignas (tableau de bord marchand)'
const LIVE = 'À chaque affichage (requête SQL directe, pas de cache)'

export const SELLER_METRICS = {
  validOrder: {
    id: 'validOrder',
    name: 'Commande valide',
    definition: 'Commande encaissée et non annulée contenant au moins un article du marchand non remboursé.',
    formula: 'paymentStatus = paid ET statut ∉ {annulée, remboursée} ET non supprimée ET quantité conservée > 0 sur au moins une ligne du marchand',
    included: 'Paiement en ligne confirmé, paiement à la livraison confirmé par Skignas',
    excluded: 'Commandes en attente de paiement, annulées, remboursées en totalité, de test supprimées',
    source: 'orders, order_items, products (boutique), order_return_items',
    refresh: LIVE,
    owner: OWNER,
  },
  revenueHt: {
    id: 'revenueHt',
    name: "Chiffre d'affaires HT",
    definition: "Montant HT des articles du marchand vendus dans des commandes valides, net des remboursements, daté au paiement.",
    formula: 'Σ prix unitaire HT × (quantité − quantité remboursée), sur les lignes du marchand des commandes valides payées dans la période',
    included: 'Articles du marchand uniquement',
    excluded: 'TVA, frais de livraison, assistance technique (revenu Skignas), lignes des autres boutiques, commandes non payées',
    source: 'order_items.price, order_items.qty, order_return_items (retours remboursés)',
    refresh: LIVE,
    owner: OWNER,
  },
  validOrders: {
    id: 'validOrders',
    name: 'Commandes valides',
    definition: 'Nombre de commandes valides (voir fiche « Commande valide ») payées dans la période.',
    formula: 'COUNT(DISTINCT commande) parmi les commandes valides de la période',
    included: 'Une commande multi-boutiques compte pour 1 chez chaque marchand concerné',
    excluded: 'Commandes non payées, annulées, remboursées en totalité',
    source: 'orders, order_items',
    refresh: LIVE,
    owner: OWNER,
  },
  avgBasket: {
    id: 'avgBasket',
    name: 'Panier moyen HT',
    definition: 'Montant HT moyen des articles du marchand par commande valide.',
    formula: "Chiffre d'affaires HT ÷ commandes valides (0 si aucune commande)",
    included: 'Articles du marchand uniquement',
    excluded: 'Commandes de test supprimées, commandes non payées',
    source: 'Dérivé de revenueHt et validOrders',
    refresh: LIVE,
    owner: OWNER,
  },
  newCustomers: {
    id: 'newCustomers',
    name: 'Nouveaux clients',
    definition: "Clients dont la PREMIÈRE commande valide auprès de ce marchand tombe dans la période.",
    formula: 'COUNT(clients) dont MIN(date de paiement des commandes valides chez le marchand) ∈ période',
    included: "Clients avec compte (identifiant) et invités (e-mail normalisé), jamais affichés nominativement ici",
    excluded: 'Clients déjà acheteurs chez ce marchand avant la période',
    source: 'orders.userId / orders.clientEmail (pseudonymisés : seul un comptage est renvoyé)',
    refresh: LIVE,
    owner: OWNER,
  },
  netRevenue: {
    id: 'netRevenue',
    name: 'Net perçu',
    definition: "Ce qui revient au marchand : chiffre d'affaires HT moins la commission Skignas, au taux FIGÉ au moment du paiement.",
    formula: 'Σ (prix HT × quantité − commission figée) × (quantité conservée ÷ quantité), sur les lignes dont la commission est connue',
    included: 'Lignes payées depuis le 27/09/2026 (commission figée au paiement)',
    excluded: "Lignes sans commission figée (commandes antérieures) : exclues du net, d'où le taux de couverture affiché (« net calculé sur X % du CA »)",
    source: 'order_item_financials.supplierPayout (taux de commission lu dans merchantgo au paiement)',
    refresh: LIVE,
    owner: OWNER,
  },
  returnRate: {
    id: 'returnRate',
    name: 'Taux de retour',
    definition: "Part des articles vendus dans la période qui font l'objet d'une demande de retour (hors demandes refusées ou annulées).",
    formula: 'Unités en retour ÷ unités vendues, sur les lignes du marchand des commandes valides payées dans la période ; aussi affiché en valeur HT',
    included: 'Retours demandés, acceptés, reçus ou remboursés',
    excluded: 'Demandes refusées ou annulées par le client',
    source: 'order_returns, order_return_items',
    refresh: LIVE,
    owner: OWNER,
  },
  stockAtRisk: {
    id: 'stockAtRisk',
    name: 'Stock à risque',
    definition: 'Produits en ligne dont le stock sera épuisé dans moins de 7 jours au rythme des ventes récentes, plus les produits déjà en rupture.',
    formula: 'Couverture = stock ÷ ventes moyennes journalières des 28 derniers jours ; à risque si 0 < couverture < 7 jours ; rupture si stock ≤ 0',
    included: 'Produits actifs du marchand',
    excluded: 'Produits désactivés ; produits sans vente sur 28 jours (couverture non calculable, signalés comme dormants plus tard)',
    source: 'products.stock, order_items des 28 derniers jours',
    refresh: LIVE,
    owner: OWNER,
  },
} satisfies Record<string, MetricDefinition>

export type SellerMetricId = keyof typeof SELLER_METRICS

/** Seuils des alertes de l'accueil — modifiables ici (une seule source). */
export const SELLER_ALERT_THRESHOLDS = {
  /** Couverture de stock (jours) en dessous de laquelle un produit est « à risque ». */
  stockCoverageDays: 7,
  /** Fenêtre (jours) de la vente moyenne journalière pour la couverture. */
  salesWindowDays: 28,
  /** Commande payée non expédiée depuis plus de N heures → alerte. */
  unshippedHours: 48,
  /** Taux de retour de la période au-dessus duquel une alerte s'affiche (%). */
  returnRatePct: 10,
} as const
