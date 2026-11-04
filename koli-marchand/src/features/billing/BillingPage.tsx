import { useState } from 'react'
import { Wallet, Percent, CalendarClock, ChevronLeft, ChevronRight, Lock, CreditCard } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { fmtDate, fmtDateTime, fmtFcfa } from '@/lib/format'
import type { WalletTransaction, SubscriptionInvoice } from '@/lib/merchantgo'
import { useBilling, useWalletBalance, useWalletTransactions, useSubscriptionInvoices } from './api/useBilling'

const MONTH_LABELS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
function periodLabel(periodStart: string): string {
  const d = new Date(periodStart)
  return `${MONTH_LABELS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

const invoiceColumns: DataTableColumn<SubscriptionInvoice>[] = [
  { key: 'period', header: 'Mois', render: (i) => <span className="font-semibold text-[#0a0a0b]">{periodLabel(i.period_start)}</span> },
  { key: 'amount', header: 'Montant', align: 'right', render: (i) => fmtFcfa(i.amount) },
  {
    key: 'status', header: 'Statut',
    render: (i) => i.status === 'paid'
      ? <span className="text-xs font-medium text-emerald-600">Payée{i.paid_at ? ` · ${fmtDate(i.paid_at)}` : ''}</span>
      : i.status === 'overdue'
        ? <span className="text-xs font-medium text-red-600">En retard</span>
        : <span className="text-xs font-medium text-amber-600">En attente</span>,
  },
  {
    key: 'action', header: '', align: 'right',
    render: (i) => i.status !== 'paid' && (
      <a href={i.checkout_url} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#1E90FF] hover:text-[#0f7ae0]">
        <CreditCard size={12} /> Payer
      </a>
    ),
  },
]

const columns: DataTableColumn<WalletTransaction>[] = [
  { key: 'order', header: 'Commande', render: (t) => <span className="font-semibold text-[#0a0a0b]">{t.order_number}</span> },
  { key: 'date', header: 'Date', render: (t) => fmtDateTime(t.created_at) },
  { key: 'gross', header: 'Montant brut', align: 'right', render: (t) => fmtFcfa(t.gross_amount) },
  { key: 'rate', header: 'Commission', align: 'right', render: (t) => `${t.commission_rate.toFixed(1)}%` },
  {
    key: 'net',
    header: 'Net perçu',
    align: 'right',
    render: (t) => <span className="font-semibold text-emerald-700">{fmtFcfa(t.net_amount)}</span>,
  },
]

export default function BillingPage() {
  const [page, setPage] = useState(1)

  const { data: billing, isLoading: billingLoading } = useBilling()
  const { data: balance, isLoading: balanceLoading } = useWalletBalance()
  const { data: txPage, isLoading: txLoading } = useWalletTransactions(page)
  const { data: invoicesPage, isLoading: invoicesLoading } = useSubscriptionInvoices()

  const pendingInvoice = invoicesPage?.invoices.find(i => i.status !== 'paid')

  const planName = billing?.mode === 'subscription' ? billing.subscription_plan?.name : undefined
  const totalPages = txPage ? Math.max(1, Math.ceil(txPage.total / txPage.limit)) : 1

  return (
    <div>
      <PageHeader title="Facturation" subtitle="Votre modèle économique et l'historique de vos commissions" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 bg-[#0a0a0b] border-[#0a0a0b]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#a3a3a1] uppercase tracking-wider">Solde net cumulé</p>
              <p className="mt-1.5 text-2xl font-extrabold text-white tracking-tight">
                {balanceLoading ? '…' : fmtFcfa(balance?.balance ?? 0)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white/10 text-white shrink-0">
              <Wallet size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider">Modèle économique</p>
              <p className="mt-1.5 text-2xl font-extrabold text-[#0a0a0b] tracking-tight">
                {billingLoading ? '…' : billing?.mode === 'subscription' ? planName ?? 'Abonnement' : `Commission ${billing?.commission_rate.toFixed(1)}%`}
              </p>
              <p className="mt-4 flex items-center gap-1.5 text-xs text-[#6b6b68]">
                <Lock size={12} /> Géré par l'équipe Skignas
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#1E90FF]/10 text-[#1E90FF] shrink-0">
              <Percent size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider">Dernier changement</p>
              <p className="mt-1.5 text-2xl font-extrabold text-[#0a0a0b] tracking-tight">
                {billingLoading || !billing?.last_changed_at || billing.last_changed_at.startsWith('0001')
                  ? '—'
                  : fmtDateTime(billing.last_changed_at)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <CalendarClock size={20} />
            </div>
          </div>
        </Card>
      </div>

      {billing?.mode === 'subscription' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#0a0a0b]">Facturation abonnement</h2>
            <span className="text-xs text-[#a3a3a1]">Génération et relance automatiques — rien à faire sauf payer</span>
          </div>

          {pendingInvoice && (
            <div className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl mb-4 ${
              pendingInvoice.status === 'overdue' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${pendingInvoice.status === 'overdue' ? 'text-red-800' : 'text-amber-800'}`}>
                  {periodLabel(pendingInvoice.period_start)} — {fmtFcfa(pendingInvoice.amount)}
                  {pendingInvoice.status === 'overdue' ? ' (en retard, boutique suspendue)' : ` — à régler avant le ${fmtDate(pendingInvoice.due_at)}`}
                </p>
              </div>
              <a href={pendingInvoice.checkout_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0a0a0b] text-white text-sm font-semibold shrink-0">
                <CreditCard size={14} /> Payer maintenant
              </a>
            </div>
          )}

          <DataTable
            columns={invoiceColumns}
            rows={invoicesPage?.invoices ?? []}
            rowKey={(i) => i.id}
            isLoading={invoicesLoading}
            emptyMessage="Aucune facture pour l'instant."
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-[#0a0a0b]">Historique des commissions</h2>
        {txPage && txPage.total > 0 && (
          <div className="flex items-center gap-2">
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
      </div>
      <DataTable
        columns={columns}
        rows={txPage?.transactions ?? []}
        rowKey={(t) => t.id}
        isLoading={txLoading}
        emptyMessage="Aucune commission enregistrée pour le moment."
      />

    </div>
  )
}
