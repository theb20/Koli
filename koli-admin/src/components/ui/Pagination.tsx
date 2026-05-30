import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  page: number
  totalPages: number
  total: number
  limit: number
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, limit, onChange }: Props) {
  if (totalPages <= 1) return null
  const from = (page - 1) * limit + 1
  const to   = Math.min(page * limit, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-500">
        {from}–{to} sur {total.toLocaleString('fr-FR')} résultats
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const p = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${p === page
                ? 'bg-indigo-600 text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
