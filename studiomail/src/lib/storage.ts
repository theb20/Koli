/* ─────────────────────────────────────────────────────────────
   Persistance locale (prototype) — tous les projets vivent dans
   localStorage sous une seule clé versionnée. Couche volontairement fine
   et isolée : brancher une vraie API plus tard ne touche que ce fichier
   (voir store/projectsStore.ts, qui n'appelle jamais localStorage
   directement).
───────────────────────────────────────────────────────────── */
import { z } from 'zod'
import { projectSchema, type Project } from '@/types/document'

const STORAGE_KEY = 'studiomail.projects.v1'

const storeSchema = z.object({
  version: z.literal(1),
  projects: z.array(projectSchema),
})

export function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = storeSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      console.warn('[storage] projets locaux illisibles, ignorés', parsed.error)
      return []
    }
    return parsed.data.projects
  } catch (err) {
    console.warn('[storage] échec de lecture localStorage', err)
    return []
  }
}

export function saveProjects(projects: Project[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, projects }))
    return true
  } catch (err) {
    // Quota dépassé ou navigation privée — ne jamais faire planter l'éditeur pour ça.
    console.error('[storage] échec d’écriture localStorage (quota ?)', err)
    return false
  }
}
