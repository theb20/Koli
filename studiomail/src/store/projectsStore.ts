import { create } from 'zustand'
import { newId } from '@/lib/id'
import { loadProjects, saveProjects } from '@/lib/storage'
import type { EmailDocument, Project, ProjectCategory } from '@/types/document'

interface ProjectsState {
  projects: Project[]
  hydrated: boolean
  hydrate: () => void
  create: (name: string, category: ProjectCategory, document: EmailDocument) => Project
  duplicate: (id: string) => Project | null
  rename: (id: string, name: string) => void
  remove: (id: string) => void
  toggleFavorite: (id: string) => void
  toggleTemplate: (id: string) => void
  saveDocument: (id: string, document: EmailDocument) => void
  getById: (id: string) => Project | undefined
  importProject: (project: Project) => Project
}

function persist(projects: Project[]) {
  saveProjects(projects)
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  hydrated: false,

  hydrate: () => {
    if (get().hydrated) return
    set({ projects: loadProjects(), hydrated: true })
  },

  create: (name, category, document) => {
    const now = new Date().toISOString()
    const project: Project = { id: newId('prj'), name, category, favorite: false, isTemplate: false, document, createdAt: now, updatedAt: now }
    set(state => {
      const projects = [project, ...state.projects]
      persist(projects)
      return { projects }
    })
    return project
  },

  duplicate: id => {
    const original = get().projects.find(p => p.id === id)
    if (!original) return null
    const now = new Date().toISOString()
    const copy: Project = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId('prj'),
      name: `${original.name} (copie)`,
      // Toujours une copie éditable, jamais un second modèle qui
      // encombrerait "Commencer à partir de" (voir toggleTemplate pour en
      // refaire un modèle explicitement).
      isTemplate: false,
      createdAt: now,
      updatedAt: now,
    }
    set(state => {
      const projects = [copy, ...state.projects]
      persist(projects)
      return { projects }
    })
    return copy
  },

  rename: (id, name) => set(state => {
    const projects = state.projects.map(p => p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p)
    persist(projects)
    return { projects }
  }),

  remove: id => set(state => {
    const projects = state.projects.filter(p => p.id !== id)
    persist(projects)
    return { projects }
  }),

  toggleFavorite: id => set(state => {
    const projects = state.projects.map(p => p.id === id ? { ...p, favorite: !p.favorite } : p)
    persist(projects)
    return { projects }
  }),

  toggleTemplate: id => set(state => {
    const projects = state.projects.map(p => p.id === id ? { ...p, isTemplate: !p.isTemplate, updatedAt: new Date().toISOString() } : p)
    persist(projects)
    return { projects }
  }),

  saveDocument: (id, document) => set(state => {
    const projects = state.projects.map(p => p.id === id ? { ...p, document, updatedAt: new Date().toISOString() } : p)
    persist(projects)
    return { projects }
  }),

  getById: id => get().projects.find(p => p.id === id),

  importProject: project => {
    const now = new Date().toISOString()
    const imported: Project = { ...project, id: newId('prj'), createdAt: now, updatedAt: now }
    set(state => {
      const projects = [imported, ...state.projects]
      persist(projects)
      return { projects }
    })
    return imported
  },
}))
