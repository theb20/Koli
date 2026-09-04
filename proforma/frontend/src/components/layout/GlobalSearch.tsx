import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FileText, Receipt, Users, Package } from '../ui/Icon'
import { api } from '../../lib/api'
import { formatMoney } from '../../lib/money'
import { useAuthStore } from '../../store/authStore'
import type { Currency } from '../../types'

interface SearchResults {
  proformas: { id: string; number: string; total: number; currency: Currency; status: string }[]
  invoices: { id: string; number: string; total: number; currency: Currency; status: string }[]
  clients: { id: string; name: string; email?: string | null }[]
  products: { id: string; name: string; unitPrice: number }[]
}

const EMPTY: SearchResults = { proformas: [], invoices: [], clients: [], products: [] }

export function GlobalSearch() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [open, setOpen] = useState(false)
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (!activeCompanyId || q.trim().length < 2) {
      setResults(EMPTY)
      return
    }
    const handle = setTimeout(async () => {
      try {
        const res = await api.get<SearchResults & { success: true }>(`/api/companies/${activeCompanyId}/search?q=${encodeURIComponent(q)}`)
        setResults(res)
        setOpen(true)
      } catch {
        setResults(EMPTY)
      }
    }, 250)
    return () => clearTimeout(handle)
  }, [q, activeCompanyId])

  const hasResults = results.proformas.length || results.invoices.length || results.clients.length || results.products.length

  function go(path: string) {
    navigate(path)
    setOpen(false)
    setQ('')
  }

  return (
    <div className="relative flex-1 max-w-md" ref={ref}>
      <div className="flex items-center gap-2 border border-border bg-gray-50 px-3 py-2">
        <Search size={15} className="text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.length >= 2 && setOpen(true)}
          placeholder="Rechercher une proforma, un client, un produit…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 top-full z-30 mt-1.5 w-full max-h-96 overflow-y-auto border border-border bg-white p-1.5 shadow-lg">
          {!hasResults && <p className="px-3 py-4 text-center text-sm text-muted">Aucun résultat pour « {q} »</p>}

          {results.proformas.length > 0 && (
            <div className="mb-1">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">Proformas</p>
              {results.proformas.map((p) => (
                <button key={p.id} onClick={() => go(`/proformas/${p.id}`)} className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm hover:bg-gray-50">
                  <FileText size={14} className="text-brand" />
                  <span className="flex-1 truncate">{p.number}</span>
                  <span className="text-xs text-muted">{formatMoney(p.total, p.currency)}</span>
                </button>
              ))}
            </div>
          )}
          {results.invoices.length > 0 && (
            <div className="mb-1">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">Factures</p>
              {results.invoices.map((p) => (
                <button key={p.id} onClick={() => go(`/factures/${p.id}`)} className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm hover:bg-gray-50">
                  <Receipt size={14} className="text-brand" />
                  <span className="flex-1 truncate">{p.number}</span>
                  <span className="text-xs text-muted">{formatMoney(p.total, p.currency)}</span>
                </button>
              ))}
            </div>
          )}
          {results.clients.length > 0 && (
            <div className="mb-1">
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">Clients</p>
              {results.clients.map((c) => (
                <button key={c.id} onClick={() => go(`/clients/${c.id}`)} className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm hover:bg-gray-50">
                  <Users size={14} className="text-brand" />
                  <span className="flex-1 truncate">{c.name}</span>
                </button>
              ))}
            </div>
          )}
          {results.products.length > 0 && (
            <div>
              <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">Produits</p>
              {results.products.map((p) => (
                <button key={p.id} onClick={() => go('/produits')} className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm hover:bg-gray-50">
                  <Package size={14} className="text-brand" />
                  <span className="flex-1 truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
