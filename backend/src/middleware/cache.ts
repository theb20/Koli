import type { Request, Response, NextFunction } from 'express'

/**
 * `private`, pas `public` : ces réponses varient selon l'en-tête `Origin` (le
 * header CORS `Access-Control-Allow-Origin` est calculé par requête). Le cache
 * d'edge de Railway ne respecte pas correctement `Vary: Origin` — une réponse
 * mise en cache par une requête sans Origin (bot, health-check, appel serveur-
 * à-serveur) était ensuite resservie telle quelle à de vrais navigateurs avec
 * un Origin légitime, donc SANS le header CORS attendu → le navigateur rejette
 * la réponse en silence (catégories/produits qui ne s'affichent jamais).
 * `private` autorise toujours le cache du navigateur lui-même (le vrai gain de
 * perf visé), mais empêche tout cache partagé/CDN de stocker une copie unique
 * partagée entre origines différentes.
 */
export function cacheControl(maxAgeSeconds: number) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.set('Cache-Control', `private, max-age=${maxAgeSeconds}`)
    next()
  }
}
