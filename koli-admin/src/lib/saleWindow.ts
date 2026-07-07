/** Date ISO (API) → format attendu par <input type="datetime-local"> (heure locale) */
export function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> → ISO (ou null si vide, pour effacer la promo) */
export function fromDatetimeLocal(local?: string): string | null {
  if (!local) return null
  return new Date(local).toISOString()
}

export type SaleState = 'none' | 'scheduled' | 'active' | 'expired'

export function getSaleState(startsAt?: string | null, endsAt?: string | null): SaleState {
  if (!endsAt) return 'none'
  const now = Date.now()
  const end = new Date(endsAt).getTime()
  if (now >= end) return 'expired'
  if (startsAt && new Date(startsAt).getTime() > now) return 'scheduled'
  return 'active'
}

export const SALE_STATE_BADGE: Record<Exclude<SaleState, 'none'>, { label: string; cls: string }> = {
  scheduled: { label: 'Programmée', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  active:    { label: 'Active',     cls: 'bg-green-50 text-green-700 border-green-200' },
  expired:   { label: 'Expirée',    cls: 'bg-slate-100 text-slate-500 border-slate-200' },
}
