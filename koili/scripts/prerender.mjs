/**
 * Pré-rendu post-build des pages publiques statiques (pas de :param, pas
 * d'auth) — écrit le HTML réellement rendu par React (title/description/
 * canonical/JSON-LD posés par <PageMeta>) directement dans dist/, pour que
 * les crawlers qui ne exécutent pas le JS (Screaming Frog par défaut, aperçus
 * de partage WhatsApp/Facebook/Twitter, premier passage d'indexation Google)
 * voient le vrai contenu de chaque page au lieu du index.html générique
 * partagé par toutes les routes.
 *
 * Ne couvre pas les pages dynamiques (fiches produit/article, listes cadeaux)
 * — nécessiterait d'énumérer tous les id/slug depuis l'API à chaque build.
 */
import { chromium } from 'playwright'
import { preview } from 'vite'
import { writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '../dist')

const ROUTES = [
  '/', '/about', '/blog', '/contact', '/catalogue',
  '/cgu', '/legal', '/privacy', '/comparer', '/demande',
]

/**
 * React 19 ne gère que les balises <title>/<meta>/<link> qu'il a lui-même
 * rendues — celles déjà présentes dans le index.html statique (filet pour
 * les crawlers qui n'exécutent pas de JS) restent dans le DOM une fois
 * <PageMeta> monté, et l'ordre de hoisting n'est pas homogène : la balise
 * <title> posée par la page courante arrive en PREMIER (avant celle,
 * statique, de index.html), mais <meta description>/<link canonical>/
 * <meta og:*>/<meta twitter:*> arrivent en DERNIER. Vérifié empiriquement
 * sur le HTML rendu, pas une hypothèse — un navigateur réel s'en sort
 * (document.title / getters lisent la bonne occurrence), mais le HTML figé
 * ici doit ne garder qu'une seule occurrence de chaque, la bonne.
 */
function dedupeHead(html) {
  const dedupe = (re, keyOf, keep) => {
    const matches = [...html.matchAll(re)]
    if (matches.length < 2) return
    const byKey = new Map()
    for (const m of matches) {
      const key = keyOf(m)
      if (keep === 'first' && !byKey.has(key)) byKey.set(key, m)
      if (keep === 'last') byKey.set(key, m)
    }
    for (const m of matches) {
      if (byKey.get(keyOf(m)) !== m) html = html.replace(m[0], '')
    }
  }

  dedupe(/<title>[\s\S]*?<\/title>/g, () => 'title', 'first')
  dedupe(/<meta[^>]+name="description"[^>]*>/g, () => 'description', 'last')
  dedupe(/<link[^>]+rel="canonical"[^>]*>/g, () => 'canonical', 'last')
  dedupe(/<meta[^>]+(?:property|name)="(og:[a-z:]+|twitter:[a-z:]+)"[^>]*>/g, m => m[1], 'last')

  return html
}

async function main() {
  // Le fallback SPA générique (firebase.json → rewrite catch-all) doit pointer
  // vers CE fichier, pas vers index.html : une fois le pré-rendu de "/" ci-dessous
  // écrit dans index.html, ce fichier devient spécifique à la page d'accueil
  // (son <title>, son og:image...). Sans cette copie préalable, TOUTE route
  // dynamique non pré-rendue (fiche produit /catalogue/:id, /profil, /panier...)
  // hériterait du <title>/og:image de la page d'accueil au lieu d'un fallback
  // neutre — exactement le bug observé (partage d'un produit → aperçu de la
  // page d'accueil au lieu du produit).
  copyFileSync(join(DIST, 'index.html'), join(DIST, '200.html'))

  const server = await preview({ preview: { port: 4173, host: '127.0.0.1' } })
  const base = `http://127.0.0.1:${server.config.preview.port}`

  const browser = await chromium.launch()

  // Un contexte + un onglet neufs par route : React 19 hoiste <title>/<link>
  // vers <head> sans forcément nettoyer l'ancien lors d'une navigation dans
  // le même onglet — réutiliser la page entre deux routes faisait
  // s'accumuler les balises des routes précédentes dans le HTML capturé.
  async function renderRoute(route) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle' })
    // <PageMeta> pose title/meta au montage — laisse React finir un tick.
    await page.waitForTimeout(150)
    const html = await page.content()
    await context.close()
    return dedupeHead(html)
  }

  for (const route of ROUTES) {
    const html = await renderRoute(route)
    // Fichier plat (about.html, pas about/index.html) + cleanUrls:true côté
    // Firebase — sert /about directement en 200, sans redirect 301 vers
    // /about/ (comportement par défaut de Firebase pour un dossier avec
    // index.html, qui aurait en plus désaccordé l'URL réelle du canonical).
    const outPath = route === '/' ? join(DIST, 'index.html') : join(DIST, `${route.slice(1)}.html`)
    mkdirSync(dirname(outPath), { recursive: true })
    writeFileSync(outPath, html)
    console.log(`✓ pré-rendu ${route}`)
  }

  // 404 : sonde une route volontairement inexistante pour capturer le HTML
  // de NotFoundPage, écrit en dist/404.html (convention statique — inerte
  // tant que la réécriture Firebase reste en catch-all sur toutes les routes,
  // mais prêt si elle est un jour restreinte aux routes connues).
  writeFileSync(join(DIST, '404.html'), await renderRoute('/__prerender_404_probe__'))
  console.log('✓ pré-rendu 404.html')

  await browser.close()
  await server.httpServer.close()
}

main().catch(err => {
  console.error('✗ Échec du pré-rendu :', err)
  process.exit(1)
})
