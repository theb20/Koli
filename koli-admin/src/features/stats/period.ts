/* Période des statistiques — gardée dans l'URL (?p=30d | ?from=&to=, &cmp=) pour être partageable. */
import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Compare } from './api'

export type Preset = '7d' | '30d' | '90d' | 'month' | 'lastMonth' | 'year' | 'custom'

export const PRESET_LABELS: Record<Exclude<Preset, 'custom'>, string> = {
  '7d': '7 j', '30d': '30 j', '90d': '90 j', month: 'Ce mois', lastMonth: 'Mois dernier', year: 'Cette année',
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const utcToday = () => { const n = new Date(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) }
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)

export function presetRange(p: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const t = utcToday()
  switch (p) {
    case '7d':  return { from: iso(addDays(t, -6)), to: iso(t) }
    case '30d': return { from: iso(addDays(t, -29)), to: iso(t) }
    case '90d': return { from: iso(addDays(t, -89)), to: iso(t) }
    case 'month': return { from: iso(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1))), to: iso(t) }
    case 'lastMonth': return {
      from: iso(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1))),
      to: iso(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0))),
    }
    case 'year': return { from: iso(new Date(Date.UTC(t.getUTCFullYear(), 0, 1))), to: iso(t) }
  }
}

const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

export function usePeriod() {
  const [params, setParams] = useSearchParams()
  const rawP = params.get('p') as Preset | null
  const compare = (['previous', 'year', 'none'].includes(params.get('cmp') ?? '') ? params.get('cmp') : 'previous') as Compare
  const custom = isDate(params.get('from')) && isDate(params.get('to')) && params.get('from')! <= params.get('to')!
  const preset: Preset = custom ? 'custom' : rawP && rawP in PRESET_LABELS ? rawP : '30d'
  const range = preset === 'custom' ? { from: params.get('from')!, to: params.get('to')! } : presetRange(preset)

  // Dernière URL écrite : deux changements successifs avant re-rendu
  // (période puis comparaison) ne doivent pas s'écraser — le setter de
  // React Router, même fonctionnel, repart des paramètres du dernier rendu.
  const latest = useRef(params)
  useEffect(() => { latest.current = params }, [params])
  const update = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(latest.current)
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    latest.current = p
    setParams(p, { replace: true })
  }
  return {
    preset, compare, ...range,
    setPreset: (p: Exclude<Preset, 'custom'>) => update({ p, from: null, to: null }),
    setCustom: (from: string, to: string) => update({ p: null, from, to }),
    setCompare: (c: Compare) => update({ cmp: c === 'previous' ? null : c }),
  }
}
