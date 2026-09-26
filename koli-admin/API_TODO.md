# API_TODO — données manquantes pour la refonte du backoffice

Règle (décision du 26/09/2026) : **aucune donnée fictive dans l'admin**. Une
fonctionnalité sans données réelles reste **masquée** tant que l'endpoint ou la
collecte n'existe pas. Tout ajout côté API se fait **en ajout** : aucun contrat
existant n'est modifié.

## Livré

| Endpoint | Usage | Phase |
|---|---|---|
| `GET /api/admin/overview/counters` | Pastilles de la sidebar : commandes en attente, retours demandés, demandes de produits, messages non lus, notifications non lues | 1 |

## À évaluer (idées validées, non implémentées)

| Sujet | Proposition | Ce qu'il faut collecter |
|---|---|---|
| Opérateur de paiement | Nouveau champ `Order.paymentOperator` (`orange`, `mtn`, `wave`, `card`, `cash`), renseigné par le rappel merchantgo `mark-paid` (le champ `operator` y est déjà transmis) | Rien de plus : l'information existe dans merchantgo. Débloque le donut « Moyens de paiement ». |
| Statistiques agrégées | `GET /api/admin/overview/stats?from&to` : CA, commandes, panier moyen, séries mensuelles, comparaison de période, calculés en SQL | Rien : remplace le calcul sur les 200 dernières commandes fait dans le navigateur (Phase 2). |
| Visites | API GA4 Data (compte de service Google) exposée par un endpoint backend mis en cache | Identifiant de propriété GA4 + compte de service. **KPI « Visites » masqué d'ici là.** |

## Masqué faute de données

| Fonctionnalité | Pourquoi | Ce qu'il faudrait |
|---|---|---|
| Ventes par commune | `shippingAddress.quartier` est un texte libre (pas de référentiel de communes) | Liste fermée de communes au checkout (Abidjan + villes) ; normalisation de l'historique. |
| Agenda (deals, bannières, e-mails planifiés) | Pas de modèle d'événement | Dérivable en partie des dates existantes (`saleStartsAt/EndsAt`, bannières, articles de blog planifiés) : à confirmer en Phase 2. |
| Avis « à modérer / signalés » | Pas de statut de modération ni de signalement | Champs `Review.status` + `Review.reports`. |
| Rôles et permissions | Un seul rôle `admin` (reporté par décision) | Modèle rôles × permissions côté backend. |
| Temps réel | Aucun canal push (pas de WebSocket/SSE) | SSE ou WebSocket côté backend ; en attendant, rafraîchissement toutes les 30 s. |
| Candidatures marchands en local | Servies par merchantgo, non lancé dans l'environnement de test | Lancer merchantgo en local ou l'ajouter au seed de test. |
