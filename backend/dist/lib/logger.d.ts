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
export declare const logger: {
    info(...args: unknown[]): void;
    warn(...args: unknown[]): void;
    error(...args: unknown[]): void;
};
//# sourceMappingURL=logger.d.ts.map