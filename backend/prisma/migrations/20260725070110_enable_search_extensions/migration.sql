-- Recherche insensible à la casse ET aux accents ("café" = "cafe"), plus
-- tolérante aux fautes de frappe via similarité trigram — cf. lib/search.ts.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index trigram : indispensable pour que la similarité (fautes de frappe)
-- et les recherches ILIKE '%...%' restent rapides quand le catalogue grossit.
CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_brand_trgm_idx ON products USING gin (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_description_trgm_idx ON products USING gin (description gin_trgm_ops);
