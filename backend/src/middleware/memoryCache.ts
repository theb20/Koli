import type { Request, Response, NextFunction } from 'express'

/**
 * Cache en mémoire, côté serveur — réduit la charge base de données pour les
 * endpoints publics à fort trafic (catalogue, catégories, blog...) sans
 * dépendre d'un CDN externe. Volontairement simple (Map + TTL), proportionné
 * à une seule instance backend ; passer à Redis le jour où plusieurs
 * instances tournent en parallèle (le cache doit alors être partagé, pas
 * un par instance).
 *
 * Jamais de cache pour une requête authentifiée par défaut (varyByAuth) —
 * évite de reproduire le bug de fuite cross-utilisateur déjà rencontré avec
 * le cache d'edge de Railway (voir middleware/cache.ts) sur les réponses
 * contenant des données personnalisées (ex: inWishlist sur un produit).
 */

type CacheEntry = { body: unknown; expiresAt: number }

const store = new Map<string, CacheEntry>()
const MAX_ENTRIES = 500 // borne dure — évite une croissance mémoire non bornée (ex: recherches ?q= très variées)

function set(key: string, body: unknown, ttlSeconds: number): void {
  if (store.size >= MAX_ENTRIES && !store.has(key)) {
    const oldestKey = store.keys().next().value
    if (oldestKey !== undefined) store.delete(oldestKey)
  }
  store.set(key, { body, expiresAt: Date.now() + ttlSeconds * 1000 })
}

export function memoryCache(ttlSeconds: number, options: { varyByAuth?: boolean } = {}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (options.varyByAuth && req.user) { next(); return }

    const key = req.originalUrl
    const cached = store.get(key)
    if (cached && cached.expiresAt > Date.now()) {
      res.set('X-Cache', 'HIT')
      res.json(cached.body)
      return
    }
    res.set('X-Cache', 'MISS')

    const originalJson = res.json.bind(res)
    res.json = ((body: unknown) => {
      if (res.statusCode === 200) set(key, body, ttlSeconds)
      return originalJson(body)
    }) as typeof res.json

    next()
  }
}
