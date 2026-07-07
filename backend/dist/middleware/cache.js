"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheControl = cacheControl;
/** Ajoute un Cache-Control public — pour les réponses en lecture seule, non personnalisées. */
function cacheControl(maxAgeSeconds) {
    return (_req, res, next) => {
        res.set('Cache-Control', `public, max-age=${maxAgeSeconds}`);
        next();
    };
}
//# sourceMappingURL=cache.js.map