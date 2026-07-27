import type { UploadCategory } from './limits'

/**
 * Listes blanches strictes — MIME déclaré ET extension doivent tous les deux
 * passer (un fichier peut mentir sur l'un des deux, rarement sur les deux de
 * façon cohérente). Ni l'un ni l'autre ne prouve le contenu réel : voir
 * fileSignature.ts pour la vérification du contenu binaire.
 */
// Le cœur de la whitelist "image" (jpg/png/webp) suit exactement le rapport
// de sécurité. heic/heif/avif y sont ajoutés en plus : ce sont les formats
// natifs des photos prises depuis un iPhone (dont les pièces d'identité
// scannées pendant l'inscription marchand) — les exclure aurait cassé une
// fonctionnalité réelle pour ne gagner aucune sécurité supplémentaire, le
// contenu de ces fichiers étant vérifié tout aussi strictement (voir
// fileSignature.ts).
export const ALLOWED_MIME_TYPES: Record<UploadCategory, readonly string[]> = {
  image: [
    'image/jpeg', 'image/png', 'image/webp',
    'image/heic', 'image/heif', 'image/avif',
  ],
  pdf:         ['application/pdf'],
  document:    ['application/pdf'],
  spreadsheet: [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
}

export const ALLOWED_EXTENSIONS: Record<UploadCategory, readonly string[]> = {
  image:       ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif'],
  pdf:         ['pdf'],
  document:    ['pdf'],
  spreadsheet: ['csv', 'xlsx'],
}

/** Extension réelle du nom de fichier — dernière portion après le dernier
 *  point, en minuscules. "photo.jpg.exe" → "exe" (pas "jpg") : une whitelist
 *  sur cette valeur suffit à elle seule à bloquer les doubles extensions. */
export function extractExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  if (idx === -1 || idx === filename.length - 1) return ''
  return filename.slice(idx + 1).toLowerCase()
}

export function isMimeAllowed(mimeType: string, category: UploadCategory): boolean {
  const base = mimeType.split(';')[0]!.trim().toLowerCase()
  return ALLOWED_MIME_TYPES[category].includes(base)
}

export function isExtensionAllowed(filename: string, category: UploadCategory): boolean {
  const ext = extractExtension(filename)
  return ext !== '' && ALLOWED_EXTENSIONS[category].includes(ext)
}
