import { describe, it, expect } from 'vitest'
import { daysOf, lastYearPeriod, previousPeriod, resolvePeriod, sparklineRange } from './periods'

const now = new Date('2026-10-25T23:30:00Z') // Abidjan = UTC : encore le 25/10
const iso = (r: { from: Date; to: Date }) => [r.from.toISOString().slice(0, 10), r.to.toISOString().slice(0, 10)]

describe('périodes (Africa/Abidjan, bornes [from, to[)', () => {
  it('préréglages', () => {
    expect(iso(resolvePeriod('today', undefined, now))).toEqual(['2026-10-25', '2026-10-26'])
    expect(iso(resolvePeriod('yesterday', undefined, now))).toEqual(['2026-10-24', '2026-10-25'])
    expect(iso(resolvePeriod('7d', undefined, now))).toEqual(['2026-10-19', '2026-10-26'])
    expect(iso(resolvePeriod('30d', undefined, now))).toEqual(['2026-09-26', '2026-10-26'])
    expect(iso(resolvePeriod('month', undefined, now))).toEqual(['2026-10-01', '2026-10-26'])
    expect(iso(resolvePeriod('lastMonth', undefined, now))).toEqual(['2026-09-01', '2026-10-01'])
    expect(iso(resolvePeriod('quarter', undefined, now))).toEqual(['2026-10-01', '2026-10-26'])
    expect(iso(resolvePeriod('year', undefined, now))).toEqual(['2026-01-01', '2026-10-26'])
    expect(iso(resolvePeriod('custom', { from: '2026-03-01', to: '2026-03-31' }))).toEqual(['2026-03-01', '2026-04-01'])
  })

  it('période précédente de même durée, et mêmes dates l\'an dernier', () => {
    const r = resolvePeriod('custom', { from: '2026-03-01', to: '2026-03-31' })
    expect(iso(previousPeriod(r))).toEqual(['2026-01-29', '2026-03-01'])
    expect(iso(lastYearPeriod(r))).toEqual(['2025-03-01', '2025-04-01'])
    expect(iso(lastYearPeriod(resolvePeriod('custom', { from: '2028-02-29', to: '2028-02-29' })))).toEqual(['2027-03-01', '2027-03-02'])
  })

  it('mini-courbe : les 30 jours qui finissent le dernier jour de la période', () => {
    const s = sparklineRange(resolvePeriod('lastMonth', undefined, now))
    expect(iso(s)).toEqual(['2026-09-01', '2026-10-01'])
    expect(daysOf(s)).toHaveLength(30)
  })
})
