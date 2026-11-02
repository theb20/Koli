import { useMemo, useState } from 'react'
import { Laptop, Smartphone, Tablet } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useEditorStore } from '@/store/editorStore'
import { renderDocumentHtml } from '@/lib/html/renderDocumentHtml'
import { cn } from '@/lib/cn'

type Device = 'desktop' | 'tablet' | 'mobile'
const WIDTH: Record<Device, number> = { desktop: 680, tablet: 480, mobile: 375 }

export function PreviewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditorStore(s => s.document)
  const [device, setDevice] = useState<Device>('desktop')
  // Rendu depuis le MÊME moteur que l'export final (voir lib/html) — jamais
  // une approximation, exactement ce qui sera envoyé.
  const html = useMemo(() => renderDocumentHtml(doc), [doc, open])

  return (
    <Modal open={open} onClose={onClose} title="Aperçu" width="max-w-4xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-canvas border border-border w-fit">
            {([['desktop', Laptop], ['tablet', Tablet], ['mobile', Smartphone]] as const).map(([d, Icon]) => (
              <button key={d} onClick={() => setDevice(d)}
                className={cn('w-8 h-7 rounded-md inline-flex items-center justify-center transition-colors', device === d ? 'bg-surface text-accent shadow-sm' : 'text-ink-dim hover:text-ink')}>
                <Icon size={14} />
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-faint">Rendu interne — pas une simulation certifiée Gmail/Outlook/Apple Mail.</p>
        </div>
        <div className="bg-canvas rounded-xl border border-border p-6 flex justify-center overflow-auto max-h-[60vh]">
          <iframe
            title="Aperçu de l'e-mail"
            srcDoc={html}
            style={{ width: WIDTH[device], height: 640 }}
            className="bg-white rounded-lg shadow-lg border border-border shrink-0"
          />
        </div>
      </div>
    </Modal>
  )
}
