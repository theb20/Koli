import crypto from 'crypto'
import { extractExtension } from './mimeValidator'

/**
 * Nettoie un nom de fichier pour un usage purement informatif (logs,
 * métadonnées affichées) — n'est PAS ce qui doit être utilisé comme nom de
 * stockage physique, voir generateSafeFileName() ci-dessous pour ça.
 * Retire tout ce qui pourrait servir à un path traversal (`../`, séparateurs)
 * ou casser un en-tête/JSON en aval.
 */
export function sanitizeDisplayName(name: string): string {
  return name
    .replace(/\\/g, '/')
    .split('/')
    .pop()! // ne garde que le segment final — élimine tout chemin
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.') // "..", "..." → "." (empêche ../ reconstitué par concaténation)
    .slice(0, 200)
}

/**
 * Nom de stockage physique — jamais dérivé du nom fourni par le client au
 * delà de son extension (déjà validée en amont par mimeValidator). UUID v4 +
 * timestamp : ni prévisible, ni réutilisable, ni capable d'entrer en
 * collision avec un fichier existant.
 */
export function generateSafeFileName(originalName: string): string {
  const ext = extractExtension(originalName)
  const suffix = ext ? `.${ext}` : ''
  return `${crypto.randomUUID()}-${Date.now()}${suffix}`
}
