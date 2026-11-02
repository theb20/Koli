import { useState } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextAreaField } from '../ui/Field'
import { useEditorStore } from '@/store/editorStore'
import { demoAIProvider } from '@/lib/ai/provider'

export function AIPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [brief, setBrief] = useState('')
  const [subjects, setSubjects] = useState<string[] | null>(null)
  const [loading, setLoading] = useState<'subjects' | 'generate' | null>(null)
  const setSubject = useEditorStore(s => s.setSubject)
  const loadProject = useEditorStore(s => s.loadProject)
  const projectName = useEditorStore(s => s.projectName)
  const projectId = useEditorStore(s => s.projectId)
  const category = useEditorStore(s => s.category)

  const suggestSubjects = async () => {
    setLoading('subjects')
    const result = await demoAIProvider.suggestSubjectLines(brief)
    setSubjects(result)
    setLoading(null)
  }

  const generate = async () => {
    setLoading('generate')
    const document = await demoAIProvider.generateFromBrief(brief)
    // Remplace le document courant — jamais silencieux : l'admin voit le
    // nouveau contenu apparaître dans le canevas derrière ce panneau.
    loadProject({ id: projectId ?? '', name: projectName, category, favorite: false, isTemplate: false, document, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    setLoading(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Création assistée" width="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl bg-accent-dim text-accent px-3.5 py-2.5">
          <Sparkles size={15} className="shrink-0 mt-0.5" />
          <p className="text-[12px] leading-relaxed">
            Mode démonstration — aucun fournisseur d'IA n'est connecté. Les suggestions ci-dessous sont générées par des règles simples et déterministes, pas par un modèle de langage. Brancher un vrai fournisseur se fait dans <code className="text-[11px]">lib/ai/provider.ts</code>, via un backend (jamais de clé API dans ce frontend).
          </p>
        </div>

        <TextAreaField label="Décrivez l'e-mail souhaité" value={brief} onChange={setBrief} rows={4}
          placeholder="Ex : une newsletter mensuelle pour annoncer 3 nouveaux articles de blog" />

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={<Wand2 size={14} />} loading={loading === 'subjects'} disabled={!brief.trim()} onClick={suggestSubjects}>
            Suggérer des objets
          </Button>
          <Button variant="primary" size="sm" icon={<Sparkles size={14} />} loading={loading === 'generate'} disabled={!brief.trim()} onClick={generate}>
            Générer l'e-mail (remplace le document actuel)
          </Button>
        </div>

        {subjects && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Objets suggérés</p>
            {subjects.map(s => (
              <button key={s} onClick={() => { setSubject(s); onClose() }}
                className="w-full text-left text-[13px] rounded-lg border border-border px-3 py-2 hover:border-accent hover:bg-accent-dim transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
