import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { useEditorStore } from '@/store/editorStore'
import { useProjectsStore } from '@/store/projectsStore'
import { TopBar } from '@/components/layout/TopBar'
import { LeftPanel } from '@/components/layout/LeftPanel'
import { Canvas } from '@/components/layout/Canvas'
import { Inspector } from '@/components/layout/Inspector'
import { PreviewModal } from '@/components/panels/PreviewModal'
import { ExportPanel } from '@/components/panels/ExportPanel'
import { QAModal } from '@/components/panels/QAModal'
import { AIPanel } from '@/components/panels/AIPanel'

const AUTOSAVE_DELAY_MS = 1200

export default function EditorPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const hydrate = useProjectsStore(s => s.hydrate)
  const getById = useProjectsStore(s => s.getById)
  const saveDocument = useProjectsStore(s => s.saveDocument)
  const loadProject = useEditorStore(s => s.loadProject)
  const document_ = useEditorStore(s => s.document)
  const currentProjectId = useEditorStore(s => s.projectId)
  const dirty = useEditorStore(s => s.dirty)
  const markSaved = useEditorStore(s => s.markSaved)
  const [ready, setReady] = useState(false)

  const [preview, setPreview] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [qaOpen, setQaOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  useEffect(() => {
    hydrate()
    if (!projectId) { navigate('/'); return }
    const project = getById(projectId)
    if (!project) { navigate('/'); return }
    loadProject(project)
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Sauvegarde automatique — débattue pour ne pas écrire à chaque frappe,
  // voir cahier des charges section 11 ("sauvegarde automatique avec
  // indicateur d'état", affiché dans TopBar via `dirty`).
  useEffect(() => {
    if (!ready || !dirty || !currentProjectId) return
    const t = setTimeout(() => {
      saveDocument(currentProjectId, document_)
      markSaved()
    }, AUTOSAVE_DELAY_MS)
    return () => clearTimeout(t)
  }, [document_, dirty, ready, currentProjectId, saveDocument, markSaved])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); useEditorStore.getState().undo() }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); useEditorStore.getState().redo() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!ready) return null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }} className="h-full flex flex-col">
      <TopBar onPreview={() => setPreview(true)} onExport={() => setExportOpen(true)} onQA={() => setQaOpen(true)} onAI={() => setAiOpen(true)} />
      <div className="flex-1 flex min-h-0">
        <LeftPanel />
        <Canvas />
        <aside className="w-72 shrink-0 border-l border-border bg-surface overflow-y-auto">
          <Inspector />
        </aside>
      </div>
      <PreviewModal open={preview} onClose={() => setPreview(false)} />
      <ExportPanel open={exportOpen} onClose={() => setExportOpen(false)} />
      <QAModal open={qaOpen} onClose={() => setQaOpen(false)} />
      <AIPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </motion.div>
  )
}
