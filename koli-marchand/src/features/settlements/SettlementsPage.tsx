import { useState } from 'react'
import { FileText, ChevronLeft, ChevronRight, Mail, CheckCircle2, AlertTriangle, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { fmtDate, fmtFcfa } from '@/lib/format'
import type { MonthlySettlement } from '@/lib/merchantgo'
import { useSettlements } from './api/useSettlements'

const MONTH_LABELS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function periodLabel(periodStart: string): string {
  const d = new Date(periodStart)
  return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function PayoutStatus({ s }: { s: MonthlySettlement }) {
  switch (s.payout_status) {
    case 'requested':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <CheckCircle2 size={12} /> Versé{s.paid_out_at ? ` · ${fmtDate(s.paid_out_at)}` : ''}
        </span>
      )
    case 'skipped_no_method':
      return (
        <Link to="/facturation" className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium hover:underline">
          <Smartphone size={12} /> Ajouter un numéro Mobile Money
        </Link>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
          <AlertTriangle size={12} /> Échec — vérification en cours
        </span>
      )
    case 'skipped_non_positive':
      return <span className="text-xs text-[#a3a3a1]">Net non positif</span>
    default:
      return <span className="text-xs text-[#a3a3a1]">—</span>
  }
}

const columns: DataTableColumn<MonthlySettlement>[] = [
  { key: 'period', header: 'Mois', render: (s) => <span className="font-semibold text-[#0a0a0b]">{periodLabel(s.period_start)}</span> },
  { key: 'gross', header: 'Ventes brutes', align: 'right', render: (s) => fmtFcfa(s.gross_amount) },
  { key: 'commission', header: 'Commission', align: 'right', render: (s) => <span className="text-[#6b6b68]">− {fmtFcfa(s.commission_amount)}</span> },
  {
    key: 'net', header: 'Net', align: 'right',
    render: (s) => <span className="font-semibold text-emerald-700">{fmtFcfa(s.net_amount)}</span>,
  },
  { key: 'count', header: 'Transactions', align: 'right', render: (s) => s.transaction_count },
  {
    key: 'payout', header: 'Versement', align: 'right',
    render: (s) => <PayoutStatus s={s} />,
  },
  {
    key: 'status', header: 'Envoi', align: 'right',
    render: (s) => s.status === 'sent'
      ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><Mail size={12} /> {s.sent_at ? fmtDate(s.sent_at) : 'Envoyé'}</span>
      : <span className="text-xs text-[#a3a3a1]">En préparation</span>,
  },
]

export default function SettlementsPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useSettlements(page)
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1

  return (
    <div>
      <PageHeader
        title="Relevés"
        subtitle="Votre relevé mensuel de ventes, commission et net perçu — envoyé automatiquement chaque mois"
      />

      {!isLoading && (data?.settlements.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <FileText size={32} className="text-[#a3a3a1]" />
          <p className="text-sm text-[#6b6b68]">Aucun relevé pour l'instant — le premier arrivera à la clôture du mois en cours.</p>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={data?.settlements ?? []}
            rowKey={(s) => s.id}
            isLoading={isLoading}
          />
          {data && data.total > data.limit && (
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Page précédente"
                className="p-1.5 rounded-lg border border-[#e8e8e4] text-[#6b6b68] hover:bg-[#f0f0ed] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-[#6b6b68]">Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Page suivante"
                className="p-1.5 rounded-lg border border-[#e8e8e4] text-[#6b6b68] hover:bg-[#f0f0ed] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
