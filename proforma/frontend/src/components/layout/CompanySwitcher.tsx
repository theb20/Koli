import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Plus } from '../ui/Icon'
import { useAuthStore } from '../../store/authStore'
import { assetUrl } from '../../lib/api'
import { CompanyFormModal } from '../company/CompanyFormModal'

export function CompanySwitcher() {
  const companies = useAuthStore((s) => s.companies)
  const activeCompanyId = useAuthStore((s) => s.activeCompanyId)
  const setActiveCompany = useAuthStore((s) => s.setActiveCompany)
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const active = companies.find((c) => c.id === activeCompanyId)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-border bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-gray-50"
      >
        {active?.logoUrl ? (
          <img src={assetUrl(active.logoUrl)} alt="" className="h-5 w-5 object-contain" />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center bg-brand-light text-[9px] font-bold text-brand-dark">
            {active?.name?.[0]}
          </div>
        )}
        <span className="max-w-[160px] truncate">{active?.name || 'Sélectionner'}</span>
        <ChevronDown size={14} className="text-muted" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-64 border border-border bg-white p-1.5 shadow-lg">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveCompany(c.id)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm hover:bg-gray-50"
            >
              <span className="flex-1 truncate">{c.name}</span>
              {c.id === activeCompanyId && <Check size={14} className="text-brand" />}
            </button>
          ))}
          <div className="my-1 border-t border-border" />
          <button
            onClick={() => {
              setCreateOpen(true)
              setOpen(false)
            }}
            className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left text-sm font-medium text-brand hover:bg-brand-light"
          >
            <Plus size={14} /> Nouvelle entreprise
          </button>
        </div>
      )}

      <CompanyFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
