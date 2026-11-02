/** Fichiers de public/ référencés en JS (pas via index.html, que Vite réécrit
 *  déjà tout seul) — ceux-là doivent tenir compte de `base` manuellement :
 *  '/' en dev, '/studio-mail/' en prod (voir vite.config.ts). */
export const SKIGNAS_LOGO_URL = `${import.meta.env.BASE_URL}brand/logo-skignas.png`
