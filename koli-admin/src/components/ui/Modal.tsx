import { useEffect, useId, useState, type ReactNode } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

/** Échap ferme + blocage du scroll de page pendant l'ouverture. */
function useDialogBehavior(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])
}

type ModalProps = { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: string }

export function Modal({ open, onClose, title, children, width = 'max-w-xl' }: ModalProps) {
  const id = useId()
  useDialogBehavior(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-labelledby={id}
        className={cn('relative w-full max-h-[90vh] flex flex-col bg-card border border-line rounded-card shadow-popover', width)}>
        <div className="flex items-center justify-between px-[22px] py-4 border-b border-line shrink-0">
          <h2 id={id} className="text-body font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="w-7 h-7 inline-flex items-center justify-center rounded-btn-sm text-muted hover:bg-hover-fill hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-[22px] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/** Panneau latéral droit (fiche détail), 480px. */
export function Drawer({ open, onClose, title, children, width = 480, footer }: {
  open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; width?: number; footer?: ReactNode
}) {
  const id = useId()
  useDialogBehavior(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" aria-labelledby={id} style={{ width }}
        className="absolute right-0 top-0 h-full max-w-full flex flex-col bg-card border-l border-line">
        <div className="flex items-center justify-between gap-3 px-[22px] h-16 border-b border-line shrink-0">
          <h2 id={id} className="text-card-title font-medium text-ink truncate">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fermer"
            className="w-8 h-8 inline-flex items-center justify-center rounded-full border border-line text-ink-2 hover:bg-hover-fill transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-[22px]">{children}</div>
        {footer && <div className="px-[22px] py-4 border-t border-line shrink-0">{footer}</div>}
      </aside>
    </div>
  )
}

type ConfirmProps = {
  open: boolean; onClose: () => void; onConfirm: () => void
  title: string; message: string; confirmLabel?: string; loading?: boolean
  /** Si défini, l'utilisateur doit taper ce texte pour confirmer (actions irréversibles). */
  confirmText?: string
}

/** Confirmation d'action destructrice. `Confirm` = alias historique. */
export function ConfirmDialog(props: ConfirmProps) {
  // Contenu monté seulement à l'ouverture : la saisie repart de zéro à chaque fois
  return props.open ? <ConfirmDialogContent {...props} /> : null
}

function ConfirmDialogContent({ open, onClose, onConfirm, title, message, confirmLabel = 'Supprimer', loading, confirmText }: ConfirmProps) {
  const id = useId()
  const [typed, setTyped] = useState('')
  useDialogBehavior(open, onClose)
  const blocked = !!confirmText && typed.trim() !== confirmText
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} aria-hidden />
      <div role="alertdialog" aria-modal="true" aria-labelledby={id}
        className="relative w-full max-w-sm bg-card border border-line rounded-card shadow-popover p-[22px]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-nav bg-down-bg text-down flex items-center justify-center shrink-0"><AlertTriangle size={18} /></div>
          <div>
            <h3 id={id} className="text-body font-semibold text-ink">{title}</h3>
            <p className="text-secondary text-ink-2 mt-1">{message}</p>
          </div>
        </div>
        {confirmText && (
          <label className="block mb-4">
            <span className="text-caption text-ink-2">Tapez <strong className="text-ink">{confirmText}</strong> pour confirmer</span>
            <input value={typed} onChange={e => setTyped(e.target.value)} autoFocus
              className="mt-1.5 w-full h-9 px-3 rounded-input border border-line bg-card text-body text-ink focus:border-primary" />
          </label>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={loading} disabled={blocked}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

export const Confirm = ConfirmDialog
