import { useState } from 'react'
import { Wallet, Clock, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { fmtDate, fmtFcfa } from '@/lib/format'
import { payoutStatusMap, paymentMethodLabels } from '@/lib/statusMaps'
import type { Payout } from '@/types'
import { useBalance, usePayoutsHistory, useWithdraw } from './api/usePayouts'
import { WithdrawModal } from './components/WithdrawModal'

const columns: DataTableColumn<Payout>[] = [
  { key: 'reference', header: 'Référence', render: (p) => <span className="font-semibold text-[#0a0a0b]">{p.reference}</span> },
  { key: 'date', header: 'Date', render: (p) => fmtDate(p.date) },
  { key: 'method', header: 'Méthode', render: (p) => paymentMethodLabels[p.method] },
  { key: 'amount', header: 'Montant', align: 'right', render: (p) => <span className="font-semibold">{fmtFcfa(p.amount)}</span> },
  {
    key: 'status',
    header: 'Statut',
    render: (p) => <StatusBadge label={payoutStatusMap[p.status].label} tone={payoutStatusMap[p.status].tone} />,
  },
]

export default function PaymentsPage() {
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const { data: balance, isLoading: balanceLoading } = useBalance()
  const { data: history, isLoading: historyLoading } = usePayoutsHistory()
  const withdraw = useWithdraw()

  return (
    <div>
      <PageHeader title="Paiements" subtitle="Suivez votre solde et l'historique de vos versements" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 bg-[#0a0a0b] border-[#0a0a0b]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#a3a3a1] uppercase tracking-wider">Solde disponible</p>
              <p className="mt-1.5 text-2xl font-extrabold text-white tracking-tight">
                {balanceLoading ? '…' : fmtFcfa(balance?.available ?? 0)}
              </p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => setWithdrawOpen(true)}
                disabled={!balance || balance.available <= 0}
              >
                Retirer mes fonds
              </Button>
            </div>
            <div className="p-3 rounded-xl bg-white/10 text-white shrink-0">
              <Wallet size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider">En attente</p>
              <p className="mt-1.5 text-2xl font-extrabold text-[#0a0a0b] tracking-tight">
                {balanceLoading ? '…' : fmtFcfa(balance?.pending ?? 0)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
              <Clock size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-[#6b6b68] uppercase tracking-wider">Versé ce mois</p>
              <p className="mt-1.5 text-2xl font-extrabold text-[#0a0a0b] tracking-tight">
                {balanceLoading ? '…' : fmtFcfa(balance?.paidThisMonth ?? 0)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>
      </div>

      <h2 className="font-bold text-[#0a0a0b] mb-4">Historique des versements</h2>
      <DataTable columns={columns} rows={history?.items ?? []} rowKey={(p) => p.id} isLoading={historyLoading} />

      {withdrawOpen && balance && (
        <WithdrawModal
          available={balance.available}
          methods={[]}
          onClose={() => setWithdrawOpen(false)}
          isSubmitting={withdraw.isPending}
          onSubmit={(values) =>
            withdraw.mutate(values, { onSuccess: () => setWithdrawOpen(false) })
          }
        />
      )}
    </div>
  )
}
