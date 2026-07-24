/* ─────────────────────────────────────────────────────────────
   Client pour le service de stockage stockgo (backend/../stockgo) —
   remplace l'écriture directe sur le disque local (Volume Railway du
   backend) pour toutes les nouvelles images uploadées : produits
   (ré-hébergement), catégories, photos de retour, demandes produit.

   Tant que STOCKGO_URL/STOCKGO_API_KEY sont absents, isStockgoConfigured()
   est false — permet un environnement de dev sans stockgo qui échoue de
   façon lisible plutôt que par une erreur réseau confuse.
───────────────────────────────────────────────────────────── */
import { logger } from './logger'

const STOCKGO_URL     = process.env.STOCKGO_URL
const STOCKGO_API_KEY = process.env.STOCKGO_API_KEY

export function isStockgoConfigured(): boolean {
  return Boolean(STOCKGO_URL && STOCKGO_API_KEY)
}

// Le domaine personnalisé (STOCKGO_URL, utilisé pour les appels API) et le
// domaine que stockgo utilise réellement dans les URL qu'il génère
// (PUBLIC_URL sur son propre service Railway) divergent en prod — ce
// dernier n'a jamais été repointé vers storage.skignas.com. Tant que ça
// n'est pas corrigé côté stockgo, cette liste doit accepter les deux.
const STOCKGO_TRUSTED_HOSTS = [STOCKGO_URL, 'https://koli-production-a314.up.railway.app']
  .filter((u): u is string => Boolean(u))
  .map(u => new URL(u).host)

export function isStockgoUrl(url: string): boolean {
  try {
    return STOCKGO_TRUSTED_HOSTS.includes(new URL(url).host)
  } catch {
    return false
  }
}

/**
 * Upload un buffer déjà traité (converti en WebP, scanné antivirus en
 * amont) vers stockgo. `bucket` organise les fichiers par usage (products,
 * categories, returns, requests) — cf. stockgo/README.md.
 *
 * `visibility` par défaut à 'public' (comportement historique — servi
 * directement par le site, sans authentification). Les documents KYC
 * (pièce d'identité, selfie, justificatif de domicile) DOIVENT être
 * uploadés en 'private' — ce sont des données personnelles sensibles, pas
 * des images à afficher publiquement.
 */
export async function uploadToStockgo(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  bucket: string,
  visibility: 'public' | 'private' = 'public',
): Promise<string> {
  if (!isStockgoConfigured()) {
    throw new Error('Stockgo non configuré (STOCKGO_URL / STOCKGO_API_KEY manquants)')
  }

  const form = new FormData()
  form.append('file', new Blob([new Uint8Array(buffer)], { type: mimeType }), filename)
  form.append('bucket', bucket)
  form.append('visibility', visibility)

  const res = await fetch(`${STOCKGO_URL}/api/v1/files`, {
    method: 'POST',
    headers: { 'X-API-Key': STOCKGO_API_KEY! },
    body: form,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Upload stockgo échoué (${res.status}): ${text}`)
  }
  const data = await res.json() as { url: string }
  return data.url
}

/**
 * Récupère un fichier stockgo (public ou privé) en s'authentifiant avec
 * STOCKGO_API_KEY — sert à relayer les documents KYC (uploadés en
 * 'private') vers koli-admin sans jamais exposer cette clé au navigateur.
 * L'appelant est responsable de vérifier isStockgoUrl(url) avant d'appeler
 * cette fonction (ne jamais relayer une URL arbitraire fournie par le
 * client — risque de SSRF).
 */
export async function fetchStockgoFile(url: string): Promise<Response> {
  if (!isStockgoConfigured()) {
    throw new Error('Stockgo non configuré (STOCKGO_URL / STOCKGO_API_KEY manquants)')
  }
  return fetch(url, { headers: { 'X-API-Key': STOCKGO_API_KEY! } })
}

/**
 * Supprime un fichier sur stockgo si l'URL lui appartient — no-op sinon
 * (URL locale historique ou externe). Non bloquant : un échec de nettoyage
 * ne doit jamais faire échouer l'opération appelante (ex: remplacement
 * d'une image de catégorie).
 */
export async function deleteFromStockgo(url: string): Promise<void> {
  if (!isStockgoConfigured() || !isStockgoUrl(url)) return
  const id = url.split('/').pop()
  if (!id) return
  try {
    await fetch(`${STOCKGO_URL}/api/v1/files/${id}`, {
      method: 'DELETE',
      headers: { 'X-API-Key': STOCKGO_API_KEY! },
    })
  } catch (err) {
    logger.error('[stockgo] échec suppression', url, err) // non bloquant
  }
}
