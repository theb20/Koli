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

/* ─── Schemas Zod réutilisables ─────────────────────────────── */

export const zPassword = z.string()
  .min(8, 'Minimum 8 caractères')
  .regex(/[A-Z]/, 'Au moins 1 majuscule')
  .regex(/[0-9]/, 'Au moins 1 chiffre')
