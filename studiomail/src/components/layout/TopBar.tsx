import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Code2, Eye, ListChecks, Redo2, Sparkles, Undo2 } from 'lucide-react'
import { useEditorStore, useCanUndo, useCanRedo } from '@/store/editorStore'
import { IconButton, Button } from '../ui/Button'
import { ThemeToggle } from '../ui/ThemeToggle'
import { SKIGNAS_LOGO_URL } from '@/lib/assets'

export function TopBar({ onPreview, onExport, onQA, onAI }: { onPreview: () => void; onExport: () => void; onQA: () => void; onAI: () => void }) {
  const navigate = useNavigate()
  const projectName = useEditorStore(s => s.projectName)
  const setProjectName = useEditorStore(s => s.setProjectName)
  const dirty = useEditorStore(s => s.dirty)
  const undo = useEditorStore(s => s.undo)
  const redo = useEditorStore(s => s.redo)
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  return (
    <header className="h-14 shrink-0 border-b border-border bg-surface flex items-center gap-2 px-3">
      <img src={SKIGNAS_LOGO_URL} alt="Skignas" className="h-5 w-auto shrink-0 mr-1" />
      <IconButton title="Retour aux projets" onClick={() => navigate('/')}><ArrowLeft size={16} /></IconButton>
      <input value={projectName} onChange={e => setProjectName(e.target.value)}
        className="h-8 px-2 rounded-lg text-sm font-medium bg-transparent hover:bg-black/5 focus:bg-black/5 outline-none min-w-0 w-48" />
      <span className="text-[11px] text-ink-faint inline-flex items-center gap-1 shrink-0">
        {dirty ? 'Non enregistré' : <><Check size={12} className="text-success" /> Enregistré</>}
      </span>

      <div className="w-px h-6 bg-border mx-1" />
      <IconButton title="Annuler" disabled={!canUndo} onClick={undo}><Undo2 size={15} /></IconButton>
      <IconButton title="Rétablir" disabled={!canRedo} onClick={redo}><Redo2 size={15} /></IconButton>

      <div className="flex-1" />

      <Button variant="ghost" size="sm" icon={<Sparkles size={14} />} onClick={onAI}>IA</Button>
      <Button variant="ghost" size="sm" icon={<ListChecks size={14} />} onClick={onQA}>Contrôle qualité</Button>
      <Button variant="secondary" size="sm" icon={<Eye size={14} />} onClick={onPreview}>Aperçu</Button>
      <Button variant="primary" size="sm" icon={<Code2 size={14} />} onClick={onExport}>Exporter</Button>
      <div className="w-px h-6 bg-border mx-1" />
      <ThemeToggle />
    </header>
  )
}
