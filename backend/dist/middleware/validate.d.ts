import type { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
/** Valide req.body avec un schema Zod */
export declare function validate<T>(schema: ZodSchema<T>): (req: Request, res: Response, next: NextFunction) => void;
/** Valide req.params avec un schema Zod */
export declare function validateParams<T>(schema: ZodSchema<T>): (req: Request, res: Response, next: NextFunction) => void;
/** Valide req.query avec un schema Zod */
export declare function validateQuery<T>(schema: ZodSchema<T>): (req: Request, res: Response, next: NextFunction) => void;
export declare const zPassword: z.ZodString;
/** :id numérique (Product, Category, Store…) — coercé et bornée à un entier positif */
export declare const zIntIdParam: z.ZodObject<{
    id: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: number;
}, {
    id: number;
}>;
/** :id texte (cuid — User, Order, GiftList, Return…) — non vide, longueur raisonnable */
export declare const zCuidIdParam: z.ZodObject<{
    id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
}, {
    id: string;
}>;
/** :slug texte (blog, listes cadeaux…) */
export declare const zSlugParam: z.ZodObject<{
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    slug: string;
}, {
    slug: string;
}>;
/** :productId numérique (Product.id) */
export declare const zProductIdParam: z.ZodObject<{
    productId: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    productId: number;
}, {
    productId: number;
}>;
/** :code texte (code promo) */
export declare const zCodeParam: z.ZodObject<{
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
/** :orderNumber texte (Order.orderNumber ou id) */
export declare const zOrderNumberParam: z.ZodObject<{
    orderNumber: z.ZodString;
}, "strip", z.ZodTypeAny, {
    orderNumber: string;
}, {
    orderNumber: string;
}>;
/** Pagination standard ?page=&limit= */
export declare const zPaginationQuery: z.ZodObject<{
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
//# sourceMappingURL=validate.d.ts.map