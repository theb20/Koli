import { logger } from './logger'

const API_URL      = 'https://api.cloudmersive.com/virus/scan/file'
const TIMEOUT_MS    = 15_000

export type ScanResult = { clean: boolean; reason?: string }

type CloudmersiveResponse = {
  CleanResult?: boolean
  FoundViruses?: { FileName?: string; VirusName?: string }[]
}

/**
 * Scanne un fichier via l'API Cloudmersive Virus Scan avant qu'il ne soit
 * écrit sur disque. Fail-open : si la clé n'est pas configurée, si l'API est
 * injoignable, en erreur, ou si le quota est épuisé, l'upload n'est PAS
 * bloqué — le scan est une couche de défense supplémentaire, pas la seule.
 * Les images passent déjà par un décodage Sharp qui rejette tout binaire
 * invalide (voir imageProcessing.ts), et les routes d'import restent
 * réservées aux comptes admin. Seul un résultat EXPLICITEMENT positif
 * (virus réellement détecté) bloque l'upload.
 */
export async function scanBuffer(buffer: Buffer, filename: string): Promise<ScanResult> {
  const apiKey = process.env.CLOUDMERSIVE_API_KEY
  if (!apiKey) return { clean: true }

  try {
    const form = new FormData()
    form.append('inputFile', new Blob([buffer]), filename)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    let res: Response
    try {
      res = await fetch(API_URL, {
        method:  'POST',
        headers: { Apikey: apiKey },
        body:    form,
        signal:  controller.signal,
      })
    } finally {
      clearTimeout(timeout)
    }

    if (!res.ok) {
      logger.error('[virusScan] réponse Cloudmersive non-OK', res.status, filename)
      return { clean: true }
    }

    const data = await res.json() as CloudmersiveResponse
    if (data.CleanResult === false) {
      const names = (data.FoundViruses ?? []).map(v => v.VirusName).filter(Boolean).join(', ')
      return { clean: false, reason: names || 'Fichier malveillant détecté' }
    }
    return { clean: true }
  } catch (err) {
    logger.error('[virusScan] échec de l\'appel à Cloudmersive', filename, err)
    return { clean: true }
  }
}

/** Scanne plusieurs fichiers en parallèle — s'arrête au premier résultat positif. */
export async function scanFiles(files: { buffer: Buffer; originalname: string }[]): Promise<ScanResult> {
  const results = await Promise.all(files.map(f => scanBuffer(f.buffer, f.originalname)))
  const dirty = results.find(r => !r.clean)
  return dirty ?? { clean: true }
}
