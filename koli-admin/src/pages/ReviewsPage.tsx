import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Star } from 'lucide-react'
import { api, fmtDate } from '../lib/api'
import { Confirm } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { PageTitle } from '../components/layout/Sidebar'
import type { Review } from '../types'

async function fetchReviews(page: number) {
  const { data } = await api.get(`/api/reviews/admin/all?page=${page}&limit=20`)
  return data.data
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={12} className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
      ))}
    </div>
  )
}

export default function ReviewsPage() {
  const qc              = useQueryClient()
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['reviews-admin', page],
    queryFn: () => fetchReviews(page),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/reviews/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reviews-admin'] }); setDeleteId(null) },
  })

  const reviews: Review[] = data?.reviews ?? []

  return (
    <div className="space-y-5">
      <PageTitle title="Avis clients" sub={`${data?.pagination?.total ?? 0} avis`} />

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Auteur', 'Produit', 'Note', 'Commentaire', 'Vérifié', 'Date', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : reviews.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center">
                <Star size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucun avis</p>
              </td></tr>
            ) : (
              reviews.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{r.authorName}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{r.product?.name ?? `#${r.productId}`}</td>
                  <td className="px-4 py-3"><Stars rating={r.rating} /></td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">{r.comment ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs">{r.isVerified
                    ? <span className="text-green-600 font-medium">✓ Vérifié</span>
                    : <span className="text-slate-400">Non vérifié</span>}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDeleteId(r.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {data?.pagination && (
          <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={20} onChange={setPage} />
        )}
      </div>

      <Confirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Supprimer cet avis ?"
        message="L'avis sera définitivement supprimé."
      />
    </div>
  )
}
