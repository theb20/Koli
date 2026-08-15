// Chargé avant chaque fichier de test (vitest.config.ts → setupFiles).
// jwt.ts lève une erreur au chargement du module si JWT_SECRET est absent/court —
// il faut donc que ces variables existent avant le premier import de code applicatif.
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET ??= 'test-jwt-secret-at-least-32-characters-long'
process.env.JWT_EXPIRES_IN ??= '15m'
process.env.JWT_REFRESH_EXPIRES_IN ??= '30d'
process.env.FRONTEND_URL ??= 'http://localhost:3000'
