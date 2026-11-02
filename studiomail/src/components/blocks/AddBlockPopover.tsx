import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BLOCK_GROUPS, BLOCK_META, LEAF_BLOCK_TYPES, ALL_BLOCK_TYPES } from '@/lib/blocks/meta'
import type { BlockType } from '@/types/document'
import { cn } from '@/lib/cn'

export function AddBlockPopover({ onPick, trigger, leafOnly }: { onPick: (type: BlockType) => void; trigger: ReactNode; leafOnly?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const types = leafOnly ? LEAF_BLOCK_TYPES : ALL_BLOCK_TYPES

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      {open && (
        <div className="absolute z-30 top-full mt-1.5 left-1/2 -translate-x-1/2 w-56 bg-surface border border-border rounded-xl shadow-xl p-2 animate-pop-in">
          {BLOCK_GROUPS.map(group => {
            const groupTypes = types.filter(t => BLOCK_META[t].group === group)
            if (groupTypes.length === 0) return null
            return (
              <div key={group} className="mb-1.5 last:mb-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint px-2 py-1">{group}</p>
                <div className="grid grid-cols-2 gap-1">
                  {groupTypes.map(type => {
                    const meta = BLOCK_META[type]
                    return (
                      <button key={type} onClick={() => { onPick(type); setOpen(false) }}
                        className={cn('flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-[11px] text-ink-dim hover:bg-accent-dim hover:text-accent transition-colors')}>
                        <meta.icon size={16} />
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
