import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'

export interface ActionsMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface ActionsMenuProps {
  items: ActionsMenuItem[]
}

export function ActionsMenu({ items }: ActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Actions"
        className="p-1.5 rounded-lg text-[#6b6b68] hover:bg-[#f0f0ed] hover:text-[#0a0a0b] transition-colors"
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-44 bg-white border border-[#e8e8e4] rounded-xl py-1.5 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
              className={`w-full text-left px-3.5 py-2 text-sm font-medium transition-colors ${
                item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-[#0a0a0b] hover:bg-[#f0f0ed]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
