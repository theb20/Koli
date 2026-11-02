import { useState } from 'react'
import { Code2, FileStack, Sparkles } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextField, TextAreaField } from '../ui/Field'
import { TEMPLATES, blankDocument } from '@/lib/templates'
import { useProjectsStore } from '@/store/projectsStore'
import { newId } from '@/lib/id'
import { createDefaultBlock } from '@/lib/blocks/factory'
import type { EmailDocument, HtmlBlock, ProjectCategory } from '@/types/document'

type Source = 'blank' | 'html' | string

function freshDocument(source: EmailDocument): EmailDocument {
  const document: EmailDocument = JSON.parse(JSON.stringify(source))
  // Nouveaux identifiants — jamais les mêmes id que le modèle source (deux
  // projets issus du même modèle ne doivent jamais se confondre).
  for (const section of document.sections) {
    section.id = newId('sec')
    for (const block of section.blocks) block.id = newId('blk')
  }
  return document
}

export function NewProjectModal({ open, onClose, onCreate }: {
  open: boolean; onClose: () => void; onCreate: (name: string, category: ProjectCategory, document: EmailDocument) => void
}) {
  const customTemplates = useProjectsStore(s => s.projects.filter(p => p.isTemplate))
  const [name, setName] = useState('')
  const [source, setSource] = useState<Source>('blank')
  const [rawHtml, setRawHtml] = useState('')

  const reset = () => { setName(''); setSource('blank'); setRawHtml('') }

  const confirm = () => {
    const finalName = name.trim() || 'Sans titre'

    if (source === 'html') {
      if (!rawHtml.trim()) return
      const doc = blankDocument()
      const htmlBlock = createDefaultBlock('html') as HtmlBlock
      htmlBlock.html = rawHtml
      doc.sections[0]!.blocks.push(htmlBlock)
      onCreate(finalName, 'custom', doc)
      reset()
      return
    }

    if (source === 'blank') {
      onCreate(finalName, 'custom', blankDocument())
      reset()
      return
    }

    const builtIn = TEMPLATES.find(t => t.id === source)
    if (builtIn) {
      onCreate(finalName, builtIn.category, freshDocument(builtIn.document))
      reset()
      return
    }

    const custom = customTemplates.find(p => p.id === source)
    if (custom) {
      onCreate(finalName, custom.category, freshDocument(custom.document))
      reset()
    }
  }

  const canConfirm = source !== 'html' || rawHtml.trim().length > 0

  return (
    <Modal open={open} onClose={onClose} title="Nouveau projet" width="max-w-2xl"
      footer={<Button icon={<Sparkles size={14} />} disabled={!canConfirm} onClick={confirm}>Créer le projet</Button>}>
      <div className="space-y-4">
        <TextField label="Nom du projet" value={name} onChange={setName} placeholder="Ex : Newsletter d'octobre" />

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Commencer à partir de</p>
          <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
            <button onClick={() => setSource('blank')}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-5 text-[12px] transition-colors ${source === 'blank' ? 'border-accent bg-accent-dim text-accent' : 'border-border text-ink-dim hover:border-border-strong'}`}>
              <FileStack size={18} /> Document vierge
            </button>
            <button onClick={() => setSource('html')} title="Écrivez ou collez du HTML brut — le vôtre, ou copié depuis koli-admin → Emails"
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-5 text-[12px] transition-colors ${source === 'html' ? 'border-accent bg-accent-dim text-accent' : 'border-border text-ink-dim hover:border-border-strong'}`}>
              <Code2 size={18} /> HTML pur
            </button>

            {customTemplates.map(t => (
              <button key={t.id} onClick={() => setSource(t.id)} title={`Votre modèle « ${t.name} »`}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border py-5 px-2 text-[12px] text-center transition-colors ${source === t.id ? 'border-accent bg-accent-dim text-accent' : 'border-border text-ink-dim hover:border-border-strong'}`}>
                <span className="absolute top-1.5 right-1.5 text-[9px] font-semibold uppercase tracking-wide text-accent bg-accent-dim px-1.5 py-0.5 rounded-full">Perso</span>
                <span className="font-medium">{t.name}</span>
              </button>
            ))}

            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setSource(t.id)} title={t.description}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border py-5 px-2 text-[12px] text-center transition-colors ${source === t.id ? 'border-accent bg-accent-dim text-accent' : 'border-border text-ink-dim hover:border-border-strong'}`}>
                <span className="font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {source === 'html' && (
          <div className="space-y-2">
            <TextAreaField label="HTML (collé depuis koli-admin → Emails, ou écrit librement)"
              value={rawHtml} onChange={setRawHtml} rows={6} placeholder="<html>...</html>" className="font-mono text-[12px]" />
            <p className="text-[11px] text-ink-faint">
              Importé tel quel dans un bloc HTML (éditable en code, avec aperçu — pas décomposé en blocs visuels repositionnables). Rien n'est renvoyé automatiquement vers Skignas : pour republier, utilisez Exporter → copier dans koli-admin comme pour tout autre projet.
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
