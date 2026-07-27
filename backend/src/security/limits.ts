/**
 * Limites de taille par catégorie de fichier — centralisées ici plutôt que
 * dispersées dans chaque route, et surchargeables par variable d'environnement
 * sans toucher au code (ex: UPLOAD_MAX_IMAGE_MB=8 sur Railway).
 */
export type UploadCategory = 'image' | 'pdf' | 'document' | 'spreadsheet'

const DEFAULT_LIMITS_MB: Record<UploadCategory, number> = {
  image:       5,
  pdf:         10,
  document:    10,
  spreadsheet: 5,
}

function envOverrideMb(category: UploadCategory): number | undefined {
  const raw = process.env[`UPLOAD_MAX_${category.toUpperCase()}_MB`]
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Limite en octets pour une catégorie donnée — lue à chaque appel pour que
 *  les tests puissent modifier process.env sans recharger le module. */
export function maxUploadBytes(category: UploadCategory): number {
  const mb = envOverrideMb(category) ?? DEFAULT_LIMITS_MB[category]
  return mb * 1024 * 1024
}
