import { CheckCircle2, XCircle, Info, X } from './Icon'
import { useUiStore } from '../../store/uiStore'

const ICONS = { success: CheckCircle2, error: XCircle, info: Info }
const COLORS = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  error: 'bg-red-50 text-red-800 border-red-200',
  info: 'bg-gray-900 text-white border-gray-900',
}

export function ToastPortal() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 no-print">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant]
        return (
          <div
            key={t.id}
            className={`flex items-center gap-2.5 border px-4 py-3 text-sm font-medium shadow-lg ${COLORS[t.variant]} animate-[fadeIn_0.15s_ease-out]`}
          >
            <Icon size={16} className="shrink-0" />
            <span>{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="ml-1 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
