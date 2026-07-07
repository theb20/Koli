import type { Request, Response, NextFunction } from 'express'

/** Ajoute un Cache-Control public — pour les réponses en lecture seule, non personnalisées. */
export function cacheControl(maxAgeSeconds: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.set('Cache-Control', `public, max-age=${maxAgeSeconds}`)
    next()
  }
}
