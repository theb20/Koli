import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Eye, EyeOff, BookOpen } from 'lucide-react'
import { api, fmtDate } from '../../lib/api'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Confirm } from '../../components/ui/Modal'
import { Pagination } from '../../components/ui/Pagination'
import { PageTitle } from '../../components/layout/Sidebar'
import type { BlogPost } from '../../types'

async function fetchPosts(params: Record<string, string | number>) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '').map(([k, v]) => [k, String(v)]))
  const { data } = await api.get(`/api/blog/admin/all?${q}`)
  return data.data
}

export default function BlogPage() {
  const navigate = useNavigate()
  const qc       = useQueryClient()
  const [page, setPage]     = useState(1)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['blog-admin', page],
    queryFn: () => fetchPosts({ page, limit: 15 }),
    placeholderData: (prev) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/blog/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-admin'] }); setDeleteId(null) },
  })

  const togglePublish = useMutation({
    mutationFn: ({ id, isPublished }: { id: number; isPublished: boolean }) =>
      api.patch(`/api/blog/${id}/publish`, { isPublished: !isPublished }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-admin'] }),
  })

  const posts: BlogPost[] = data?.posts ?? []

  return (
    <div className="space-y-5">
      <PageTitle
        title="Blog"
        sub={`${data?.pagination?.total ?? 0} articles`}
        action={<Button icon={<Plus size={15} />} onClick={() => navigate('/blog/new')}>Nouvel article</Button>}
      />

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200">
              {['Article', 'Catégorie', 'Auteur', 'Vues', 'Statut', 'Publié le', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-8 bg-slate-100 rounded-lg animate-pulse" /></td></tr>
              ))
            ) : posts.length === 0 ? (
              <tr><td colSpan={7} className="py-16 text-center">
                <BookOpen size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">Aucun article</p>
              </td></tr>
            ) : (
              posts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        <img src={p.coverImage} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate max-w-[250px]">{p.title}</p>
                        <p className="text-xs text-slate-400 font-mono">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 capitalize">{p.category}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{p.author}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{p.views.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge label={p.isPublished ? 'published' : 'draft'} color={p.isPublished ? 'published' : 'draft'} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{p.publishedAt ? fmtDate(p.publishedAt) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => navigate(`/blog/${p.id}`)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all" title="Modifier">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => togglePublish.mutate({ id: p.id, isPublished: p.isPublished })}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all" title={p.isPublished ? 'Dépublier' : 'Publier'}>
                        {p.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => setDeleteId(p.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        {data?.pagination && (
          <Pagination page={page} totalPages={data.pagination.totalPages} total={data.pagination.total} limit={15} onChange={setPage} />
        )}
      </div>

      <Confirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        title="Supprimer cet article ?"
        message="Cette action est irréversible."
      />
    </div>
  )
}
