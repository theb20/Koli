/* Mise en forme des indicateurs de l'accueil (aucun calcul métier ici). */
const NBSP = '\u00A0'
const nb = (s: string) => s.replace(/[\u202F\u00A0 ]/g, NBSP)

/** 48000 → « 48 000 F CFA » */
export const fmtXof = (n: number) => `${nb(Math.round(n).toLocaleString('fr-FR'))}${NBSP}F${NBSP}CFA`
export const fmtInt = (n: number) => nb(Math.round(n).toLocaleString('fr-FR'))
/** 7.7 → « 7,7 % » */
export const fmtRate = (n: number) => `${nb(n.toLocaleString('fr-FR', { maximumFractionDigits: 1 }))}${NBSP}%`
/** Écart signé : « +12,4 % », « −3 » ; le signe moins typographique. */
export function signed(n: number, fmt: (v: number) => string): string {
  if (n === 0) return fmt(0)
  return `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))}`
}
