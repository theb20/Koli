-- Prix par défaut de l'option "Assistance technique" : 10 000 FCFA
ALTER TABLE "products" ALTER COLUMN "assistancePrice" SET DEFAULT 10000;

-- Produits existants sans prix : pré-remplis à 10 000 (l'option reste
-- désactivée — assistanceEnabled inchangé, aucun effet côté client).
UPDATE "products" SET "assistancePrice" = 10000 WHERE "assistancePrice" IS NULL;
