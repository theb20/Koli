-- AlterTable
ALTER TABLE "users" ADD COLUMN     "hasPassword" BOOLEAN NOT NULL DEFAULT true;

-- Backfill : les comptes clients sans boutique marchande n'ont jamais
-- fourni de mot de passe réel (inscription koili = magic-link/Google
-- uniquement) — le champ "password" en base est un hash aléatoire ou une
-- chaîne vide, jamais connu de l'utilisateur.
UPDATE "users"
SET "hasPassword" = false
WHERE "role" = 'customer'
  AND NOT EXISTS (
    SELECT 1 FROM "seller_stores" WHERE "seller_stores"."userId" = "users"."id"
  );
