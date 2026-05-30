import type { ReactNode } from 'react'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}

export function Modal({ open, onClose, title, children, width = 'max-w-xl' }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} bg-white border border-slate-200 rounded-2xl shadow-xl`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

type ConfirmProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  loading?: boolean
}

export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel = 'Supprimer', loading }: ConfirmProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-50 rounded-xl">
            <span className="text-red-500 text-xl">⚠</span>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500 mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all disabled:opacity-50">
            {loading ? 'Suppression...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
