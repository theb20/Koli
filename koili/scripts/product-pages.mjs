/**
 * Pages produit pré-générées pour les APERÇUS DE PARTAGE (Open Graph).
 *
 * Les robots de WhatsApp, Facebook, X, LinkedIn… n'exécutent pas le
 * JavaScript : sur /catalogue/:id ils ne voyaient que le fallback générique
 * (200.html) et affichaient l'image globale du site. Ce script, lancé après
 * le pré-rendu, écrit pour chaque produit en ligne un fichier
 * dist/catalogue/<id>.html : copie de 200.html dont les balises <title>,
 * description, canonical, og:* et twitter:* décrivent CE produit. Firebase
 * sert ce fichier en priorité (cleanUrls) ; le JavaScript prend ensuite le
 * relais comme d'habitude pour un vrai visiteur.
 *
 * Limite : un produit créé après la publication garde l'aperçu générique
 * jusqu'à la suivante. Si l'API est injoignable, le build continue sans
 * ces pages (aperçus génériques, comme avant) — avec un avertissement.
 *
 * API lue : OG_API_URL (prioritaire, ex. API de test locale) sinon
 * VITE_API_URL du mode production.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const SITE = 'https://skignas.com'
const API = (process.env.OG_API_URL || loadEnv('production', ROOT, '').VITE_API_URL || '').replace(/\/$/, '')

const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const clean = s => String(s ?? '').replace(/\s+/g, ' ').trim()
/** Même empreinte que le backend (lib/ogImage.ts) : change quand la photo change. */
const version = url => createHash('sha1').update(url).digest('hex').slice(0, 12)

function truncate(text, max) {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`
}

/** Remplace la valeur d'une balise existante du modèle ; échoue bruyamment si elle a disparu. */
function setTag(html, re, replacement, label) {
  if (!re.test(html)) throw new Error(`Balise introuvable dans 200.html : ${label}`)
  return html.replace(re, replacement)
}

async function fetchProducts() {
  const all = []
  for (let page = 1; page <= 100; page++) {
    const res = await fetch(`${API}/api/products?limit=200&page=${page}`, { signal: AbortSignal.timeout(15_000) })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const { data } = await res.json()
    all.push(...data.products)
    if (!data.pagination?.hasNext) break
  }
  return all
}

function productPage(template, p) {
  const name = clean(p.name)
  const title = `${name} — Skignas`
  const description = truncate(clean(p.description) || `${name}${p.brand ? ` (${clean(p.brand)})` : ''} — disponible sur Skignas, livraison partout en Côte d'Ivoire.`, 155)
  const url = `${SITE}/catalogue/${p.id}`
  const source = p.images?.[0]?.url
  const image = source ? `${API}/api/products/${p.id}/og-image.jpg?v=${version(source)}` : `${SITE}/wall/og-image.jpg`
  const price = p.salePrice && p.saleEndsAt && new Date(p.saleEndsAt) > new Date() && (!p.saleStartsAt || new Date(p.saleStartsAt) <= new Date()) ? p.salePrice : p.price

  let html = template
  html = setTag(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`, 'title')
  html = setTag(html, /<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(description)}" />`, 'description')
  html = setTag(html, /<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`, 'canonical')
  const og = {
    'og:type': 'product', 'og:title': name, 'og:description': description, 'og:url': url,
    'og:image': image, 'og:image:secure_url': image, 'og:image:type': 'image/jpeg',
    'og:image:width': '1200', 'og:image:height': '630', 'og:image:alt': name,
  }
  for (const [k, v] of Object.entries(og)) {
    html = setTag(html, new RegExp(`<meta property="${k}" content="[^"]*" />`), `<meta property="${k}" content="${esc(v)}" />`, k)
  }
  const tw = { 'twitter:title': name, 'twitter:description': description, 'twitter:image': image, 'twitter:image:alt': name }
  for (const [k, v] of Object.entries(tw)) {
    html = setTag(html, new RegExp(`<meta name="${k}" content="[^"]*" />`), `<meta name="${k}" content="${esc(v)}" />`, k)
  }
  // Prix (balises produit Open Graph, lues par Facebook/Messenger)
  html = html.replace('<meta property="og:locale" content="fr_FR" />',
    `<meta property="og:locale" content="fr_FR" />\n  <meta property="product:price:amount" content="${Math.round(price)}" />\n  <meta property="product:price:currency" content="XOF" />`)
  return html
}

async function main() {
  const templatePath = join(DIST, '200.html')
  if (!existsSync(templatePath)) throw new Error('dist/200.html absent : lancer après le pré-rendu')
  if (!API) { console.warn('⚠ Pages produit non générées : VITE_API_URL / OG_API_URL absent'); return }
  const template = readFileSync(templatePath, 'utf-8')

  let products
  try {
    products = await fetchProducts()
  } catch (err) {
    console.warn(`⚠ Pages produit non générées (API ${API} injoignable : ${err.message}) — les aperçus de partage resteront génériques`)
    return
  }
  mkdirSync(join(DIST, 'catalogue'), { recursive: true })
  for (const p of products) writeFileSync(join(DIST, 'catalogue', `${p.id}.html`), productPage(template, p))
  console.log(`✓ ${products.length} page(s) produit pour les aperçus de partage (API ${API})`)
}

main().catch(err => {
  // Une balise disparue de index.html est une vraie régression : on bloque le build
  console.error('✗ Échec de la génération des pages produit :', err.message)
  process.exit(1)
})
