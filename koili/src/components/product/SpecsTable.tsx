import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const VISIBLE_ROWS = 12

export function SpecsTable({ specs }: { specs: { label: string; value: string }[] }) {
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const hasOverflow = specs.length > VISIBLE_ROWS
  const rows = expanded ? specs : specs.slice(0, VISIBLE_ROWS)

  return (
    <div className="max-w-2xl">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-ink">Spécifications</h2>
        {open ? <ChevronUp size={20} className="text-muted" /> : <ChevronDown size={20} className="text-muted" />}
      </button>

      {open && (
        specs.length === 0 ? (
          <p className="text-muted text-sm">Aucune spécification disponible.</p>
        ) : (
          <div className="relative">
            <dl className="rounded-xl border border-border overflow-hidden">
              {rows.map((s, i) => (
                <div
                  key={i}
                  className={`flex gap-4 px-4 py-4 ${i % 2 === 0 ? 'bg-surface' : 'bg-base'}`}
                >
                  <dt className="text-sm font-medium text-ink w-[180px] shrink-0">{s.label}</dt>
                  <dd className="text-sm text-muted">{s.value}</dd>
                </div>
              ))}
            </dl>

            {hasOverflow && !expanded && (
              <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
            )}

            {hasOverflow && (
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="px-4 py-2 rounded-full border border-border text-sm font-semibold text-ink hover:bg-base transition-colors flex items-center gap-1.5"
                >
                  {expanded ? <>Voir moins <ChevronUp size={14} /></> : <>Voir plus <ChevronDown size={14} /></>}
                </button>
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}
