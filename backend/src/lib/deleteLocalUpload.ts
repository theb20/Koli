import fs from 'fs'
import path from 'path'

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? './uploads')

/**
 * Supprime un fichier physique préalablement uploadé (image de catégorie,
 * produit ré-hébergé...) si l'URL pointe bien dans notre propre dossier
 * uploads/ — ignore silencieusement les URLs externes (rien à supprimer).
 */
export function deleteLocalUpload(url: string): void {
  const marker = '/uploads/'
  const idx = url.indexOf(marker)
  if (idx === -1) return

  const relativePath = url.slice(idx + marker.length)
  const fullPath = path.resolve(UPLOAD_DIR, relativePath)

  // Défense en profondeur contre un éventuel path traversal (../..)
  if (!fullPath.startsWith(UPLOAD_DIR)) return

  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
}
