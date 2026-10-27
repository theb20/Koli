/* ─────────────────────────────────────────────────────────────
   Périodes du tableau de bord marchand — bornes [from, to[ en
   Africa/Abidjan. Abidjan est en UTC+0 toute l'année (pas d'heure d'été) :
   minuit local = minuit UTC, les bornes se calculent donc en UTC. Si la
   plateforme change un jour de fuseau de référence, c'est ICI (et dans
   LOCAL_DAY de queries.ts) qu'il faut appliquer le décalage.
───────────────────────────────────────────────────────────── */

export const SELLER_TIMEZONE = 'Africa/Abidjan'

export const PERIOD_PRESETS = ['today', 'yesterday', '7d', '30d', 'month', 'lastMonth', 'quarter', 'year', 'custom'] as const
export type PeriodPreset = typeof PERIOD_PRESETS[number]

export type Range = { from: Date; to: Date }

const DAY = 86_400_000
const day = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY)

/**
 * Période courante. Les périodes « en cours » (aujourd'hui, mois, trimestre,
 * année, glissantes) s'arrêtent à la fin de la journée d'aujourd'hui.
 * custom : dates AAAA-MM-JJ incluses.
 */
export function resolvePeriod(preset: PeriodPreset, custom?: { from: string; to: string }, now = new Date()): Range {
  const today = day(now)
  const tomorrow = addDays(today, 1)
  const y = today.getUTCFullYear(), m = today.getUTCMonth()
  switch (preset) {
    case 'today':     return { from: today, to: tomorrow }
    case 'yesterday': return { from: addDays(today, -1), to: today }
    case '7d':        return { from: addDays(today, -6), to: tomorrow }
    case '30d':       return { from: addDays(today, -29), to: tomorrow }
    case 'month':     return { from: new Date(Date.UTC(y, m, 1)), to: tomorrow }
    case 'lastMonth': return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 1)) }
    case 'quarter':   return { from: new Date(Date.UTC(y, m - (m % 3), 1)), to: tomorrow }
    case 'year':      return { from: new Date(Date.UTC(y, 0, 1)), to: tomorrow }
    case 'custom': {
      if (!custom) throw new Error('Période personnalisée sans dates')
      return { from: new Date(`${custom.from}T00:00:00Z`), to: addDays(new Date(`${custom.to}T00:00:00Z`), 1) }
    }
  }
}

/** Période précédente de même durée, juste avant. */
export function previousPeriod(r: Range): Range {
  const len = r.to.getTime() - r.from.getTime()
  return { from: new Date(r.from.getTime() - len), to: r.from }
}

/**
 * Mêmes dates un an plus tôt. Le 29 février tombe sur le 1er mars : une
 * période réduite à ce seul jour garde donc au moins un jour (sinon elle
 * deviendrait vide, du 1er au 1er mars).
 */
export function lastYearPeriod(r: Range): Range {
  const shift = (d: Date) => new Date(Date.UTC(d.getUTCFullYear() - 1, d.getUTCMonth(), d.getUTCDate()))
  const from = shift(r.from), to = shift(r.to)
  return { from, to: to > from ? to : addDays(from, 1) }
}

/** Les 30 jours de la mini-courbe : se terminent le dernier jour de la période. */
export function sparklineRange(r: Range): Range {
  const lastDay = addDays(r.to, -1)
  return { from: addDays(lastDay, -29), to: addDays(lastDay, 1) }
}

/** Liste des jours AAAA-MM-JJ d'une plage. */
export function daysOf(r: Range): string[] {
  const out: string[] = []
  for (let t = r.from.getTime(); t < r.to.getTime(); t += DAY) out.push(new Date(t).toISOString().slice(0, 10))
  return out
}
