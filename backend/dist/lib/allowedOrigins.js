"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALLOWED_ORIGINS = void 0;
/**
 * Origines de confiance (front-ends officiels). Réutilisé par CORS (app.ts)
 * et par tout endpoint qui doit construire une URL de redirection à partir
 * de l'Origin de la requête (ex: lien de réinitialisation de mot de passe)
 * sans jamais faire confiance à une valeur arbitraire fournie par le client.
 */
exports.ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL ??
        'http://localhost:3000',
    'http://localhost:5174',
    'https://skignas.ahobaut.fr',
    'https://adminskignas.web.app',
    'https://skignas.com',
    'https://www.skignas.com',
    'https://admin.skignas.com'
];
//# sourceMappingURL=allowedOrigins.js.map