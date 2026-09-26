import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'
import { cn } from '../../lib/cn'

export type MenuItem =
  | { label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; disabled?: boolean; shortcut?: string }
  | { separator: true }

type Props = {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
  side?: 'bottom' | 'top'
  width?: number
  label?: string
  className?: string   // conteneur (ex. w-full quand le déclencheur occupe toute la largeur)
}

/**
 * Menu déroulant accessible (role="menu") : fermeture au clic extérieur et
 * sur Échap, navigation ↑/↓ entre les éléments.
 */
export function Menu({ trigger, items, align = 'right', side = 'bottom', width = 220, label, className }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const btns = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])]
        const i = btns.indexOf(document.activeElement as HTMLButtonElement)
        btns[(i + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length]?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    // Focus sur le premier élément à l'ouverture (clavier)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus())
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      {trigger({ open, toggle: () => setOpen(o => !o) })}
      {open && (
        <div role="menu" aria-label={label}
          style={{ width }}
          className={cn(
            'absolute z-50 py-1.5 rounded-cta border border-line bg-card shadow-popover',
            align === 'right' ? 'right-0' : 'left-0',
            side === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
          )}>
          {items.map((item, i) => 'separator' in item
            ? <div key={i} className="my-1.5 h-px bg-line" role="separator" />
            : (
              <button key={i} role="menuitem" type="button" disabled={item.disabled}
                onClick={() => { setOpen(false); item.onSelect() }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 h-9 text-left text-secondary transition-colors',
                  'hover:bg-hover-fill focus:bg-hover-fill focus:outline-none disabled:opacity-50',
                  item.danger ? 'text-down' : 'text-ink',
                )}>
                {item.icon && <span className="text-muted shrink-0">{item.icon}</span>}
                <span className="flex-1 truncate">{item.label}</span>
                {item.shortcut && <span className="text-micro text-muted">{item.shortcut}</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}

/** Bouton ⋮ ouvrant un menu d'actions */
export function KebabMenu({ items, label = 'Plus d\'actions' }: { items: MenuItem[]; label?: string }) {
  return (
    <Menu items={items} label={label} trigger={({ open, toggle }) => (
      <button type="button" onClick={toggle} aria-label={label} aria-haspopup="menu" aria-expanded={open}
        className="w-7 h-7 inline-flex items-center justify-center rounded-btn-sm text-ink-2 hover:bg-hover-fill transition-colors">
        <MoreVertical size={16} />
      </button>
    )} />
  )
}
