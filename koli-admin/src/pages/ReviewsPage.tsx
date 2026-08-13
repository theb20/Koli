import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Star } from 'lucide-react'
import { api, fmtDate } from '../lib/api'
import { Confirm } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { PageTitle } from '../components/layout/Sidebar'
import type { Review } from '../types'

type Tab = 'product' | 'site'

/* Les avis plateforme (déposés depuis la page d'accueil, sans produit) vivent
   dans une table distincte — d'où deux endpoints et deux onglets. */
async function fetchReviews(tab: Tab, page: number) {
  const path = tab === 'site' ? '/api/reviews/admin/site' : '/api/reviews/admin/all'
  const { data } = await api.get(`${path}?page=${page}&limit=20`)
  return data.data
}

type SiteReview = {
  id: string
  rating: number
  body: string
  images?: string[]
  helpful: number
  createdAt: string
  user?: { prenom: string; nom: string; email: string }
}

function Photos({ urls }: { urls?: string[] }) {
  if (!urls || urls.length === 0) return <span className="text-slate-300">—</span>
  return (
    <div className="flex gap-1">
      {urls.slice(0, 4).map((u, i) => (
        <a key={i} href={u} target="_blank" rel="noreferrer"
           className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 hover:opacity-75 transition-opacity">
          <img src={u} alt="" className="w-full h-full object-cover" />
        </a>
      ))}
    </div>
  )
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
  const [tab, setTab]   = useState<Tab>('product')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['reviews-admin', tab, page],
    queryFn: () => fetchReviews(tab, page),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    // Routes admin dédiées : /api/reviews/:id est filtrée sur l'auteur
    // ("supprimer mon avis") et renvoyait un 404 à l'administrateur.
    mutationFn: (id: string | number) =>
      api.delete(tab === 'site' ? `/api/reviews/admin/site/${id}` : `/api/reviews/admin/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reviews-admin'] }); setDeleteId(null) },
  })

  const reviews: Review[]         = tab === 'product' ? (data?.reviews ?? []) : []
  const siteReviews: SiteReview[] = tab === 'site'    ? (data?.reviews ?? []) : []

  return (
    <div className="space-y-5">
      <PageTitle
        title="Avis clients"
        sub={`${data?.pagination?.total ?? 0} ${tab === 'site' ? 'avis sur la plateforme' : 'avis produit'}`}
      />

      <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm w-fit">
        {([
          { value: 'product' as Tab, label: 'Avis produit' },
          { value: 'site'    as Tab, label: 'Avis plateforme' },
        ]).map(t => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${tab === t.value
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {(tab === 'site'
                ? ['Auteur', 'Note', 'Commentaire', 'Photos', 'Utile', 'Date', '']
                : ['Auteur', 'Produit', 'Note', 'Commentaire', 'Photos', 'Vérifié', 'Date', '']
              ).map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={tab === 'site' ? 7 : 8} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : (tab === 'site' ? siteReviews.length : reviews.length) === 0 ? (
              <tr><td colSpan={tab === 'site' ? 7 : 8} className="py-16 text-center">
                <Star size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">
                  {tab === 'site' ? 'Aucun avis sur la plateforme' : 'Aucun avis produit'}
                </p>
              </td></tr>
            ) : tab === 'site' ? (
              siteReviews.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">
                      {r.user ? `${r.user.prenom} ${r.user.nom}`.trim() : '—'}
                    </p>
                    <p className="text-xs text-slate-400">{r.user?.email}</p>
                  </td>
                  <td className="px-4 py-3"><Stars rating={r.rating} /></td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-sm">{r.body}</td>
                  <td className="px-4 py-3"><Photos urls={r.images} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{r.helpful}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDeleteId(r.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              reviews.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {r.user ? `${r.user.prenom} ${r.user.nom}`.trim() : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{r.product?.name ?? `#${r.productId}`}</td>
                  <td className="px-4 py-3"><Stars rating={r.rating} /></td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-sm">
                    {r.body || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3"><Photos urls={r.images} /></td>
                  <td className="px-4 py-3 text-xs">{r.verified
                    ? <span className="text-green-600 font-medium">✓ Vérifié</span>
                    : <span className="text-slate-400">Non vérifié</span>}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDeleteId(r.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 size={14} />
                    </button>
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
