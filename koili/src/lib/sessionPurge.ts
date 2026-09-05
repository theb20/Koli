/* ─────────────────────────────────────────────────────────────
   Registre de purge de session — permet à des contextes indépendants
   (Cart, Compare, ...) de s'enregistrer pour être vidés de façon
   synchrone et déterministe au logout, sans dépendance circulaire entre
   contextes. Même principe que setAuthRefreshHandlers dans lib/api.ts.

   AuthContext (propriétaire de logout()) ne connaît pas l'existence de
   CartContext ou CompareContext — chaque contexte s'enregistre lui-même à
   son montage, et logout() se contente d'appeler purgeAllSessionData()
   sans avoir à importer chaque store un par un.
───────────────────────────────────────────────────────────── */

type PurgeHandler = () => void

const handlers = new Set<PurgeHandler>()

/** Appelé par un contexte/store porteur de données privées, à son montage. */
export function registerPurgeHandler(fn: PurgeHandler): () => void {
  handlers.add(fn)
  return () => handlers.delete(fn)
}

/**
 * Appelé une seule fois, depuis logout() — chaque handler est isolé dans
 * son propre try/catch : l'échec d'une purge ne doit jamais empêcher les
 * autres de s'exécuter.
 */
export function purgeAllSessionData(): void {
  for (const fn of handlers) {
    try {
      fn()
    } catch {
      // une purge ne doit jamais bloquer les autres
    }
  }
}
