# Dictionnaire des métriques — tableau de bord marchand Skignas

> Fichier généré par `npm run metrics:doc` (backend) depuis `backend/src/lib/sellerMetrics/dictionary.ts`.
> Ne pas modifier à la main : modifier le dictionnaire dans le code, puis régénérer.

## Règles communes

- **Monnaie** : F CFA (XOF), montants entiers, séparateur de milliers espace. HT par défaut (TVA Côte d'Ivoire 18 %, configurable dans l'admin, payée par le client, jamais au marchand).
- **Fuseau** : Africa/Abidjan pour toutes les bornes de période et les jours.
- **Commande valide** : payée, ni annulée ni remboursée en totalité, non supprimée. Un marchand ne voit aucun chiffre issu d'une commande non encaissée.
- **Date de référence** : date de paiement (date de création pour les commandes payées avant le 27/09/2026).
- **Périmètre** : uniquement les lignes du marchand ; une commande peut mélanger plusieurs boutiques.
- **Règle d'or** : un indicateur absent de ce dictionnaire n'apparaît pas dans le tableau de bord.

## Commande valide `validOrder`

Commande encaissée et non annulée contenant au moins un article du marchand non remboursé.

| | |
|---|---|
| Formule | paymentStatus = paid ET statut ∉ {annulée, remboursée} ET non supprimée ET quantité conservée > 0 sur au moins une ligne du marchand |
| Inclus | Paiement en ligne confirmé, paiement à la livraison confirmé par Skignas |
| Exclu | Commandes en attente de paiement, annulées, remboursées en totalité, de test supprimées |
| Source | orders, order_items, products (boutique), order_return_items |
| Rafraîchissement | À chaque affichage (requête SQL directe, pas de cache) |
| Propriétaire | Équipe produit Skignas (tableau de bord marchand) |

## Chiffre d'affaires HT `revenueHt`

Montant HT des articles du marchand vendus dans des commandes valides, net des remboursements, daté au paiement.

| | |
|---|---|
| Formule | Σ prix unitaire HT × (quantité − quantité remboursée), sur les lignes du marchand des commandes valides payées dans la période |
| Inclus | Articles du marchand uniquement |
| Exclu | TVA, frais de livraison, assistance technique (revenu Skignas), lignes des autres boutiques, commandes non payées |
| Source | order_items.price, order_items.qty, order_return_items (retours remboursés) |
| Rafraîchissement | À chaque affichage (requête SQL directe, pas de cache) |
| Propriétaire | Équipe produit Skignas (tableau de bord marchand) |

## Commandes valides `validOrders`

Nombre de commandes valides (voir fiche « Commande valide ») payées dans la période.

| | |
|---|---|
| Formule | COUNT(DISTINCT commande) parmi les commandes valides de la période |
| Inclus | Une commande multi-boutiques compte pour 1 chez chaque marchand concerné |
| Exclu | Commandes non payées, annulées, remboursées en totalité |
| Source | orders, order_items |
| Rafraîchissement | À chaque affichage (requête SQL directe, pas de cache) |
| Propriétaire | Équipe produit Skignas (tableau de bord marchand) |

## Panier moyen HT `avgBasket`

Montant HT moyen des articles du marchand par commande valide.

| | |
|---|---|
| Formule | Chiffre d'affaires HT ÷ commandes valides (0 si aucune commande) |
| Inclus | Articles du marchand uniquement |
| Exclu | Commandes de test supprimées, commandes non payées |
| Source | Dérivé de revenueHt et validOrders |
| Rafraîchissement | À chaque affichage (requête SQL directe, pas de cache) |
| Propriétaire | Équipe produit Skignas (tableau de bord marchand) |

## Nouveaux clients `newCustomers`

Clients dont la PREMIÈRE commande valide auprès de ce marchand tombe dans la période.

| | |
|---|---|
| Formule | COUNT(clients) dont MIN(date de paiement des commandes valides chez le marchand) ∈ période |
| Inclus | Clients avec compte (identifiant) et invités (e-mail normalisé), jamais affichés nominativement ici |
| Exclu | Clients déjà acheteurs chez ce marchand avant la période |
| Source | orders.userId / orders.clientEmail (pseudonymisés : seul un comptage est renvoyé) |
| Rafraîchissement | À chaque affichage (requête SQL directe, pas de cache) |
| Propriétaire | Équipe produit Skignas (tableau de bord marchand) |

## Net perçu `netRevenue`

Ce qui revient au marchand : chiffre d'affaires HT moins la commission Skignas, au taux FIGÉ au moment du paiement.

| | |
|---|---|
| Formule | Σ (prix HT × quantité − commission figée) × (quantité conservée ÷ quantité), sur les lignes dont la commission est connue |
| Inclus | Lignes payées depuis le 27/09/2026 (commission figée au paiement) |
| Exclu | Lignes sans commission figée (commandes antérieures) : exclues du net, d'où le taux de couverture affiché (« net calculé sur X % du CA ») |
| Source | order_item_financials.supplierPayout (taux de commission lu dans merchantgo au paiement) |
| Rafraîchissement | À chaque affichage (requête SQL directe, pas de cache) |
| Propriétaire | Équipe produit Skignas (tableau de bord marchand) |

## Taux de retour `returnRate`

Part des articles vendus dans la période qui font l'objet d'une demande de retour (hors demandes refusées ou annulées).

| | |
|---|---|
| Formule | Unités en retour ÷ unités vendues, sur les lignes du marchand des commandes valides payées dans la période ; aussi affiché en valeur HT |
| Inclus | Retours demandés, acceptés, reçus ou remboursés |
| Exclu | Demandes refusées ou annulées par le client |
| Source | order_returns, order_return_items |
| Rafraîchissement | À chaque affichage (requête SQL directe, pas de cache) |
| Propriétaire | Équipe produit Skignas (tableau de bord marchand) |

## Stock à risque `stockAtRisk`

Produits en ligne dont le stock sera épuisé dans moins de 7 jours au rythme des ventes récentes, plus les produits déjà en rupture.

| | |
|---|---|
| Formule | Couverture = stock ÷ ventes moyennes journalières des 28 derniers jours ; à risque si 0 < couverture < 7 jours ; rupture si stock ≤ 0 |
| Inclus | Produits actifs du marchand |
| Exclu | Produits désactivés ; produits sans vente sur 28 jours (couverture non calculable, signalés comme dormants plus tard) |
| Source | products.stock, order_items des 28 derniers jours |
| Rafraîchissement | À chaque affichage (requête SQL directe, pas de cache) |
| Propriétaire | Équipe produit Skignas (tableau de bord marchand) |

## Seuils des alertes

| Seuil | Valeur |
|---|---|
| Couverture de stock « à risque » | moins de 7 jours |
| Fenêtre des ventes pour la couverture | 28 derniers jours |
| Commande payée non expédiée | plus de 48 h |
| Taux de retour élevé | plus de 10 % (à partir de 10 unités vendues) |
