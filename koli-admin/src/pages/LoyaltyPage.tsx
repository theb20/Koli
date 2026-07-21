import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Gift, Coins, Power, Save } from 'lucide-react'
import { api } from '../lib/api'
import { Pagination } from '../components/ui/Pagination'
import { PageTitle } from '../components/layout/Sidebar'
import { Button } from '../components/ui/Button'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

type LoyaltyUser = {
  id: string
  prenom: string
  nom: string
  email: string
  loyaltyPoints: number
}

type LoyaltySettings = { loyaltyEnabled: boolean; loyaltyMinRedeem: number }

async function fetchLoyaltyUsers(params: Record<string, string | number>) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '').map(([k, v]) => [k, String(v)])
  )
  const { data } = await api.get(`/api/loyalty/admin/all?${q}`)
  return data.data
}

async function fetchSettings(): Promise<LoyaltySettings> {
  const { data } = await api.get('/api/settings/admin')
  return data.data.settings
}

/* ── Panneau de configuration du programme ─────────────────────── */
function LoyaltySettingsPanel() {
  const qc = useQueryClient()
  const { data: settings } = useQuery({ queryKey: ['site-settings'], queryFn: fetchSettings })

  const [enabled,   setEnabled]   = useState(true)
  const [minRedeem, setMinRedeem] = useState(500)

  // Synchronise l'état local une fois les vraies valeurs chargées — évite
  // d'écraser en base une valeur par défaut avant que le fetch ne réponde.
  useEffect(() => {
    if (settings) {
      setEnabled(settings.loyaltyEnabled)
      setMinRedeem(settings.loyaltyMinRedeem)
    }
  }, [settings])

  const save = useMutation({
    mutationFn: (body: LoyaltySettings) => api.put('/api/settings', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site-settings'] }),
  })

  const dirty = !!settings && (settings.loyaltyEnabled !== enabled || settings.loyaltyMinRedeem !== minRedeem)

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${enabled ? 'text-green-600 bg-green-50' : 'text-slate-400 bg-slate-100'}`}>
            <Power size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Programme de fidélité</p>
            <p className="text-xs text-slate-500 mt-0.5 max-w-md">
              Coupe-circuit global — quand désactivé, plus aucun point n'est gagné (commandes, parrainage) ni utilisable.
              Les soldes et historiques existants restent intacts.
            </p>
          </div>
        </div>
        <button
          onClick={() => setEnabled(v => !v)}
          role="switch"
          aria-checked={enabled}
          className={`shrink-0 relative w-12 h-7 rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-slate-300'}`}
        >
          <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 flex items-end gap-4 flex-wrap">
        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 block">
            Seuil minimum d'utilisation
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number" min={1} value={minRedeem}
              onChange={e => setMinRedeem(Math.max(1, Number(e.target.value)))}
              className="w-32 bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
            />
            <span className="text-sm text-slate-500">points</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Nombre de points minimum qu'un client doit avoir pour pouvoir les utiliser.</p>
        </div>

        <Button
          size="sm"
          icon={<Save size={13} />}
          loading={save.isPending}
          disabled={!dirty}
          onClick={() => save.mutate({ loyaltyEnabled: enabled, loyaltyMinRedeem: minRedeem })}
        >
          Enregistrer
        </Button>

        {save.isSuccess && !dirty && (
          <span className="text-xs font-medium text-green-600">✓ Enregistré</span>
        )}
      </div>
    </div>
  )
}

export default function LoyaltyPage() {
  const navigate = useNavigate()

  const [page,   setPage]   = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['loyalty-users', page, debouncedSearch],
    queryFn:  () => fetchLoyaltyUsers({ page, limit: 20, q: debouncedSearch }),
    placeholderData: (prev) => prev,
  })

  const users: LoyaltyUser[] = data?.users ?? []
  const total = data?.pagination?.total ?? 0
  const totalPoints = users.reduce((s, u) => s + u.loyaltyPoints, 0)

  const inputCls = "w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"

  return (
    <div className="space-y-5">
      <PageTitle
        title="Fidélité"
        sub={`${total} clients avec un compte de points`}
      />

      <LoyaltySettingsPanel />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Clients avec compte', value: total,       icon: Gift,  color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Points (page courante)', value: totalPoints, icon: Coins, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${color}`}><Icon size={16} /></div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
              <p className="text-xl font-bold text-slate-900">{value.toLocaleString('fr-FR')}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Nom, email..."
          className={`${inputCls} pl-9`} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Client', 'Email', 'Solde de points', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-4 py-3">
                  <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
                </td></tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={4} className="py-16 text-center">
                <Gift size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucun client trouvé</p>
              </td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} onClick={() => navigate(`/loyalty/${u.id}`)}
                  className="hover:bg-slate-50 transition-colors cursor-pointer group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-600">
                        {u.prenom?.[0]}{u.nom?.[0]}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{u.prenom} {u.nom}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      <Coins size={13} /> {u.loyaltyPoints.toLocaleString('fr-FR')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">Voir →</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        {data?.pagination && (
          <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={20} onChange={setPage} />
        )}
      </div>
    </div>
  )
}
