/* ─────────────────────────────────────────────────────────────
   Formatage unique de l'admin — tous les montants passent par
   formatFCFA(), toutes les dates par formatDate(). Locale fr-CI,
   fuseau Africa/Abidjan, séparateur de milliers = espace insécable.
───────────────────────────────────────────────────────────── */
export const LOCALE    = 'fr-CI'
export const TIME_ZONE = 'Africa/Abidjan'
const NBSP = '\u00A0'

/** Intl utilise l'espace fine insécable (U+202F) : on uniformise en U+00A0. */
const nbsp = (s: string) => s.replace(/[\u202F\u00A0 ]/g, NBSP)

const intFormatter = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 })

/** 1250000 → "1 250 000" */
export function formatNumber(n: number): string {
  return nbsp(intFormatter.format(Math.round(n)))
}

/** 1250000 → "1 250 000 FCFA" (sans décimales, arrondi) */
export function formatFCFA(n: number): string {
  return `${formatNumber(n)}${NBSP}FCFA`
}

/** 150000 → "150k", 2400000 → "2,4 M" — pour les étiquettes de graphique */
export function formatCompactFCFA(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${nbsp(new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 1 }).format(n / 1_000_000))}${NBSP}M`
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`
  return formatNumber(n)
}

type DateStyle = 'short' | 'medium' | 'long' | 'datetime' | 'time' | 'monthYear' | 'dayShort'

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short:     { day: '2-digit', month: '2-digit', year: 'numeric' },            // 26/09/2026
  medium:    { day: 'numeric', month: 'short', year: 'numeric' },              // 26 sept. 2026
  long:      { day: 'numeric', month: 'long', year: 'numeric' },               // 26 septembre 2026
  datetime:  { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }, // 26 sept., 14:05
  time:      { hour: '2-digit', minute: '2-digit' },                           // 14:05
  monthYear: { month: 'long', year: 'numeric' },                               // septembre 2026
  dayShort:  { weekday: 'short' },                                             // ven.
}

/** Date formatée en français, fuseau d'Abidjan. Accepte Date, ISO ou timestamp. */
export function formatDate(d: Date | string | number, style: DateStyle = 'medium'): string {
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return nbsp(new Intl.DateTimeFormat('fr-FR', { ...DATE_OPTIONS[style], timeZone: TIME_ZONE }).format(date))
}

/** "septembre 2026" → "Septembre 2026" */
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Variation en % entre deux périodes. null si la période précédente est
 * vide (division par zéro — on n'invente pas une hausse "infinie").
 */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

/** 0.0234 → "+0,02 %", -12 → "−12 %" (signe typographique moins) */
export function formatDelta(pct: number, fractionDigits = pct !== 0 && Math.abs(pct) < 1 ? 2 : 0): string {
  const abs = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(Math.abs(pct))
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : ''
  return nbsp(`${sign}${abs} %`)
}
