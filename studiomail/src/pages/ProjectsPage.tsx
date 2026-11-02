import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Download, FileStack, LayoutTemplate, MoreHorizontal, Pencil, Plus, Star, Trash2, Upload } from 'lucide-react'
import { useProjectsStore } from '@/store/projectsStore'
import { Button, IconButton } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { NewProjectModal } from '@/components/panels/NewProjectModal'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { SKIGNAS_LOGO_URL } from '@/lib/assets'
import { projectFileSchema, PROJECT_FILE_VERSION, type EmailDocument, type Project, type ProjectCategory } from '@/types/document'

/** Apparition en cascade — même rythme que koli-admin (fondu + translateY(8px), 180 ms, décalage 40 ms, plafonné). */
function Reveal({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .18, ease: 'easeOut', delay: Math.min(i, 12) * 0.04 }}>
      {children}
    </motion.div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ProjectMenu({ project }: { project: Project }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const duplicate = useProjectsStore(s => s.duplicate)
  const remove = useProjectsStore(s => s.remove)
  const rename = useProjectsStore(s => s.rename)
  const toggleFavorite = useProjectsStore(s => s.toggleFavorite)
  const toggleTemplate = useProjectsStore(s => s.toggleTemplate)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const exportJson = () => {
    const file = { formatVersion: PROJECT_FILE_VERSION, project }
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'projet'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="relative" ref={ref} onClick={e => e.stopPropagation()}>
      <IconButton title="Actions" onClick={() => setOpen(v => !v)}><MoreHorizontal size={15} /></IconButton>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-xl shadow-xl py-1.5 z-20 animate-pop-in">
          <button onClick={() => { toggleFavorite(project.id); setOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink hover:bg-black/5"><Star size={13} /> {project.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</button>
          <button onClick={() => { toggleTemplate(project.id); setOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink hover:bg-black/5">
            <LayoutTemplate size={13} /> {project.isTemplate ? 'Retirer des modèles' : 'Enregistrer comme modèle'}
          </button>
          <button onClick={() => { const n = window.prompt('Nouveau nom', project.name); if (n?.trim()) rename(project.id, n.trim()); setOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink hover:bg-black/5"><Pencil size={13} /> Renommer</button>
          <button onClick={() => { duplicate(project.id); setOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink hover:bg-black/5"><FileStack size={13} /> Dupliquer</button>
          <button onClick={() => { exportJson(); setOpen(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-ink hover:bg-black/5"><Download size={13} /> Exporter en JSON</button>
          <div className="h-px bg-border my-1" />
          <button onClick={() => { if (window.confirm(`Supprimer « ${project.name} » ? Cette action est irréversible.`)) remove(project.id); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-danger hover:bg-danger-dim"><Trash2 size={13} /> Supprimer</button>
        </div>
      )}
    </div>
  )
}

export default function ProjectsPage() {
  const navigate = useNavigate()
  const hydrate = useProjectsStore(s => s.hydrate)
  const projects = useProjectsStore(s => s.projects)
  const create = useProjectsStore(s => s.create)
  const importProject = useProjectsStore(s => s.importProject)
  const [search, setSearch] = useState('')
  const [templatesOnly, setTemplatesOnly] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { hydrate() }, [hydrate])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = q ? projects.filter(p => p.name.toLowerCase().includes(q)) : projects
    if (templatesOnly) list = list.filter(p => p.isTemplate)
    return [...list].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt))
  }, [projects, search, templatesOnly])

  const handleCreate = (name: string, category: ProjectCategory, document: EmailDocument) => {
    const project = create(name, category, document)
    setNewOpen(false)
    navigate(`/editor/${project.id}`)
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = projectFileSchema.safeParse(JSON.parse(text))
      if (!parsed.success) {
        window.alert('Fichier de projet invalide ou format non reconnu.')
        return
      }
      const imported = importProject(parsed.data.project)
      navigate(`/editor/${imported.id}`)
    } catch {
      window.alert('Impossible de lire ce fichier — vérifiez qu’il s’agit bien d’un export StudioMail (.json).')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }} className="min-h-full">
      <header className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-3">
          <img src={SKIGNAS_LOGO_URL} alt="Skignas" className="h-7 w-auto" />
          <div className="w-px h-6 bg-border" />
          <div>
            <p className="font-semibold text-[15px] text-ink tracking-tight leading-none">StudioMail</p>
            <p className="text-caption text-muted leading-none mt-1">Studio e-mail Skignas</p>
          </div>
          <div className="flex-1" />
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = '' }} />
          <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => fileInputRef.current?.click()}>Importer</Button>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => setNewOpen(true)}>Nouveau projet</Button>
          <div className="w-px h-6 bg-border mx-1" />
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-6">
          <TextField value={search} onChange={setSearch} placeholder="Rechercher un projet..." className="max-w-xs" />
          <button onClick={() => setTemplatesOnly(v => !v)}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-input border text-[13px] font-medium transition-colors shrink-0 ${templatesOnly ? 'border-accent bg-accent-dim text-accent' : 'border-border text-ink-dim hover:bg-hover-fill'}`}>
            <LayoutTemplate size={14} /> Mes modèles
          </button>
        </div>

        {filtered.length === 0 ? (
          templatesOnly ? (
            <EmptyState icon={LayoutTemplate} title="Aucun modèle personnel"
              description="Depuis un projet existant, menu « ⋯ » → Enregistrer comme modèle — il apparaîtra ensuite dans « Commencer à partir de »." />
          ) : (
            <EmptyState icon={FileStack} title={projects.length === 0 ? 'Aucun projet encore' : 'Aucun résultat'}
              description={projects.length === 0 ? 'Créez votre premier e-mail à partir d’un modèle ou d’un document vierge.' : undefined}
              action={projects.length === 0 && <Button icon={<Plus size={14} />} onClick={() => setNewOpen(true)}>Nouveau projet</Button>} />
          )
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((project, i) => (
              <Reveal key={project.id} i={i}>
                <div onClick={() => navigate(`/editor/${project.id}`)}
                  className="group cursor-pointer rounded-2xl border border-border bg-surface overflow-hidden hover:border-border-strong hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,.12)] hover:-translate-y-0.5 transition-all duration-200">
                  <div className="h-28 flex items-center justify-center" style={{ background: project.document.pageBackground }}>
                    <p className="text-[11px] text-ink-faint px-4 text-center line-clamp-2">{project.document.subject || 'Sans objet'}</p>
                  </div>
                  <div className="p-3.5 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink truncate flex items-center gap-1.5">
                        {project.favorite && <Star size={11} className="text-warn fill-warn shrink-0" />}
                        {project.isTemplate && <LayoutTemplate size={11} className="text-accent shrink-0" />}
                        {project.name}
                      </p>
                      <p className="text-[11px] text-ink-faint mt-0.5">Modifié le {formatDate(project.updatedAt)}</p>
                    </div>
                    <ProjectMenu project={project} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </main>

      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={handleCreate} />
    </motion.div>
  )
}
