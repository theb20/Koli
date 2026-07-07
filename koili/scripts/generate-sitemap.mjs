/**
 * Génère public/sitemap.xml à partir des vraies données (produits actifs,
 * articles publiés, catégories) juste avant chaque build — exécuté en
 * "prebuild" (voir package.json). Toujours interroge l'API de production,
 * indépendamment de VITE_API_URL en local.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const API_URL  = 'https://skignas.up.railway.app'
const SITE_URL = 'https://skignas.com'
const today    = new Date().toISOString().slice(0, 10)

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH  = resolve(__dirname, '../public/sitemap.xml')

async function fetchAllPages(path, key, limit = 100) {
  const items = []
  let page = 1
  for (;;) {
    const res = await fetch(`${API_URL}${path}?page=${page}&limit=${limit}`)
    if (!res.ok) break
    const json = await res.json()
    const batch = json?.data?.[key] ?? []
    items.push(...batch)
    const pagination = json?.data?.pagination
    if (!pagination || page >= pagination.totalPages) break
    page++
  }
  return items
}

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function urlEntry({ loc, lastmod, changefreq, priority, image }) {
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${image ? `
    <image:image>
      <image:loc>${xmlEscape(image)}</image:loc>
    </image:image>` : ''}
  </url>`
}

async function main() {
  console.log('→ Génération du sitemap depuis', API_URL)

  const [products, posts, categories] = await Promise.all([
    fetchAllPages('/api/products', 'products', 200).catch(() => []),
    fetchAllPages('/api/blog', 'posts', 100).catch(() => []),
    fetch(`${API_URL}/api/categories`).then(r => r.ok ? r.json() : { data: [] }).then(j => j.data ?? []).catch(() => []),
  ])

  console.log(`  ${products.length} produits, ${posts.length} articles, ${categories.length} catégories`)

  const staticPages = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0', image: `${SITE_URL}/wall/og-home.jpg` },
    { loc: `${SITE_URL}/catalogue`, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_URL}/nouveautes`, changefreq: 'daily', priority: '0.8' },
    { loc: `${SITE_URL}/ventes-flash`, changefreq: 'daily', priority: '0.8' },
    { loc: `${SITE_URL}/blog`, changefreq: 'weekly', priority: '0.7', image: `${SITE_URL}/wall/og-blog.jpg` },
    { loc: `${SITE_URL}/about`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${SITE_URL}/contact`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_URL}/aide`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_URL}/cgu`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/legal`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/privacy`, changefreq: 'yearly', priority: '0.3' },
  ].map(p => urlEntry({ ...p, lastmod: today }))

  const categoryPages = categories.map(c => urlEntry({
    loc: `${SITE_URL}/catalogue?cat=${c.slug}`,
    lastmod: today, changefreq: 'weekly', priority: '0.8',
  }))

  const productPages = products.map(p => urlEntry({
    loc: `${SITE_URL}/catalogue/${p.id}`,
    lastmod: today, changefreq: 'weekly', priority: '0.7',
    image: p.images?.[0]?.url,
  }))

  const blogPages = posts.map(p => urlEntry({
    loc: `${SITE_URL}/blog/${p.slug}`,
    lastmod: (p.publishedAt ?? today).slice(0, 10),
    changefreq: 'monthly', priority: '0.6',
    image: p.coverImage,
  }))

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>
<!-- Généré automatiquement le ${today} par scripts/generate-sitemap.mjs — ne pas éditer à la main -->

${staticPages.join('\n\n')}

${categoryPages.join('\n\n')}

${productPages.join('\n\n')}

${blogPages.join('\n\n')}

</urlset>
`

  writeFileSync(OUT_PATH, xml)
  console.log(`✓ sitemap.xml écrit (${staticPages.length + categoryPages.length + productPages.length + blogPages.length} URLs)`)
}

main().catch(err => {
  console.error('✗ Échec génération sitemap — build interrompu:', err.message)
  process.exit(1)
})
