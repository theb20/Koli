"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zPassword = exports.zPhoneCM = void 0;
exports.validate = validate;
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
/* ─── Schemas Zod réutilisables ─────────────────────────────── */
exports.zPhoneCM = zod_1.z.string()
    .regex(/^(6|2)[0-9]{8}$/, 'Numéro camerounais invalide (ex: 655123456)')
    .optional();
exports.zPassword = zod_1.z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/[A-Z]/, 'Au moins 1 majuscule')
    .regex(/[0-9]/, 'Au moins 1 chiffre');
//# sourceMappingURL=validate.js.map