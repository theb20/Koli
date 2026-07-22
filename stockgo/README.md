# Stockgo — Storage Service

Service de stockage de fichiers indépendant, en Go, inspiré de Backblaze B2
mais réduit aux fonctionnalités essentielles : upload, téléchargement,
métadonnées, suppression, listing paginé. Conçu pour être consommé
exclusivement par l'application e-commerce Skignas via une API REST, sans
lui être couplé.

## Sommaire

- [Architecture](#architecture)
- [Structure du projet](#structure-du-projet)
- [Démarrage local](#démarrage-local)
- [Configuration](#configuration)
- [API](#api)
- [Sécurité](#sécurité)
- [Évolutivité du stockage](#évolutivité-du-stockage)
- [Déploiement Railway](#déploiement-railway)

## Architecture

Clean Architecture — les dépendances pointent vers l'intérieur : les
handlers dépendent des services, les services dépendent des interfaces
`repository`/`storage`, jamais l'inverse. Aucune couche métier ne connaît
Gin, GORM ou le système de fichiers directement.

```
┌─────────────────────────────────────────────────────────────┐
│                         cmd/server                          │
│                    (composition root)                       │
└───────────────────────────┬─────────────────────────────────┘
                             │ injecte
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  handlers/  →  Gin, HTTP in/out, jamais de logique métier    │
└───────────────────────────┬─────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  services/  →  logique métier (validation, checksum, flux)   │
└───────────┬─────────────────────────────────┬───────────────┘
            ▼                                 ▼
┌───────────────────────┐          ┌───────────────────────────┐
│  repository/           │          │  storage/ (interface)     │
│  → métadonnées (GORM)  │          │  → contenu binaire         │
│  → PostgreSQL           │          │  → local aujourd'hui,      │
│                          │          │    S3/R2/B2/... demain     │
└───────────────────────┘          └───────────────────────────┘
```

Flux d'un upload :

```
Client → POST /api/v1/files (multipart)
       → middleware auth (X-API-Key ou JWT)
       → middleware rate limit
       → handlers.Upload
       → services.Upload
           ├─ validation (extension, MIME, taille, nom de bucket)
           ├─ génère un nom physique opaque (UUID + timestamp + ext)
           ├─ écrit en streaming vers storage.Storage
           │    (fichier temporaire + rename atomique)
           ├─ calcule le SHA256 pendant l'écriture (io.TeeReader,
           │   jamais de second passage ni de chargement mémoire complet)
           └─ enregistre les métadonnées via repository.FileRepository
       ← 201 { id, filename, size, mime, url, created_at }
```

## Structure du projet

```
cmd/server/        Point d'entrée — assemble la config, la DB, le stockage,
                    les services, les handlers, les routes, et gère l'arrêt
                    propre (graceful shutdown) sur SIGINT/SIGTERM.

internal/config/    Chargement de la configuration (Viper) depuis les
                    variables d'environnement, avec valeurs par défaut.

internal/database/  Connexion PostgreSQL (GORM) + AutoMigrate.

internal/models/    Entités persistées — uniquement `File` ici.

internal/storage/   Interface Storage (Upload/Download/Delete/Exists/
                    GetMetadata) + implémentation locale sur disque
                    (Volume Railway en prod). Voir "Évolutivité".

internal/repository/ Accès aux métadonnées en base — CRUD + listing avec
                    pagination/recherche/tri/filtre, derrière une interface
                    (FileRepository) pour rester testable sans DB réelle.

internal/services/  Logique métier : validation, génération de nom physique,
                    calcul de checksum en streaming, orchestration
                    storage + repository, nettoyage en cas d'échec partiel.

internal/handlers/  Handlers Gin — traduisent HTTP ↔ appels de service,
                    portent les annotations Swagger.

internal/middleware/ Auth (JWT + clé API), rate limiting par IP, logs de
                    requêtes structurés, récupération de panique, réponses
                    d'erreur centralisées.

internal/validation/ Whitelists d'extensions/MIME types, contrôle de
                    taille, validation du nom de bucket (anti path
                    traversal en amont du stockage).

internal/auth/      Génération et validation des JWT (HS256).

internal/routes/     Assemblage du routeur Gin (middlewares globaux +
                    groupes de routes).

internal/utils/     Logger Zap, type d'erreur applicatif (`AppError`).

docs/               Documentation Swagger générée (`make swagger`).

migrations/         Réservé à des migrations SQL manuelles si besoin un
                    jour (AutoMigrate suffit à ce stade).

scripts/            Scripts utilitaires (vide pour l'instant).
```

## Démarrage local

### Option A — Postgres local (sans Docker)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb stockgo_dev

cp .env.example .env   # ajuster DATABASE_URL si besoin

go mod download
make run                # ou `make dev` avec air pour le hot-reload
```

Le serveur écoute sur `http://localhost:8080`. Documentation interactive :
`http://localhost:8080/swagger/index.html`.

### Option B — Docker Compose (service + Postgres)

```bash
make docker-up
```

## Configuration

Toutes les variables sont lues depuis l'environnement (voir `.env.example`) :

| Variable           | Description                                         |
|---------------------|------------------------------------------------------|
| `PORT`              | Port d'écoute HTTP                                    |
| `ENV`                | `development` ou `production`                        |
| `DATABASE_URL`       | DSN PostgreSQL                                        |
| `JWT_SECRET`         | Secret de signature HS256 des JWT                     |
| `API_KEY`            | Clé statique pour l'auth service-à-service            |
| `STORAGE_PATH`       | Répertoire racine de stockage (Volume Railway en prod)|
| `MAX_UPLOAD_SIZE`    | Taille max d'un fichier, en octets                    |
| `PUBLIC_URL`         | URL publique utilisée pour construire les liens        |
| `RATE_LIMIT_RPS`     | Requêtes/seconde autorisées par IP                     |
| `RATE_LIMIT_BURST`   | Rafale autorisée au-delà du débit soutenu              |

## API

Toutes les routes `/api/v1/*` exigent une authentification : soit un header
`X-API-Key: <clé>` (cas d'usage principal — l'app e-commerce comme unique
cliente), soit `Authorization: Bearer <jwt>`.

| Méthode | Route                     | Description                          |
|---------|---------------------------|---------------------------------------|
| POST    | `/api/v1/files`            | Upload (multipart/form-data, champ `file`, `bucket` et `visibility` optionnels) |
| GET     | `/api/v1/files/:id`        | Téléchargement (streaming)            |
| GET     | `/api/v1/files/:id/info`   | Métadonnées (taille, mime, checksum...) |
| DELETE  | `/api/v1/files/:id`        | Suppression (soft delete en base + suppression physique) |
| GET     | `/api/v1/files`             | Liste paginée — `page`, `limit`, `search`, `sort_by`, `sort_dir`, `mime_type`, `bucket` |

Documentation complète et testable : Swagger UI à `/swagger/index.html`
(régénérée via `make swagger` après modification des annotations).

## Sécurité

- Whitelist stricte d'extensions **et** de types MIME (les deux doivent
  correspondre — un fichier ne peut pas mentir sur les deux à la fois de
  façon cohérente).
- Taille maximale appliquée à deux niveaux : contrôle déclaratif en amont
  (taille annoncée du fichier) et limite dure sur le corps de la requête
  HTTP (`http.MaxBytesReader`), qui coupe la connexion si dépassée même si
  la taille annoncée était fausse.
- Nom physique du fichier toujours généré côté serveur (UUID + timestamp +
  extension) — jamais dérivé du nom fourni par le client.
- Protection anti path-traversal à deux niveaux : validation du nom de
  bucket en amont (`internal/validation`), puis résolution de chemin
  vérifiée dans `internal/storage/local.go` (le chemin final doit rester
  sous la racine de stockage, sinon la requête est refusée).
- Checksum SHA256 calculé et stocké pour chaque fichier, vérifiable via
  `GET /files/:id/info`.
- Authentification obligatoire sur toutes les routes de fichiers.
- Rate limiting par IP (token bucket, nettoyage périodique des entrées
  inactives pour éviter une fuite mémoire).
- Logs structurés de chaque upload/suppression (Zap).
- Écriture atomique sur disque (fichier temporaire + `rename`) — un lecteur
  concurrent ne peut jamais voir un fichier partiellement écrit.

## Évolutivité du stockage

Le moteur de stockage est entièrement caché derrière l'interface
`storage.Storage` :

```go
type Storage interface {
    Upload(ctx context.Context, bucket, key string, reader io.Reader) (int64, error)
    Download(ctx context.Context, bucket, key string) (io.ReadCloser, error)
    Delete(ctx context.Context, bucket, key string) error
    Exists(ctx context.Context, bucket, key string) (bool, error)
    GetMetadata(ctx context.Context, bucket, key string) (Metadata, error)
}
```

`internal/storage/local.go` est l'unique implémentation aujourd'hui. Pour
brancher S3, Cloudflare R2, Backblaze B2, MinIO ou Wasabi plus tard : créer
une nouvelle implémentation de cette interface (ex: `internal/storage/s3.go`,
tous compatibles avec le SDK S3 standard) et l'injecter dans `cmd/server/main.go`
à la place de `NewLocalStorage(...)`. **Aucune ligne de `services/`,
`handlers/` ou `repository/` n'a besoin de changer.**

## Déploiement Railway

1. Créer un service Railway pointant sur ce dossier, avec le `Dockerfile`
   fourni.
2. Attacher un **Volume Railway** monté sur `/storage` (correspond à
   `STORAGE_PATH=/storage` en production).
3. Ajouter un plugin PostgreSQL Railway et référencer `DATABASE_URL` généré
   automatiquement.
4. Définir `JWT_SECRET`, `API_KEY` (valeurs fortes, générées aléatoirement),
   `PUBLIC_URL` (domaine public du service), `ENV=production`.
5. Le `HEALTHCHECK` du Dockerfile (`/health`) permet à Railway de détecter
   un déploiement sain.
