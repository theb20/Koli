/**
 * Migration ponctuelle : copie les images actuellement hébergées sur le
 * volume du backend (skignas.up.railway.app/uploads/...) vers le nouveau
 * service stockgo, puis met à jour les URLs en base.
 *
 * Usage :
 *   COPY_ONLY=1 npx tsx scripts/migrate-images-to-stockgo.ts   # phase 1, sans écriture DB
 *   npx tsx scripts/migrate-images-to-stockgo.ts               # phase 2, réécrit les URLs
 *
 * La phase 1 est sans risque : elle ne fait qu'ajouter des fichiers sur
 * stockgo, elle ne touche ni aux fichiers ni à la base existants. La
 * phase 2 ne s'exécute qu'après relecture du mapping généré par la phase 1
 * (sauvegardé dans migration-mapping.json).
 */
import { PrismaClient } from '@prisma/client'
import dns from 'dns'
import fs from 'fs'
import path from 'path'

// Le résolveur DNS local (macOS) a tardé à propager storage.skignas.com
// (nouveau sous-domaine Cloudflare) alors que `dig`/le résolveur système
// le voyait déjà — dns.lookup() de Node passe par un chemin différent et
// restait en échec. Contournement : résoudre via un resolver explicite
// (Google DNS) plutôt que le lookup OS par défaut, avec repli sur le
// comportement normal si la résolution alternative échoue aussi.
const altResolver = new dns.promises.Resolver()
altResolver.setServers(['8.8.8.8'])
const originalLookup = dns.lookup
// @ts-expect-error surcharge volontaire, cf. commentaire ci-dessus
dns.lookup = (hostname: string, options: any, callback: any) => {
  if (typeof options === 'function') { callback = options; options = {} }
  altResolver.resolve4(hostname).then(addresses => {
    if (options?.all) callback(null, addresses.map(a => ({ address: a, family: 4 })))
    else callback(null, addresses[0], 4)
  }).catch(() => originalLookup(hostname, options, callback))
}

const prisma = new PrismaClient()

const STOCKGO_URL = process.env.STOCKGO_URL ?? 'https://storage.skignas.com'
const STOCKGO_API_KEY = process.env.STOCKGO_API_KEY
const MAPPING_FILE = path.join(__dirname, 'migration-mapping.json')

if (!STOCKGO_API_KEY) {
  console.error('STOCKGO_API_KEY manquant')
  process.exit(1)
}

type Mapping = Record<string, string> // old URL -> new URL

function bucketFor(url: string): string {
  if (url.includes('/uploads/products/')) return 'products'
  if (url.includes('/uploads/cat/')) return 'categories'
  if (url.includes('/uploads/requests/')) return 'requests'
  return 'misc'
}

async function uploadToStockgo(oldUrl: string): Promise<string> {
  const res = await fetch(oldUrl)
  if (!res.ok) throw new Error(`téléchargement échoué (${res.status}): ${oldUrl}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream'
  const filename = oldUrl.split('/').pop()!

  const form = new FormData()
  form.append('file', new Blob([buffer], { type: contentType }), filename)
  form.append('bucket', bucketFor(oldUrl))
  form.append('visibility', 'public')

  const uploadRes = await fetch(`${STOCKGO_URL}/api/v1/files`, {
    method: 'POST',
    headers: { 'X-API-Key': STOCKGO_API_KEY! },
    body: form,
  })
  if (!uploadRes.ok) {
    const text = await uploadRes.text()
    throw new Error(`upload stockgo échoué (${uploadRes.status}): ${text}`)
  }
  const data = await uploadRes.json() as { url: string }
  return data.url
}

async function collectAllUrls(): Promise<string[]> {
  const pattern = (col: string) =>
    `${col} LIKE 'https://skignas.up.railway.app/uploads/%' OR ${col} LIKE 'https://api.skignas.com/uploads/%'`

  const images = await prisma.$queryRawUnsafe<{ url: string }[]>(
    `SELECT DISTINCT url FROM product_images WHERE ${pattern('url')}`,
  )
  const categories = await prisma.$queryRawUnsafe<{ image: string }[]>(
    `SELECT DISTINCT image FROM categories WHERE ${pattern('image')}`,
  )
  const orderItems = await prisma.$queryRawUnsafe<{ image: string }[]>(
    `SELECT DISTINCT image FROM order_items WHERE ${pattern('image')}`,
  )
  const requests = await prisma.$queryRawUnsafe<{ images: string }[]>(
    `SELECT images FROM product_requests WHERE images LIKE '%skignas%'`,
  )

  const urls = new Set<string>()
  images.forEach(r => urls.add(r.url))
  categories.forEach(r => urls.add(r.image))
  orderItems.forEach(r => urls.add(r.image))
  requests.forEach(r => (JSON.parse(r.images) as string[]).forEach(u => urls.add(u)))

  return [...urls]
}

async function phaseCopy() {
  const urls = await collectAllUrls()
  console.log(`${urls.length} fichiers à copier vers stockgo`)

  const mapping: Mapping = fs.existsSync(MAPPING_FILE)
    ? JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'))
    : {}

  let ok = 0, failed = 0, skipped = 0
  for (const [i, url] of urls.entries()) {
    if (mapping[url]) { skipped++; continue }
    try {
      const newUrl = await uploadToStockgo(url)
      mapping[url] = newUrl
      ok++
      console.log(`[${i + 1}/${urls.length}] OK  ${url} -> ${newUrl}`)
    } catch (err) {
      failed++
      console.error(`[${i + 1}/${urls.length}] ÉCHEC ${url}:`, (err as Error).message, (err as { cause?: unknown }).cause)
    }
    fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2))
  }

  console.log(`\nTerminé : ${ok} copiés, ${skipped} déjà faits, ${failed} échecs.`)
  console.log(`Mapping sauvegardé dans ${MAPPING_FILE}`)
}

async function phaseRewrite() {
  if (!fs.existsSync(MAPPING_FILE)) {
    console.error('Aucun mapping trouvé — lance la phase de copie (COPY_ONLY=1) d\'abord.')
    process.exit(1)
  }
  const mapping: Mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'))
  const entries = Object.entries(mapping)
  console.log(`Réécriture de ${entries.length} URLs en base...`)

  let updated = { images: 0, categories: 0, orderItems: 0, requests: 0 }

  for (const [oldUrl, newUrl] of entries) {
    const r1 = await prisma.productImage.updateMany({ where: { url: oldUrl }, data: { url: newUrl } })
    updated.images += r1.count

    const r2 = await prisma.category.updateMany({ where: { image: oldUrl }, data: { image: newUrl } })
    updated.categories += r2.count

    const r3 = await prisma.orderItem.updateMany({ where: { image: oldUrl }, data: { image: newUrl } })
    updated.orderItems += r3.count
  }

  // product_requests.images est un tableau JSON en texte — remplacement par requête brute
  const requests = await prisma.$queryRawUnsafe<{ id: string; images: string }[]>(
    `SELECT id, images FROM product_requests WHERE images LIKE '%skignas%'`,
  )
  for (const req of requests) {
    const arr = JSON.parse(req.images) as string[]
    const newArr = arr.map(u => mapping[u] ?? u)
    if (JSON.stringify(newArr) !== req.images) {
      await prisma.$executeRawUnsafe(
        `UPDATE product_requests SET images = $1 WHERE id = $2`,
        JSON.stringify(newArr), req.id,
      )
      updated.requests++
    }
  }

  console.log('Mis à jour :', updated)
}

async function main() {
  if (process.env.COPY_ONLY) {
    await phaseCopy()
  } else {
    await phaseRewrite()
  }
  await prisma.$disconnect()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
