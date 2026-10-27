/* ─────────────────────────────────────────────────────────────
   Image d'aperçu de partage (Open Graph) d'un produit — JPEG 1200×630,
   photo centrée sur fond blanc. Les photos produit sont en WebP (stockgo)
   ou en JPEG externe ; WhatsApp affiche mal le WebP dans les aperçus, et
   1200×630 est le format « grande carte » de Facebook, WhatsApp, X, LinkedIn.
   Converti une fois puis gardé sur disque (clé = produit + empreinte de
   l'URL source : une nouvelle photo donne une nouvelle image).
───────────────────────────────────────────────────────────── */
import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import sharp from 'sharp'
import { assertPublicHost } from './rehostImage'

const MAX_BYTES = 10 * 1024 * 1024
const TIMEOUT_MS = 8_000

export const ogCacheDir = () => path.join(path.resolve(process.env.UPLOAD_DIR ?? './uploads'), 'og')

/** Empreinte courte de l'URL source — sert aussi de paramètre ?v= anti-cache côté front. */
export const ogImageVersion = (sourceUrl: string) => createHash('sha1').update(sourceUrl).digest('hex').slice(0, 12)

/** Charge la photo source : fichier local (/uploads/) ou URL https publique (jamais une IP interne). */
async function loadSource(sourceUrl: string): Promise<Buffer> {
  const local = sourceUrl.match(/\/uploads\/(products\/[A-Za-z0-9._-]+)$/)
  if (local) {
    const root = path.resolve(process.env.UPLOAD_DIR ?? './uploads')
    const file = path.join(root, local[1]!)
    if (!file.startsWith(root + path.sep)) throw new Error('Chemin refusé')
    return fs.promises.readFile(file)
  }
  // Redirections suivies À LA MAIN (3 au plus) : chaque saut est revérifié,
  // une redirection ne doit jamais mener vers une adresse interne (SSRF).
  let url = new URL(sourceUrl)
  let res: Response | undefined
  for (let hop = 0; hop <= 3; hop++) {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Protocole refusé')
    await assertPublicHost(url.hostname)
    res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'image/*' } })
    const location = res.headers.get('location')
    if (res.status < 300 || res.status >= 400 || !location) break
    url = new URL(location, url)
    res = undefined
  }
  if (!res) throw new Error('Trop de redirections')
  if (!res.ok) throw new Error(`Source ${res.status}`)
  if (!(res.headers.get('content-type') ?? '').startsWith('image/')) throw new Error('Pas une image')
  const len = Number(res.headers.get('content-length') ?? 0)
  if (len > MAX_BYTES) throw new Error('Image trop lourde')
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length > MAX_BYTES) throw new Error('Image trop lourde')
  return buf
}

/** Chemin du JPEG d'aperçu (créé au premier appel). */
export async function productOgImage(productId: number, sourceUrl: string): Promise<string> {
  const dir = ogCacheDir()
  const file = path.join(dir, `product-${productId}-${ogImageVersion(sourceUrl)}.jpg`)
  if (fs.existsSync(file)) return file
  const jpeg = await sharp(await loadSource(sourceUrl), { failOn: 'none' })
    .resize(1200, 630, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer()
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(file, jpeg)
  return file
}
