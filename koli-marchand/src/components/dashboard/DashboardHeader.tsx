import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronDown, Package, Tag, Upload } from 'lucide-react'
import { useAuthStore } from '@/features/auth/useAuthStore'
import { PERIOD_OPTIONS } from '@/features/dashboard/hooks/usePeriod'
import type { DashboardPeriod } from '@/types/dashboard'

interface DashboardHeaderProps {
  period: DashboardPeriod
  onPeriodChange: (period: DashboardPeriod) => void
  customRange: { from: Date; to: Date } | null
  onCustomRangeChange: (range: { from: Date; to: Date }) => void
}

/*
 * "Voir la boutique" / "Partager" / "Exporter" et les entrées "Coupon" /
 * "Commande manuelle" du menu +Ajouter n'ont volontairement pas été
 * ajoutés ici : aucune page boutique publique par marchand n'existe, un
 * coupon est le même modèle qu'une promotion (pas une fonctionnalité
 * distincte), et il n'existe aucune route de création de commande
 * manuelle côté backend/. Les ajouter aurait produit des boutons morts.
 */
const ADD_ACTIONS = [
  { label: 'Produit', icon: Package, to: '/produits?new=1' },
  { label: 'Promotion', icon: Tag, to: '/promotions' },
  { label: 'Import produits', icon: Upload, to: '/produits?import=1' },
]

export function DashboardHeader({ period, onPeriodChange, customRange, onCustomRangeChange }: DashboardHeaderProps) {
  const navigate = useNavigate()
  const ownerName = useAuthStore((s) => s.user?.ownerName)
  const firstName = ownerName?.split(' ')[0] ?? 'là'
  const [periodOpen, setPeriodOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const periodLabel = PERIOD_OPTIONS.find((o) => o.key === period)?.label ?? '30 jours'

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#0a0a0b] tracking-tight">Bonjour {firstName} 👋</h1>
        <p className="text-sm text-[#6b6b68] mt-1">Résumé de la journée</p>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative">
          <button
            onClick={() => setPeriodOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={periodOpen}
            className="flex items-center gap-1.5 rounded-xl border border-[#e8e8e4] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#0a0a0b] hover:border-[#1E90FF]/40 transition-colors"
          >
            {periodLabel}
            <ChevronDown size={15} className="text-[#a3a3a1]" />
          </button>
          {periodOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPeriodOpen(false)} aria-hidden="true" />
              <div role="menu" className="absolute right-0 mt-2 w-60 bg-white border border-[#e8e8e4] rounded-2xl py-1.5 z-20 shadow-lg">
                {PERIOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    role="menuitem"
                    onClick={() => {
                      onPeriodChange(opt.key)
                      if (opt.key !== 'custom') setPeriodOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-[#f5f5f3] transition-colors ${
                      opt.key === period ? 'text-[#1E90FF] font-semibold' : 'text-[#0a0a0b]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
                {period === 'custom' && (
                  <div className="px-4 py-2 border-t border-[#f0f0ed] mt-1 flex flex-col gap-2">
                    <label className="flex flex-col gap-1 text-xs text-[#6b6b68]">
                      Du
                      <input
                        type="date"
                        defaultValue={customRange?.from.toISOString().slice(0, 10)}
                        onChange={(e) => {
                          if (!e.target.value) return
                          onCustomRangeChange({ from: new Date(e.target.value), to: customRange?.to ?? new Date() })
                        }}
                        className="rounded-lg border border-[#e8e8e4] px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-[#6b6b68]">
                      Au
                      <input
                        type="date"
                        defaultValue={customRange?.to.toISOString().slice(0, 10)}
                        onChange={(e) => {
                          if (!e.target.value) return
                          onCustomRangeChange({ from: customRange?.from ?? new Date(), to: new Date(e.target.value) })
                        }}
                        className="rounded-lg border border-[#e8e8e4] px-2 py-1.5 text-sm"
                      />
                    </label>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setAddOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={addOpen}
            className="flex items-center gap-1.5 rounded-xl bg-[#0a0a0b] hover:bg-[#2c2c2c] transition-colors px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus size={16} />
            Ajouter
          </button>
          {addOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setAddOpen(false)} aria-hidden="true" />
              <div role="menu" className="absolute right-0 mt-2 w-52 bg-white border border-[#e8e8e4] rounded-2xl py-1.5 z-20 shadow-lg">
                {ADD_ACTIONS.map(({ label, icon: Icon, to }) => (
                  <button
                    key={label}
                    role="menuitem"
                    onClick={() => {
                      setAddOpen(false)
                      navigate(to)
                    }}
                    className="w-full flex items-center gap-2.5 text-left px-4 py-2 text-sm text-[#0a0a0b] hover:bg-[#f5f5f3] transition-colors"
                  >
                    <Icon size={15} className="text-[#6b6b68]" />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
