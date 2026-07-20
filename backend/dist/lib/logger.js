"use strict";
/**
 * Logger centralisé — remplace console.* pour les logs serveur.
 *
 * Si un objet loggé (accidentellement ou non) contient un champ sensible
 * (password, token, secret, cookie, apiKey…), sa valeur est redactée avant
 * d'atteindre stdout/stderr — filet de sécurité pour le jour où un futur
 * `logger.info('login', req.body)` de debug oublié en prod contiendrait
 * un mot de passe en clair. Les objets Error conservent leur stack trace
 * (utile côté serveur), jamais renvoyée au client par ailleurs (voir le
 * handler d'erreur global dans app.ts, qui ne répond qu'un message générique).
 *
 * Point d'accroche unique si un service de logs externe (Sentry, etc.)
 * remplace un jour console.* — un seul fichier à modifier.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const SENSITIVE_KEY_RE = /^(password|newPassword|currentPassword|passwordToHash|token|accessToken|refreshToken|resetToken|resetTokenHash|verificationToken|magicToken|jwt|apiKey|api_key|secret|clientSecret|privateKey|authorization|cookie|access_token|refresh_token)$/i;
function redact(value, seen = new WeakSet()) {
    if (value instanceof Error) {
        return { name: value.name, message: value.message, stack: value.stack };
    }
    if (Array.isArray(value)) {
        return value.map(v => redact(v, seen));
    }
    if (value && typeof value === 'object') {
        if (seen.has(value))
            return '[Circular]';
        seen.add(value);
        const out = {};
        for (const [key, val] of Object.entries(value)) {
            out[key] = SENSITIVE_KEY_RE.test(key) ? '[REDACTED]' : redact(val, seen);
        }
        return out;
    }
    return value;
}
exports.logger = {
    info(...args) {
        console.log(...args.map(a => redact(a)));
    },
    warn(...args) {
        console.warn(...args.map(a => redact(a)));
    },
    error(...args) {
        console.error(...args.map(a => redact(a)));
    },
};
//# sourceMappingURL=logger.js.map