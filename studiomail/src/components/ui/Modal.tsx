import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/cn'

export function Modal({ open, onClose, title, children, width = 'max-w-lg', footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string; footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}
            className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
          <motion.div
            initial={{ opacity: 0, scale: .97, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .98 }}
            transition={{ duration: .16, ease: [.2, .8, .2, 1] }}
            role="dialog" aria-modal="true"
            className={cn('relative w-full bg-surface border border-border rounded-2xl shadow-2xl max-h-[88vh] flex flex-col', width)}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="font-semibold text-ink">{title}</h2>
              <button onClick={onClose} aria-label="Fermer" className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-ink-dim hover:bg-black/5 hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">{children}</div>
            {footer && <div className="px-5 py-3.5 border-t border-border shrink-0 flex items-center justify-end gap-2">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
