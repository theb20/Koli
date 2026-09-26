# API_TODO — données manquantes pour la refonte du backoffice

Règle (décision du 26/09/2026) : **aucune donnée fictive dans l'admin**. Une
fonctionnalité sans données réelles reste **masquée** tant que l'endpoint ou la
collecte n'existe pas. Tout ajout côté API se fait **en ajout** : aucun contrat
existant n'est modifié.

## Livré

| Endpoint | Usage | Phase |
|---|---|---|
| `GET /api/admin/overview/counters` | Pastilles de la sidebar : commandes en attente, retours demandés, demandes de produits, messages non lus, notifications non lues | 1 |
| `GET /api/admin/overview/performance?period&origin` | KPI « Performance dans le temps » + période précédente (7 j, 30 j, ce mois, mois dernier ; toutes / Skignas / marchands) | 2 |
| `GET /api/admin/overview/sales` | CA payé des 6 derniers mois, moyenne, mois courant vs mois dernier à date égale | 2 |
| `GET /api/admin/overview/agenda?from&to` | Agenda dérivé des données existantes : deals (dates promo), e-mails flash-deal, articles, boutiques | 2 |
| `GET /api/admin/overview/insights` | À traiter, top produits (+ tendance 6 semaines), top boutiques, paiement en ligne / livraison, ventes par ville, stock faible, activité récente | 2 |

## À évaluer (idées validées, non implémentées)

| Sujet | Proposition | Ce qu'il faut collecter |
|---|---|---|
| Opérateur de paiement | Nouveau champ `Order.paymentOperator` (`orange`, `mtn`, `wave`, `card`, `cash`), renseigné par le rappel merchantgo `mark-paid` (le champ `operator` y est déjà transmis) | Rien de plus : l'information existe dans merchantgo. Débloque le donut « Moyens de paiement ». |
| Visites | API GA4 Data (compte de service Google) exposée par un endpoint backend mis en cache | Identifiant de propriété GA4 + compte de service. **KPI « Visites » remplacé par « Panier moyen » sur la Vue d'ensemble d'ici là.** |

## Masqué faute de données

| Fonctionnalité | Pourquoi | Ce qu'il faudrait |
|---|---|---|
| Ventes par commune | `shippingAddress.quartier` est un texte libre (pas de référentiel de communes) | Liste fermée de communes au checkout (Abidjan + villes) ; normalisation de l'historique. |
| Agenda : bannières promo | Les bannières n'ont ni date de début ni date de fin | Champs `PromoBanner.startsAt/endsAt` (les autres types d'événements sont déjà affichés). |
| Objectif de CA mensuel | Aucun objectif enregistré : les barres affichent le % du meilleur mois des 6 derniers | Champ d'objectif mensuel (réglages) pour afficher le « % d'objectif atteint ». |
| Alerte stock : « Notifier le marchand » | Pas d'endpoint d'envoi | `POST /api/admin/products/:id/low-stock-notify` (e-mail + notification au marchand). |
| Avis « à modérer / signalés » | Pas de statut de modération ni de signalement | Champs `Review.status` + `Review.reports`. |
| Rôles et permissions | Un seul rôle `admin` (reporté par décision) | Modèle rôles × permissions côté backend. |
| Temps réel | Aucun canal push (pas de WebSocket/SSE) | SSE ou WebSocket côté backend ; en attendant, rafraîchissement toutes les 30 s. |
| Candidatures marchands en local | Servies par merchantgo, non lancé dans l'environnement de test | Lancer merchantgo en local ou l'ajouter au seed de test. |
