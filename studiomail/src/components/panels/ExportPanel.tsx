import { useMemo, useState } from 'react'
import { Check, Copy, Download, FileCode2, FileText, Send } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Tabs } from '../ui/Tabs'
import { Button } from '../ui/Button'
import { useEditorStore } from '@/store/editorStore'
import { renderDocumentHtml } from '@/lib/html/renderDocumentHtml'
import { renderDocumentText } from '@/lib/html/textVersion'

type ExportTab = 'html' | 'text'

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = window.document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useEditorStore(s => s.document)
  const projectName = useEditorStore(s => s.projectName)
  const [tab, setTab] = useState<ExportTab>('html')
  const [copied, setCopied] = useState(false)

  const html = useMemo(() => renderDocumentHtml(doc), [doc, open])
  const text = useMemo(() => renderDocumentText(doc), [doc, open])
  const content = tab === 'html' ? html : text
  const slug = (projectName || 'email').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'email'

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Modal open={open} onClose={onClose} title="Exporter" width="max-w-3xl"
      footer={
        <>
          <Button variant="secondary" size="sm" icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={copy}>{copied ? 'Copié' : 'Copier le code'}</Button>
          <Button variant="primary" size="sm" icon={<Download size={14} />}
            onClick={() => downloadFile(tab === 'html' ? `${slug}.html` : `${slug}.txt`, content, tab === 'html' ? 'text/html' : 'text/plain')}>
            Télécharger {tab === 'html' ? '.html' : '.txt'}
          </Button>
        </>
      }>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Tabs value={tab} onChange={setTab} options={[{ value: 'html', label: 'HTML' }, { value: 'text', label: 'Texte brut' }]} className="w-56" />
          <p className="text-[11px] text-ink-faint inline-flex items-center gap-1">
            {tab === 'html' ? <FileCode2 size={12} /> : <FileText size={12} />} {(content.length / 1024).toFixed(1)} Ko
          </p>
        </div>
        <pre className="bg-ink text-white rounded-xl p-4 text-[11px] leading-relaxed overflow-auto max-h-[50vh] whitespace-pre-wrap break-all">{content}</pre>
        {tab === 'html' && (
          <div className="flex items-start gap-2.5 rounded-xl bg-accent-dim text-accent px-3.5 py-2.5">
            <Send size={15} className="shrink-0 mt-0.5" />
            <p className="text-[12px] leading-relaxed">
              Pour l'envoyer réellement depuis Skignas : copiez ce code, ouvrez <strong>koli-admin → E-mails de sécurité</strong>, activez <strong>« HTML personnalisé »</strong> et collez-le. L'e-mail collé sera assaini côté serveur avant tout envoi, et part identique à tous les destinataires (pas de personnalisation par nom).
            </p>
          </div>
        )}
        <p className="text-[11px] text-ink-faint">
          HTML autonome (tableaux + styles inline), pensé pour les clients de messagerie. Pas d'export ZIP avec ressources : ce studio n'héberge aucune image, les URL que vous renseignez sont utilisées telles quelles.
        </p>
      </div>
    </Modal>
  )
}
