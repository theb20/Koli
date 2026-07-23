import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface DrawerProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export function Drawer({ title, onClose, children }: DrawerProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[#0a0a0b]/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-white border-l border-[#e8e8e4] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8e8e4] sticky top-0 bg-white z-10">
          <h2 id="drawer-title" className="font-bold text-lg text-[#0a0a0b]">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="p-1.5 rounded-lg text-[#6b6b68] hover:bg-[#f0f0ed] hover:text-[#0a0a0b] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
