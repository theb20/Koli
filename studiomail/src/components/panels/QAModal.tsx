import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { useEditorStore } from '@/store/editorStore'
import { runQAChecks } from '@/lib/qa/checks'

export function QAModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditorStore(s => s.document)
  const select = useEditorStore(s => s.select)
  const issues = useMemo(() => runQAChecks(doc), [doc, open])
  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')

  const goTo = (blockId?: string) => {
    if (!blockId) return
    for (const section of doc.sections) {
      const direct = section.blocks.find(b => b.id === blockId)
      if (direct) { select({ sectionId: section.id, blockId }); onClose(); return }
      for (const b of section.blocks) {
        if (b.type === 'columns') {
          for (const col of b.columns) {
            if (col.blocks.some(cb => cb.id === blockId)) { select({ sectionId: section.id, columnId: col.id, blockId }); onClose(); return }
          }
        }
      }
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Contrôle qualité" width="max-w-lg">
      <div className="space-y-4">
        <p className="text-[12px] text-ink-faint">
          Vérifications statiques sur le document — pas une simulation de rendu réel dans Gmail, Outlook ou Apple Mail.
        </p>
        {issues.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-success-dim text-success px-4 py-3">
            <CheckCircle2 size={18} /> <span className="text-[13px] font-medium">Aucun problème détecté.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {[...errors, ...warnings].map(issue => (
              <button key={issue.id} onClick={() => goTo(issue.blockId)} disabled={!issue.blockId}
                className="w-full flex items-start gap-2.5 text-left rounded-xl border border-border px-3.5 py-2.5 hover:border-accent transition-colors disabled:cursor-default">
                {issue.severity === 'error' ? <XCircle size={15} className="text-danger shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="text-warn shrink-0 mt-0.5" />}
                <span className="text-[13px] text-ink">{issue.message}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
