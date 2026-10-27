/* ─────────────────────────────────────────────────────────────
   Recherche de prix sur Internet (Google Shopping via SerpApi), utilisée
   par « Produits à compléter » pour aider à fixer un prix d'achat.

   Configuration (backend/.env) :
     SERPAPI_API_KEY     — clé SerpApi ; absente → isPriceSearchConfigured() false
     PRICE_SEARCH_GL     — pays Google Shopping (défaut "fr")
     PRICE_RATES         — taux vers F CFA, ex. "USD=600,GBP=780,MAD=60"
                           (surcharge les valeurs par défaut ci-dessous)
   Chaque offre garde son prix d'origine (montant + devise) ET sa conversion
   en F CFA. L'euro est à parité fixe (655,957) ; les autres taux sont des
   approximations configurables. Une devise inconnue est écartée, jamais devinée.
───────────────────────────────────────────────────────────── */

const SERPAPI_URL = 'https://serpapi.com/search.json'
const DEFAULT_RATES: Record<string, number> = { XOF: 1, EUR: 655.957, USD: 600, GBP: 780, MAD: 60 }
const MAX_RESULTS = 12

export type PriceOffer = {
  title: string; source: string
  /** Prix d'origine tel qu'exposé en ligne */
  originalAmount: number; currency: string; priceLabel: string
  /** Taux appliqué (1 devise = rate F CFA) et prix converti */
  rate: number; priceFcfa: number
  link: string | null; thumbnail: string | null
}

function rates(): Record<string, number> {
  const out = { ...DEFAULT_RATES }
  for (const part of (process.env.PRICE_RATES ?? '').split(',')) {
    const [cur, val] = part.split('=').map(x => x.trim())
    const n = Number(val)
    if (cur && Number.isFinite(n) && n > 0) out[cur.toUpperCase()] = n
  }
  return out
}

function detectCurrency(label: string): string | null {
  if (/€|\beur\b/i.test(label)) return 'EUR'
  if (/f\s?cfa|xof|\bcfa\b/i.test(label)) return 'XOF'
  if (/£|\bgbp\b/i.test(label)) return 'GBP'
  if (/\bmad\b|\bdh\b/i.test(label)) return 'MAD'
  if (/\$|\busd\b/i.test(label)) return 'USD'
  return null
}

export function isPriceSearchConfigured(): boolean {
  return Boolean(process.env.SERPAPI_API_KEY)
}

/** Convertit un résultat « shopping_results » SerpApi en offre en F CFA, ou null si inexploitable. */
export function toOffer(r: Record<string, unknown>): PriceOffer | null {
  const label = typeof r['price'] === 'string' ? r['price'] : ''
  const amount = typeof r['extracted_price'] === 'number' ? r['extracted_price'] : NaN
  if (!label || !Number.isFinite(amount) || amount <= 0) return null
  const currency = detectCurrency(label)
  const rate = currency ? rates()[currency] : undefined
  if (!currency || !rate) return null
  const priceFcfa = Math.round(amount * rate)
  const link = typeof r['product_link'] === 'string' ? r['product_link'] : typeof r['link'] === 'string' ? r['link'] : null
  return {
    title: String(r['title'] ?? '').slice(0, 200),
    source: String(r['source'] ?? 'Inconnu').slice(0, 80),
    originalAmount: amount, currency, priceLabel: label.slice(0, 40), rate, priceFcfa,
    link: link && /^https?:\/\//.test(link) ? link : null,
    thumbnail: typeof r['thumbnail'] === 'string' && /^https?:\/\//.test(r['thumbnail']) ? r['thumbnail'] : null,
  }
}

export async function searchPrices(query: string): Promise<PriceOffer[]> {
  const params = new URLSearchParams({
    engine: 'google_shopping', q: query, hl: 'fr', gl: process.env.PRICE_SEARCH_GL || 'fr',
    api_key: process.env.SERPAPI_API_KEY ?? '',
  })
  const res = await fetch(`${SERPAPI_URL}?${params}`, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`SerpApi ${res.status}`)
  const json = await res.json() as { shopping_results?: Record<string, unknown>[] }
  return (json.shopping_results ?? [])
    .map(toOffer)
    .filter((o): o is PriceOffer => o !== null)
    .sort((a, b) => a.priceFcfa - b.priceFcfa)
    .slice(0, MAX_RESULTS)
}

/* Cache mémoire 24 h par requête : limite le coût de l'API (quota payant). */
const CACHE_MS = 24 * 3600_000
const cache = new Map<string, { at: number; offers: PriceOffer[] }>()

export async function searchPricesCached(query: string, refresh = false): Promise<{ offers: PriceOffer[]; cached: boolean }> {
  const key = query.toLowerCase()
  const hit = cache.get(key)
  if (hit && !refresh && Date.now() - hit.at < CACHE_MS) return { offers: hit.offers, cached: true }
  const offers = await searchPrices(query)
  cache.set(key, { at: Date.now(), offers })
  return { offers, cached: false }
}
