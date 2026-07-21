import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Coins, Mail, History, PlusCircle, MinusCircle } from 'lucide-react'
import { api, fmtDateTime } from '../lib/api'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input, Textarea } from '../components/ui/Input'
import { Pagination } from '../components/ui/Pagination'

type LoyaltyUser = { id: string; prenom: string; nom: string; email: string; loyaltyPoints: number }
type PointTransaction = { id: string; type: string; points: number; note: string | null; createdAt: string }

const TYPE_LABELS: Record<string, string> = {
  earn:       'Gagnés',
  redeem:     'Utilisés',
  adjustment: 'Ajustement admin',
}

async function fetchLoyaltyDetail(id: string, page: number) {
  const { data } = await api.get(`/api/loyalty/admin/${id}?page=${page}&limit=20`)
  return data.data as { user: LoyaltyUser; transactions: PointTransaction[]; pagination: { page: number; totalPages: number; total: number } }
}

export default function LoyaltyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [page, setPage]   = useState(1)
  const [points, setPoints] = useState('')
  const [note, setNote]     = useState('')
  const [sign, setSign]     = useState<'credit' | 'debit'>('credit')

  const { data, isLoading } = useQuery({
    queryKey: ['loyalty-detail', id, page],
    queryFn:  () => fetchLoyaltyDetail(id!, page),
    enabled:  !!id,
    placeholderData: (prev) => prev,
  })

  const adjust = useMutation({
    mutationFn: () => api.post(`/api/loyalty/admin/${id}/adjust`, {
      points: sign === 'credit' ? Number(points) : -Number(points),
      note,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loyalty-detail', id] })
      qc.invalidateQueries({ queryKey: ['loyalty-users'] })
      setPoints('')
      setNote('')
    },
  })

  if (isLoading || !data) {
    return <div className="h-64 bg-slate-50 rounded-2xl animate-pulse" />
  }

  const { user, transactions, pagination } = data
  const pointsValid = Number.isInteger(Number(points)) && Number(points) > 0

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={() => navigate('/loyalty')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all shrink-0">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-slate-900">{user.prenom} {user.nom}</h1>
          <a href={`mailto:${user.email}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 mt-0.5">
            <Mail size={13} /> {user.email}
          </a>
        </div>
        <div className="inline-flex items-center gap-2 text-lg font-bold text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
          <Coins size={18} /> {user.loyaltyPoints.toLocaleString('fr-FR')} pts
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <History size={15} className="text-indigo-500" /> Historique des transactions
            </h3>
            {transactions.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Aucune transaction</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {transactions.map(t => (
                  <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-900">{t.note ?? TYPE_LABELS[t.type] ?? t.type}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {TYPE_LABELS[t.type] ?? t.type} · {fmtDateTime(t.createdAt)}
                      </p>
                    </div>
                    <span className={`shrink-0 font-bold text-sm ${t.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {t.points >= 0 ? '+' : ''}{t.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {pagination.totalPages > 1 && (
              <div className="-mx-5 -mb-5 mt-2">
                <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={20} onChange={setPage} />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Écriture correctrice</h3>
            <p className="text-xs text-slate-500 mb-4">
              Ajoute une transaction motivée — aucune transaction passée n'est jamais modifiée ou supprimée.
            </p>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button onClick={() => setSign('credit')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                    sign === 'credit' ? 'bg-green-50 border-green-300 text-green-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}>
                  <PlusCircle size={14} /> Créditer
                </button>
                <button onClick={() => setSign('debit')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border transition-all ${
                    sign === 'debit' ? 'bg-red-50 border-red-300 text-red-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}>
                  <MinusCircle size={14} /> Débiter
                </button>
              </div>
              <Input
                label="Points"
                type="number"
                min={1}
                value={points}
                onChange={e => setPoints(e.target.value)}
                placeholder="Ex : 100"
              />
              <Textarea
                label="Motif (obligatoire)"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Ex : geste commercial suite au litige #1234"
              />
              {adjust.isError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl">
                  {(adjust.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                    ?? "Erreur lors de l'ajustement"}
                </div>
              )}
              <Button
                className="w-full"
                variant={sign === 'credit' ? 'success' : 'danger'}
                loading={adjust.isPending}
                disabled={!pointsValid || note.trim().length < 3}
                onClick={() => adjust.mutate()}
              >
                {sign === 'credit' ? 'Créditer les points' : 'Débiter les points'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
