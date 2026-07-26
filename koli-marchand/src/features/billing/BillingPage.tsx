import { useState } from 'react'
import { Wallet, Percent, CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { fmtDateTime, fmtFcfa } from '@/lib/format'
import type { MerchantgoError, WalletTransaction } from '@/lib/merchantgo'
import { useBilling, useChooseBilling, useSubscriptionPlans, useWalletBalance, useWalletTransactions } from './api/useBilling'
import { ChangeBillingModal } from './components/ChangeBillingModal'

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
  const [modalOpen, setModalOpen] = useState(false)

  const { data: billing, isLoading: billingLoading } = useBilling()
  const { data: plans } = useSubscriptionPlans()
  const { data: balance, isLoading: balanceLoading } = useWalletBalance()
  const { data: txPage, isLoading: txLoading } = useWalletTransactions(page)
  const chooseBilling = useChooseBilling()

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
              <Button variant="secondary" className="mt-4" onClick={() => setModalOpen(true)} disabled={billingLoading}>
                Changer
              </Button>
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

      {modalOpen && billing && (
        <ChangeBillingModal
          plans={plans ?? []}
          currentMode={billing.mode}
          currentPlanId={billing.subscription_plan_id}
          onClose={() => {
            setModalOpen(false)
            chooseBilling.reset()
          }}
          isSubmitting={chooseBilling.isPending}
          error={chooseBilling.error as MerchantgoError | null}
          onSubmit={(input) => chooseBilling.mutate(input, { onSuccess: () => setModalOpen(false) })}
        />
      )}
    </div>
  )
}
