# 🛍 Koli API — Backend

API REST Node.js + TypeScript + Prisma pour la plateforme e-commerce Koli.

## Stack technique

| Couche       | Technologie            |
|-------------|------------------------|
| Runtime     | Node.js 20+            |
| Langage     | TypeScript 5           |
| Framework   | Express.js 4           |
| ORM         | Prisma 5               |
| DB (dev)    | SQLite                 |
| DB (prod)   | PostgreSQL             |
| Auth        | JWT (access + refresh) |
| Validation  | Zod                    |
| Sécurité    | Helmet, CORS, Rate-limit |
| Email       | Nodemailer (Gmail SMTP)|

## Installation

```bash
cd backend
npm install
cp .env.example .env    # configurer les variables

# Créer la base de données et le schéma
npm run db:push

# Insérer les données initiales (produits + admin + promos)
npm run db:seed

# Démarrer en développement (hot reload)
npm run dev
```

## Variables d'environnement (.env)

```env
PORT=4000
DATABASE_URL="file:./dev.db"          # SQLite dev
JWT_SECRET="changez-en-production"
FRONTEND_URL="http://localhost:5173"
SMTP_USER="votre@gmail.com"
SMTP_PASS="votre-mot-de-passe-app"
```

## Comptes de test (après seed)

| Rôle    | Email              | Mot de passe     |
|---------|--------------------|------------------|
| Admin   | admin@koli.cm      | Admin@Koli2026   |
| Client  | test@koli.cm       | Test@1234        |

## Codes promo disponibles

| Code       | Réduction | Minimum       |
|------------|-----------|---------------|
| KOLI10     | -10%      | Aucun         |
| BIENVENUE  | -10%      | Aucun         |
| FLASH50    | -5000 FCFA| 50 000 FCFA   |
| NOEL2026   | -20%      | 100 000 FCFA  |

## Routes API

### Auth — `/api/auth`
```
POST   /register          Inscription
POST   /login             Connexion
POST   /logout            Déconnexion
POST   /refresh           Rafraîchir le token
GET    /me                Profil courant          [Auth]
PUT    /profile           Mettre à jour le profil [Auth]
PUT    /password          Changer le mot de passe [Auth]
GET    /sessions          Mes sessions actives    [Auth]
DELETE /sessions/:id      Révoquer une session    [Auth]
```

### Produits — `/api/products`
```
GET    /                  Liste (filtres: category, q, sort, minPrice, maxPrice, badge, inStock, page, limit)
GET    /featured          Produits mis en avant (hot, new, topRated)
GET    /:id               Détail produit + similaires + wishlist
POST   /                  Créer un produit        [Admin]
PUT    /:id               Modifier un produit     [Admin]
DELETE /:id               Désactiver un produit   [Admin]
```

### Commandes — `/api/orders`
```
POST   /                  Passer une commande     [Optionnel Auth]
GET    /                  Mes commandes           [Auth]
GET    /:id               Détail commande         [Auth]
PUT    /:id/cancel        Annuler une commande    [Auth]
PUT    /:id/status        Changer le statut       [Admin]
GET    /admin/all         Toutes les commandes    [Admin]
```

### Adresses — `/api/addresses`
```
GET    /                  Mes adresses            [Auth]
POST   /                  Ajouter une adresse     [Auth]
PUT    /:id               Modifier une adresse    [Auth]
PUT    /:id/default       Définir par défaut      [Auth]
DELETE /:id               Supprimer               [Auth]
```

### Wishlist — `/api/wishlist`
```
GET    /                  Mes favoris             [Auth]
POST   /:productId        Ajouter aux favoris     [Auth]
DELETE /:productId        Retirer des favoris     [Auth]
DELETE /                  Vider les favoris       [Auth]
```

### Avis — `/api/reviews`
```
GET    /product/:id       Avis d'un produit
POST   /                  Publier un avis         [Auth]
PUT    /:id               Modifier mon avis       [Auth]
DELETE /:id               Supprimer mon avis      [Auth]
POST   /:id/helpful       Marquer utile
```

### Contact — `/api/contact`
```
POST   /                  Envoyer un message
GET    /                  Tous les messages       [Admin]
PUT    /:id/status        Changer le statut       [Admin]
```

### Codes promo — `/api/promo`
```
GET    /:code             Valider un code (?total=montant)
POST   /                  Créer un code           [Admin]
GET    /                  Lister les codes        [Admin]
DELETE /:id               Désactiver un code      [Admin]
```

### Notifications — `/api/notifications`
```
GET    /                  Mes notifications       [Auth]
PUT    /:id/read          Marquer comme lu        [Auth]
PUT    /read-all          Tout marquer lu         [Auth]
DELETE /:id               Supprimer               [Auth]
```

### Blog — `/api/blog`
```
GET    /                  Liste articles publiés (filtres: category, q, page)
GET    /:slug             Article + articles liés
POST   /:slug/like        Liker un article
POST   /                  Créer un article        [Admin]
PUT    /:id               Modifier un article     [Admin]
DELETE /:id               Supprimer un article    [Admin]
```

### Health
```
GET    /health            Statut du serveur
```

## Scripts

```bash
npm run dev          # Développement avec hot reload
npm run build        # Compilation TypeScript
npm run start        # Production (après build)
npm run db:push      # Synchroniser le schéma Prisma
npm run db:migrate   # Créer une migration nommée
npm run db:seed      # Insérer les données initiales
npm run db:reset     # Reset DB + seed
npm run db:studio    # Ouvrir Prisma Studio (GUI)
npm run lint         # Vérification TypeScript
```

## Passage en production (PostgreSQL)

1. Créer une base PostgreSQL (Railway, Supabase, Neon, etc.)
2. Modifier `.env` :
   ```env
   DATABASE_URL="postgresql://user:pass@host:5432/koli_db"
   NODE_ENV=production
   JWT_SECRET="secret-long-et-aleatoire-minimum-32-chars"
   FRONTEND_URL="https://koli.cm"
   ```
3. Modifier `prisma/schema.prisma` : `provider = "postgresql"`
4. ```bash
   npm run db:migrate  # Créer la migration initiale
   npm run db:seed     # Insérer les données
   npm run build && npm start
   ```
npx sqlite3 prisma/dev.db .dump > export_koli.sql