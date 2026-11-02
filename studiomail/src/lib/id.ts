/** Identifiants courts, lisibles dans le JSON exporté/débuggé — pas besoin d'UUID complet. */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}
