/**
 * Scraper — Action (action.com) → Koli DB
 * ────────────────────────────────────────
 * Lit le JSON-LD Product de chaque page produit Action
 * et insère / met à jour le produit dans la base Koli via Prisma.
 *
 * Usage :
 *   npx tsx scripts/scrape-action.ts <url1> [url2] [url3] ...
 *
 * Exemples :
 *   npx tsx scripts/scrape-action.ts \
 *     https://www.action.com/fr-fr/p/3007998/cable-de-charge-et-transfert-de-donnees-sologic-usb-c/
 *
 * Ou depuis un fichier texte (une URL par ligne) :
 *   npx tsx scripts/scrape-action.ts --file urls.txt
 *
 * Options :
 *   --dry-run    Affiche le JSON sans insérer en base
 *   --markup N   Multiplicateur de prix (défaut : 3.5)
 *   --store N    ID du store Prisma à lier (défaut : crée "Action" si absent)
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'

const prisma = new PrismaClient()

/* ── Configuration ─────────────────────────────────────────────── */

const EUR_TO_FCFA = 655.957          // taux fixe XOF/EUR
const DEFAULT_MARKUP = 3.5           // marge appliquée sur le prix Action
const MIN_PRICE_FCFA = 100           // plancher prix

/** Correspondance catégorie Action (slug breadcrumb) → Koli */
const CATEGORY_MAP: Record<string, string> = {
  // High-tech
  multimedia:                  'hightech',
  'cables-et-repartiteur':     'hightech',
  'appareils-photo-et-camera': 'hightech',
  'informatique':              'hightech',
  'telephonie':                'hightech',
  'jeux-video':                'hightech',
  'gaming':                    'hightech',
  'musique-et-son':            'hightech',
  'tv-et-video':               'hightech',
  // Maison
  habitat:                     'maison',
  'salle-de-bain':             'maison',
  cuisine:                     'maison',
  'articles-menagers':         'maison',
  'boites-de-rangement':       'maison',
  'plaids-et-couvertures':     'maison',
  'accessoires-pour-la-maison':'maison',
  jardin:                      'maison',
  eclairage:                   'maison',
  // Beauté
  'hygiene--beaute':           'beaute',
  'hygiene-beaute':            'beaute',
  cosmetiques:                 'beaute',
  parfumerie:                  'beaute',
  // Sport
  'articles-de-sport':         'sport',
  sport:                       'sport',
  // Mode
  vetements:                   'mode',
  chaussures:                  'mode',
  accessoires:                 'mode',
  // Jeux / divertissement
  jouets:                      'jeux',
  hobby:                       'jeux',
  'bricolage-pour-enfants':    'jeux',
  // Divers
  'papeterie--bureau':         'maison',
  'boissons--alimentation':    'maison',
}

/* ── Types ─────────────────────────────────────────────────────── */

interface ActionJsonLd {
  '@type': string
  sku?: string
  name: string
  description?: string
  disambiguatingDescription?: string
  image?: string | string[]
  brand?: { name?: string }
  offers?: {
    price?: string | number
    priceCurrency?: string
    availability?: string
  }
}

interface BreadcrumbJsonLd {
  '@type': string
  itemListElement?: Array<{
    '@type': string
    position: number
    item?: { '@id': string; name: string }
    name?: string
  }>
}

interface KoliProduct {
  name: string
  brand: string
  category: string
  price: number
  oldPrice?: number
  description: string
  images: string[]
  specs: { label: string; value: string }[]
  colors: string[]
  badge: string
  isNew: boolean
  externalSku: string
  sourceUrl: string
}

/* ── Helpers ────────────────────────────────────────────────────── */

/** Arrondit un prix FCFA à la centaine la plus proche ≥ MIN */
function roundFcfa(fcfa: number): number {
  return Math.max(MIN_PRICE_FCFA, Math.round(fcfa / 100) * 100)
}

/** Convertit EUR → FCFA avec marge et arrondi */
function eurToFcfa(eur: number, markup: number): number {
  return roundFcfa(eur * EUR_TO_FCFA * markup)
}

/**
 * Parse la description courte Action en tableau de specs.
 * Format typique : "Label: valeur. Label2: valeur2. ..."
 */
function parseSpecs(description: string): { label: string; value: string }[] {
  const specs: { label: string; value: string }[] = []
  // On split sur ". " puis on cherche "Label: valeur"
  const parts = description.split(/\.\s+/)
  for (const part of parts) {
    const m = part.match(/^([^:]{2,40}):\s*(.+)$/)
    if (m) {
      const label = m[1].trim()
      const value = m[2].trim().replace(/\.$/, '')
      // Exclure "Numéro de l'article" (c'est le SKU)
      if (!/num[eé]ro.*article/i.test(label)) {
        specs.push({ label, value })
      }
    }
  }
  return specs
}

/**
 * Extrait les couleurs depuis les specs (champ "Couleur").
 * Retourne un tableau JSON-stringifiable.
 */
function extractColors(specs: { label: string; value: string }[]): string[] {
  const colorSpec = specs.find(s => /couleur/i.test(s.label))
  if (!colorSpec) return []
  return colorSpec.value
    .split(/,\s*/)
    .map(c => c.trim())
    .filter(Boolean)
}

/** Déduit la catégorie Koli depuis les breadcrumbs Action */
function mapCategory(breadcrumbs: BreadcrumbJsonLd | null, productUrl: string): string {
  if (breadcrumbs?.itemListElement) {
    for (const item of breadcrumbs.itemListElement) {
      const id = item.item?.['@id'] ?? ''
      // Extrait le slug de l'URL: /fr-fr/c/multimedia/cables-et-repartiteur/
      const slugs = id.match(/\/c\/([^/]+(?:\/[^/]+)*)\//)?.[1]?.split('/') ?? []
      for (const slug of slugs) {
        const mapped = CATEGORY_MAP[slug.toLowerCase()]
        if (mapped) return mapped
      }
    }
  }
  // Fallback via l'URL produit
  if (/multimedia|cable|audio|video|photo|inform|teleph|gaming|electron/i.test(productUrl)) return 'hightech'
  if (/sport|fitness|velo|natation/i.test(productUrl))                                      return 'sport'
  if (/beaute|hygiene|cosme|parfum/i.test(productUrl))                                      return 'beaute'
  if (/jouet|jeu|hobby|loisir/i.test(productUrl))                                           return 'jeux'
  if (/mode|vetement|chaussure/i.test(productUrl))                                          return 'mode'
  return 'maison'  // défaut
}

/** Normalise une URL image Action pour obtenir la version haute résolution (1200px) */
function normalizeImageUrl(url: string): string {
  // Si un paramètre de largeur (w_NNN) existe déjà, on le remplace
  if (/\/w_\d+\//.test(url)) {
    return url.replace(/\/w_\d+\//, '/w_1200/')
  }
  // Sinon on l'ajoute après le nom de la transformation Cloudinary
  return url.replace(/\/t_([^/]+)\//, '/t_$1/w_1200/')
}

/* ── Fetch & Parse ──────────────────────────────────────────────── */

/**
 * Tente de fetch l'URL avec plusieurs User-Agents.
 * En cas de 403/captcha, retourne null → on bascule sur --html.
 */
async function tryFetch(url: string): Promise<string | null> {
  const agents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ]
  for (const ua of agents) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': ua,
          'Accept-Language': 'fr-FR,fr;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'no-cache',
        },
      })
      if (res.ok) return res.text()
      if (res.status === 403 || res.status === 429) {
        console.warn(`  ⚠️  HTTP ${res.status} avec UA="${ua.slice(0,40)}…"`)
      }
    } catch { /* essaye le suivant */ }
    await new Promise(r => setTimeout(r, 500))
  }
  return null
}

async function fetchActionProduct(url: string, markup: number, localHtml?: string): Promise<KoliProduct | null> {
  console.log(`\n  📥 ${localHtml ? 'Parsing HTML local' : `Fetching ${url}`}`)

  let html: string
  if (localHtml) {
    html = localHtml
  } else {
    const fetched = await tryFetch(url)
    if (!fetched) {
      console.error(`  ❌ Impossible de récupérer la page (bot-protection).`)
      console.error(`     💡 Astuce : enregistrez la page dans le navigateur`)
      console.error(`        (Ctrl+S → "Page Web complète") puis utilisez --html fichier.html`)
      return null
    }
    html = fetched
  }

  // Extrait tous les blocs JSON-LD
  const jsonLdBlocks: unknown[] = []
  const re = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      jsonLdBlocks.push(JSON.parse(m[1]))
    } catch { /* ignore malformed blocks */ }
  }

  // Cherche le bloc Product
  const productLd = jsonLdBlocks.find(
    b => (b as ActionJsonLd)['@type'] === 'Product'
  ) as ActionJsonLd | undefined

  if (!productLd) {
    console.error('  ❌ Aucun JSON-LD Product trouvé dans la page')
    return null
  }

  // Cherche le bloc BreadcrumbList
  const breadcrumbLd = (jsonLdBlocks.find(
    b => (b as BreadcrumbJsonLd)['@type'] === 'BreadcrumbList'
  ) ?? null) as BreadcrumbJsonLd | null

  /* ── Prix ── */
  const priceEur = parseFloat(String(productLd.offers?.price ?? '0'))
  if (!priceEur) {
    console.warn('  ⚠️  Prix introuvable ou nul')
  }
  const priceFcfa    = eurToFcfa(priceEur, markup)
  const oldPriceFcfa = priceEur > 0
    ? roundFcfa(priceFcfa * 1.25)   // ancien prix fictif +25%
    : undefined

  /* ── Images ── */
  const rawImages: string[] = Array.isArray(productLd.image)
    ? productLd.image
    : productLd.image ? [productLd.image] : []
  const images = rawImages.map(normalizeImageUrl).slice(0, 6)

  /* ── Specs ── */
  const specs = parseSpecs(productLd.description ?? '')

  /* ── Couleurs ── */
  const colors = extractColors(specs)

  /* ── Catégorie ── */
  const category = mapCategory(breadcrumbLd, url)

  /* ── Badge ── */
  const badge = priceEur <= 1 ? 'hot' : priceEur <= 3 ? 'sale' : 'new'

  /* ── SKU / URL source ── */
  const externalSku = productLd.sku ?? url.match(/\/p\/(\d+)\//)?.[1] ?? ''

  return {
    name:        productLd.name,
    brand:       productLd.brand?.name ?? 'Action',
    category,
    price:       priceFcfa,
    oldPrice:    oldPriceFcfa,
    description: productLd.disambiguatingDescription ?? productLd.description ?? '',
    images,
    specs,
    colors,
    badge,
    isNew:       false,
    externalSku,
    sourceUrl:   url,
  }
}

/* ── Upsert Prisma ──────────────────────────────────────────────── */

async function upsertProduct(p: KoliProduct, storeId: number): Promise<number> {
  // Recherche par SKU dans le nom ou description (pas de champ dédié dans le schema)
  // On cherche un produit existant avec le même nom exact
  const existing = await prisma.product.findFirst({
    where: { name: p.name },
    select: { id: true },
  })

  const data = {
    name:        p.name,
    brand:       p.brand,
    category:    p.category,
    price:       p.price,
    oldPrice:    p.oldPrice ?? null,
    description: `[Action #${p.externalSku}]\n\n${p.description}`,
    colors:      p.colors.length ? JSON.stringify(p.colors) : null,
    badge:       p.badge,
    isNew:       p.isNew,
    isActive:    true,
    storeId,
    stock:       Math.floor(Math.random() * 50) + 20,  // stock fictif
    rating:      +(Math.random() * 1.5 + 3.5).toFixed(1),
    reviews:     Math.floor(Math.random() * 200) + 10,
    sold:        Math.floor(Math.random() * 500) + 50,
  }

  let productId: number

  if (existing) {
    await prisma.product.update({ where: { id: existing.id }, data })
    productId = existing.id
    console.log(`  ✏️  Mis à jour : id=${productId}`)
  } else {
    const created = await prisma.product.create({ data })
    productId = created.id
    console.log(`  ✅ Créé : id=${productId}`)
  }

  // Supprime et recrée les images
  await prisma.productImage.deleteMany({ where: { productId } })
  if (p.images.length) {
    await prisma.productImage.createMany({
      data: p.images.map((url, i) => ({ productId, url, position: i })),
    })
    console.log(`  🖼️  ${p.images.length} image(s) insérée(s)`)
  }

  // Supprime et recrée les specs
  await prisma.productSpec.deleteMany({ where: { productId } })
  if (p.specs.length) {
    await prisma.productSpec.createMany({
      data: p.specs.map((s, i) => ({
        productId,
        label:    s.label,
        value:    s.value,
        position: i,
      })),
    })
    console.log(`  📋 ${p.specs.length} spec(s) insérée(s)`)
  }

  return productId
}

/* ── Store helper ───────────────────────────────────────────────── */

async function getOrCreateActionStore(): Promise<number> {
  let store = await prisma.store.findFirst({ where: { name: 'Action' } })
  if (!store) {
    store = await prisma.store.create({
      data: {
        name:        'Action',
        description: 'Produits importés depuis action.com',
        website:     'https://www.action.com/fr-fr/',
        isActive:    true,
      },
    })
    console.log(`🏪 Store "Action" créé (id=${store.id})`)
  }
  return store.id
}

/* ── CLI ────────────────────────────────────────────────────────── */

async function main() {
  const args = process.argv.slice(2)

  const dryRun    = args.includes('--dry-run')
  const fileIdx   = args.indexOf('--file')
  const htmlIdx   = args.indexOf('--html')     // fichier HTML local
  const jsonIdx   = args.indexOf('--json-ld')  // coller le JSON-LD directement
  const markupIdx = args.indexOf('--markup')
  const storeIdx  = args.indexOf('--store')
  const urlArg    = args.indexOf('--url')

  const markup   = markupIdx >= 0 ? parseFloat(args[markupIdx + 1]) : DEFAULT_MARKUP
  const storeArg = storeIdx  >= 0 ? parseInt(args[storeIdx + 1])    : null

  /* ── Mode --html : parse un fichier HTML local ── */
  if (htmlIdx >= 0) {
    const htmlFile  = args[htmlIdx + 1]
    const sourceUrl = urlArg >= 0 ? args[urlArg + 1] : 'https://www.action.com/'
    const localHtml = readFileSync(htmlFile, 'utf-8')

    console.log(`\n🚀 Koli × Action Scraper (mode HTML local)`)
    console.log(`   Fichier   : ${htmlFile}`)
    console.log(`   Markup    : ${markup}x`)
    console.log(`   Dry-run   : ${dryRun}`)
    console.log(`   ─────────────────────────────`)

    const storeId = dryRun ? 0 : (storeArg ?? await getOrCreateActionStore())
    const product = await fetchActionProduct(sourceUrl, markup, localHtml)
    if (!product) { console.error('❌ Parsing échoué'); process.exit(1) }

    console.log(`\n  📦 ${product.name}`)
    console.log(`     Marque   : ${product.brand}`)
    console.log(`     Catég.   : ${product.category}`)
    console.log(`     Prix     : ${product.price.toLocaleString('fr-FR')} FCFA`)
    if (product.oldPrice)
      console.log(`     Barré    : ${product.oldPrice.toLocaleString('fr-FR')} FCFA`)
    console.log(`     Images   : ${product.images.length}`)
    console.log(`     Specs    : ${product.specs.map(s => `${s.label}: ${s.value}`).join(' | ')}`)
    console.log(`     Couleurs : ${product.colors.join(', ') || '—'}`)

    if (dryRun) {
      console.log('\n  ── DRY RUN — JSON complet ──')
      console.log(JSON.stringify(product, null, 2))
    } else {
      await upsertProduct(product, storeId)
    }
    console.log('\n✅ Terminé')
    return
  }

  /* ── Mode --json-ld : JSON-LD passé en argument (utile pour tests) ── */
  if (jsonIdx >= 0) {
    const jsonStr   = args[jsonIdx + 1]
    const sourceUrl = urlArg >= 0 ? args[urlArg + 1] : 'https://www.action.com/'
    // Wrapping dans un HTML minimal
    const fakeHtml  = `<html><body><script type="application/ld+json">${jsonStr}</script></body></html>`

    console.log(`\n🚀 Koli × Action Scraper (mode JSON-LD)`)
    const storeId = dryRun ? 0 : (storeArg ?? await getOrCreateActionStore())
    const product = await fetchActionProduct(sourceUrl, markup, fakeHtml)
    if (!product) { console.error('❌ Parsing échoué'); process.exit(1) }

    console.log(`  📦 ${product.name}`)
    if (dryRun) {
      console.log(JSON.stringify(product, null, 2))
    } else {
      await upsertProduct(product, storeId)
    }
    return
  }

  /* ── Mode URL(s) directes ── */
  let urls: string[] = []
  if (fileIdx >= 0) {
    const file = args[fileIdx + 1]
    urls = readFileSync(file, 'utf-8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.startsWith('http'))
  }
  const directUrls = args.filter(a => a.startsWith('http'))
  urls = [...urls, ...directUrls]

  if (!urls.length) {
    console.error(`
Usage :
  # Depuis des URLs (peut être bloqué par anti-bot)
  npx tsx scripts/scrape-action.ts <url1> [url2] ...

  # Depuis un fichier HTML sauvegardé dans le navigateur (Ctrl+S)
  npx tsx scripts/scrape-action.ts --html page.html --url <url-source> [--dry-run]

  # Depuis un fichier de JSON-LD copié depuis le code source
  npx tsx scripts/scrape-action.ts --json-ld '<json>' --url <url-source>

  # Options communes
  --dry-run        Affiche sans insérer en base
  --markup 3.5     Multiplicateur EUR→FCFA (défaut 3.5)
  --store 1        ID du store Prisma (créé auto si absent)
  --file urls.txt  Fichier d'URLs (une par ligne)
`)
    process.exit(1)
  }

  console.log(`\n🚀 Koli × Action Scraper`)
  console.log(`   URLs      : ${urls.length}`)
  console.log(`   Markup    : ${markup}x  (EUR × ${EUR_TO_FCFA} × ${markup})`)
  console.log(`   Dry-run   : ${dryRun}`)
  console.log(`   ─────────────────────────────`)

  const storeId = dryRun ? 0 : (storeArg ?? await getOrCreateActionStore())

  let ok = 0, ko = 0

  for (const url of urls) {
    const product = await fetchActionProduct(url, markup)
    if (!product) { ko++; continue }

    console.log(`\n  📦 ${product.name}`)
    console.log(`     Marque   : ${product.brand}`)
    console.log(`     Catég.   : ${product.category}`)
    console.log(`     Prix     : ${product.price.toLocaleString('fr-FR')} FCFA`)
    if (product.oldPrice)
      console.log(`     Barré    : ${product.oldPrice.toLocaleString('fr-FR')} FCFA`)
    console.log(`     Images   : ${product.images.length}`)
    console.log(`     Specs    : ${product.specs.length}`)
    console.log(`     Couleurs : ${product.colors.join(', ') || '—'}`)

    if (dryRun) {
      console.log('\n  ── DRY RUN — objet complet ──')
      console.log(JSON.stringify(product, null, 2))
      ok++
      continue
    }

    try {
      await upsertProduct(product, storeId)
      ok++
    } catch (e) {
      console.error(`  ❌ Erreur DB : ${(e as Error).message}`)
      ko++
    }

    if (urls.indexOf(url) < urls.length - 1) {
      await new Promise(r => setTimeout(r, 1200 + Math.random() * 800))
    }
  }

  console.log(`\n✅ Terminé — ${ok} importé(s), ${ko} erreur(s)`)
}

main()
  .catch(err => { console.error('❌', err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
