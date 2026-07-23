# Merchantgo — Skignas Business, onboarding & validation marchand

Service Go indépendant, périmètre volontairement restreint à une seule
responsabilité : recevoir la candidature d'inscription marchand (étapes 3 à
10 du formulaire koli-business) et piloter son workflow de validation KYC
jusqu'à la décision d'un admin Skignas (koli-admin).

Ce n'est **pas** un remplacement du backend Node principal (`backend/`), ni
du service de stockage (`stockgo/`) — c'est un troisième service, isolé,
pour ce bounded context précis. Voir la discussion d'architecture qui a
précédé ce choix : étendre le backend existant coûtait moins cher, mais un
service dédié a été retenu pour ce périmètre (Go, comme `stockgo`).

## Ce qui est explicitement hors périmètre (v1)

- **Authentification** : ce service n'a pas de compte utilisateur ni de
  login. Il vérifie les JWT émis par `backend/` (même `JWT_SECRET`) — la
  création de compte (étapes 1-2 du wizard koli-business) doit passer par
  `backend/`'s `/api/auth/register` avant d'appeler ce service.
- **Upload de fichiers** : photo de profil, logo, documents KYC... sont
  uploadés vers `stockgo`, ce service ne reçoit que les URL résultantes.
- **Wallet / escrow / abonnements** : périmètre d'une itération ultérieure,
  volontairement pas construit ici tant que l'onboarding n'est pas branché
  bout en bout.
- **Dashboard marchand post-approbation** (`koli-marchand`) : a son propre
  contrat d'API (déjà mocké côté frontend, `/api/payouts`, `/api/orders`...)
  visant `backend/` sur le port 4000 — sujet distinct, non traité ici.

## Architecture

Même Clean Architecture que `stockgo` : handlers (Gin, HTTP) → services
(logique métier, workflow de statut) → repository (GORM/PostgreSQL),
aucune couche métier ne dépend de Gin ou GORM directement.

```
cmd/server        point d'entrée, composition root
internal/config    configuration (env)
internal/database  connexion + migrations GORM
internal/auth       vérification JWT (compatible backend/)
internal/middleware  auth, erreurs, logs, rate limit
internal/models      Application, StatusEvent
internal/repository  accès données
internal/services    logique métier + workflow
internal/handlers    HTTP (Gin)
internal/routes      assemblage du routeur
```

## Workflow de statut

```
draft → submitted → (pending_review) → approved
                                     ↘ rejected → draft (le marchand corrige et resoumet)
```

Chaque transition est journalisée dans `application_status_events` (qui,
quand, pourquoi) — audit du workflow de validation.

## API

Marchand (JWT `Authorization: Bearer <token>`, émis par `backend/`) :

- `PUT /api/v1/applications/me` — créer/mettre à jour mon brouillon
- `GET /api/v1/applications/me` — consulter ma candidature
- `POST /api/v1/applications/me/submit` — soumettre pour revue

Admin (clé de service `X-API-Key`, koli-admin) :

- `GET /api/v1/admin/applications?status=&page=&limit=` — lister
- `GET /api/v1/admin/applications/:id` — détail
- `POST /api/v1/admin/applications/:id/approve`
- `POST /api/v1/admin/applications/:id/reject` — body `{"reason": "..."}`

## Démarrage local

```bash
cp .env.example .env
# JWT_SECRET doit être identique à backend/.env
make docker-up   # Postgres (port 5434) + service (port 8081)
# ou, avec un Postgres déjà lancé ailleurs :
make run
```

Health check : `GET http://localhost:8080/health`.
