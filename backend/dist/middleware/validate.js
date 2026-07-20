"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zPaginationQuery = exports.zOrderNumberParam = exports.zCodeParam = exports.zProductIdParam = exports.zSlugParam = exports.zCuidIdParam = exports.zIntIdParam = exports.zPassword = void 0;
exports.validate = validate;
exports.validateParams = validateParams;
exports.validateQuery = validateQuery;
const zod_1 = require("zod");
/** Valide req.body avec un schema Zod */
function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                success: false,
                message: 'Données invalides',
                errors: result.error.flatten().fieldErrors,
            });
            return;
        }
        req.body = result.data;
        next();
    };
}
/** Valide req.params avec un schema Zod */
function validateParams(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);
        if (!result.success) {
            res.status(400).json({
                success: false,
                message: 'Paramètres invalides',
                errors: result.error.flatten().fieldErrors,
            });
            return;
        }
        req.params = result.data;
        next();
    };
}
/** Valide req.query avec un schema Zod */
function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            res.status(400).json({
                success: false,
                message: 'Paramètres de requête invalides',
                errors: result.error.flatten().fieldErrors,
            });
            return;
        }
        req.query = result.data;
        next();
    };
}
/* ─── Schemas Zod réutilisables ─────────────────────────────── */
exports.zPassword = zod_1.z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins 1 majuscule')
    .regex(/[0-9]/, 'Au moins 1 chiffre');
/** :id numérique (Product, Category, Store…) — coercé et bornée à un entier positif */
exports.zIntIdParam = zod_1.z.object({ id: zod_1.z.coerce.number().int().positive('ID invalide') });
/** :id texte (cuid — User, Order, GiftList, Return…) — non vide, longueur raisonnable */
exports.zCuidIdParam = zod_1.z.object({ id: zod_1.z.string().min(1).max(40) });
/** :slug texte (blog, listes cadeaux…) */
exports.zSlugParam = zod_1.z.object({ slug: zod_1.z.string().min(1).max(120) });
/** :productId numérique (Product.id) */
exports.zProductIdParam = zod_1.z.object({ productId: zod_1.z.coerce.number().int().positive('ID produit invalide') });
/** :code texte (code promo) */
exports.zCodeParam = zod_1.z.object({ code: zod_1.z.string().min(1).max(30) });
/** :orderNumber texte (Order.orderNumber ou id) */
exports.zOrderNumberParam = zod_1.z.object({ orderNumber: zod_1.z.string().min(1).max(40) });
/** Pagination standard ?page=&limit= */
exports.zPaginationQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional().default(20),
});
//# sourceMappingURL=validate.js.map