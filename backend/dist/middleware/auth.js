"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.optionalAuth = optionalAuth;
const jwt_1 = require("../lib/jwt");
/** Middleware — vérifie le JWT (Bearer header ou cookie) */
function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization;
        const tokenFromHeader = header?.startsWith('Bearer ') ? header.slice(7) : null;
        const tokenFromCookie = req.cookies?.access_token;
        const token = tokenFromHeader ?? tokenFromCookie;
        if (!token) {
            res.status(401).json({ success: false, message: 'Authentification requise' });
            return;
        }
        const payload = (0, jwt_1.verifyAccessToken)(token);
        req.user = payload;
        next();
    }
    catch {
        res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
    }
}
/** Middleware — vérifie le rôle admin */
function requireAdmin(req, res, next) {
    requireAuth(req, res, () => {
        if (req.user?.role !== 'admin') {
            res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs' });
            return;
        }
        next();
    });
}
/** Middleware — optionnel : injecte req.user si token présent, sans bloquer */
function optionalAuth(req, _res, next) {
    try {
        const header = req.headers.authorization;
        const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.access_token;
        if (token)
            req.user = (0, jwt_1.verifyAccessToken)(token);
    }
    catch {
        // Token invalide ignoré
    }
    next();
}
//# sourceMappingURL=auth.js.map