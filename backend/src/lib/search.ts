import { Prisma } from '@prisma/client'
import { prisma } from './prisma'

/**
 * Normalise une requête utilisateur pour une comparaison tolérante :
 * minuscules, accents retirés ("café" → "cafe"), tirets/underscores traités
 * comme des espaces, ponctuation supprimée, espaces multiples réduits.
 * "IPHONE", "iphone", "i-phone" et "Íphônê" se normalisent tous en "iphone".
 * Utilisé pour les comparaisons en mémoire (commandes/clients) — la
 * recherche produit passe par Postgres (unaccent()/pg_trgm, voir
 * searchProductIds) pour rester correcte sur de gros volumes.
 */
export function normalizeSearchQuery(input: string): string {
  return input
    .normalize('NFD').replace(/\p{Mn}/gu, '') // diacritiques (Mn = Mark, nonspacing)
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // ponctuation → espace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * IDs des produits correspondant à une recherche texte libre, triés par
 * pertinence — combine correspondance substring (insensible à la casse et
 * aux accents via unaccent()) et tolérance aux fautes de frappe (similarité
 * trigram, pg_trgm) sur nom/marque/description. `storeId` restreint à la
 * boutique d'un marchand (recherche koli-marchand) ; omis pour le catalogue
 * public (koili).
 */
export async function searchProductIds(
  q: string,
  opts: { storeId?: number; limit?: number } = {},
): Promise<number[]> {
  const query = normalizeSearchQuery(q)
  if (!query) return []

  const storeFilter = opts.storeId !== undefined
    ? Prisma.sql`AND "storeId" = ${opts.storeId}`
    : Prisma.empty

  // word_similarity() (pas similarity()) : compare la requête à la MEILLEURE
  // sous-séquence de mots du texte plutôt qu'à la chaîne entière — sans ça,
  // une requête courte ("lampadaire") obtient un score ridiculement bas
  // contre un nom de produit long et multi-mots, même sans aucune faute de
  // frappe, et la tolérance aux fautes ne sert plus à rien en pratique.
  const rows = await prisma.$queryRaw<{ id: number }[]>`
    SELECT id FROM products
    WHERE (
      unaccent(lower(name)) LIKE unaccent(lower('%' || ${query} || '%'))
      OR unaccent(lower(brand)) LIKE unaccent(lower('%' || ${query} || '%'))
      OR unaccent(lower(coalesce(description, ''))) LIKE unaccent(lower('%' || ${query} || '%'))
      OR word_similarity(unaccent(${query}), unaccent(name)) > 0.4
      OR word_similarity(unaccent(${query}), unaccent(brand)) > 0.4
    )
    ${storeFilter}
    ORDER BY GREATEST(
      word_similarity(unaccent(${query}), unaccent(name)),
      word_similarity(unaccent(${query}), unaccent(brand))
    ) DESC
    LIMIT ${opts.limit ?? 300}
  `
  return rows.map(r => r.id)
}
