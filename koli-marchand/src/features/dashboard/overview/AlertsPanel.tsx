import { Link } from 'react-router-dom'
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { SellerOverview } from '@/types/dashboard'

const STYLE = {
  critical: { icon: AlertOctagon, cls: 'text-rose-600 bg-rose-50', label: 'Urgent' },
  warning:  { icon: AlertTriangle, cls: 'text-amber-600 bg-amber-50', label: 'À surveiller' },
  info:     { icon: Info, cls: 'text-[#1E90FF] bg-[#1E90FF]/10', label: 'Info' },
} as const

/** Alertes actives, déjà triées par gravité côté serveur ; chacune mène à la section concernée. */
export function AlertsPanel({ alerts }: { alerts: SellerOverview['alerts'] }) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-[#0a0a0b] mb-3">Alertes actives</h2>
      {alerts.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-[#6b6b68]"><CheckCircle2 size={16} className="text-emerald-600" aria-hidden /> Rien à signaler.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alerts.map(a => {
            const s = STYLE[a.severity]
            const Icon = s.icon
            return (
              <li key={a.id}>
                <Link to={a.link} className="flex items-start gap-3 rounded-xl p-2.5 -mx-1 hover:bg-[#f5f5f3] transition-colors">
                  <span className={`p-1.5 rounded-lg shrink-0 ${s.cls}`}><Icon size={15} aria-hidden /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#0a0a0b]"><span className="sr-only">{s.label} : </span>{a.title}</span>
                    <span className="block text-xs text-[#6b6b68] mt-0.5">{a.detail}</span>
                  </span>
                  <ChevronRight size={16} className="text-[#a3a3a1] shrink-0 mt-1" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
