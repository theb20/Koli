import type { Request, Response, NextFunction } from 'express'
import { z, ZodSchema } from 'zod'

/** Valide req.body avec un schema Zod */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: result.error.flatten().fieldErrors,
      })
      return
    }
    req.body = result.data as typeof req.body
    next()
  }
}

/** Valide req.params avec un schema Zod */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Paramètres invalides',
        errors: result.error.flatten().fieldErrors,
      })
      return
    }
    req.params = result.data as typeof req.params
    next()
  }
}

/** Valide req.query avec un schema Zod */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Paramètres de requête invalides',
        errors: result.error.flatten().fieldErrors,
      })
      return
    }
    req.query = result.data as typeof req.query
    next()
  }
}

/* ─── Schemas Zod réutilisables ─────────────────────────────── */

export const zPassword = z.string()
  .min(8, 'Minimum 8 caractères')
  .regex(/[A-Z]/, 'Au moins 1 majuscule')
  .regex(/[0-9]/, 'Au moins 1 chiffre')

/** :id numérique (Product, Category, Store…) — coercé et bornée à un entier positif */
export const zIntIdParam = z.object({ id: z.coerce.number().int().positive('ID invalide') })

/** :id texte (cuid — User, Order, GiftList, Return…) — non vide, longueur raisonnable */
export const zCuidIdParam = z.object({ id: z.string().min(1).max(40) })

/** :slug texte (blog, listes cadeaux…) */
export const zSlugParam = z.object({ slug: z.string().min(1).max(120) })

/** :productId numérique (Product.id) */
export const zProductIdParam = z.object({ productId: z.coerce.number().int().positive('ID produit invalide') })

/** :code texte (code promo) */
export const zCodeParam = z.object({ code: z.string().min(1).max(30) })

/** :orderNumber texte (Order.orderNumber ou id) */
export const zOrderNumberParam = z.object({ orderNumber: z.string().min(1).max(40) })

/** Pagination standard ?page=&limit= */
export const zPaginationQuery = z.object({
  page:  z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})
