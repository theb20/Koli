import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { newId } from '@/lib/id'
import { createDefaultBlock, createDefaultLeafBlock, cloneBlockWithNewIds } from '@/lib/blocks/factory'
import type {
  Block, BlockType, EmailDocument, LeafBlock, Project, ProjectCategory, Section,
} from '@/types/document'

export type BlockPath = { sectionId: string; columnId?: string; blockId: string }

const MAX_HISTORY = 100

function emptyDocument(): EmailDocument {
  return { subject: '', preheader: '', pageBackground: '#f4f3f1', fontFamily: 'sans', sections: [] }
}

function emptySection(): Section {
  return { id: newId('sec'), backgroundColor: '#ffffff', contentWidthPx: 600, padding: { top: 0, right: 0, bottom: 0, left: 0 }, blocks: [] }
}

/** Trouve le tableau de blocs qui contient `columnId` (cherche dans tous les blocs "columns" de la section). */
function findColumnBlocks(section: Section, columnId: string): LeafBlock[] | null {
  for (const block of section.blocks) {
    if (block.type === 'columns') {
      const col = block.columns.find(c => c.id === columnId)
      if (col) return col.blocks
    }
  }
  return null
}

function findTargetArray(section: Section, columnId: string | undefined): Block[] | LeafBlock[] | null {
  if (!columnId) return section.blocks
  return findColumnBlocks(section, columnId)
}

interface EditorState {
  projectId: string | null
  projectName: string
  category: ProjectCategory
  document: EmailDocument
  selected: BlockPath | null
  selectedSectionId: string | null
  past: EmailDocument[]
  future: EmailDocument[]
  dirty: boolean
  lastSavedAt: string | null

  loadProject: (project: Project) => void
  newBlankDocument: (name: string, category: ProjectCategory) => void
  markSaved: () => void

  setSubject: (v: string) => void
  setPreheader: (v: string) => void
  setPageBackground: (v: string) => void
  setFontFamily: (v: 'sans' | 'serif') => void
  setProjectName: (v: string) => void

  addSection: (atIndex?: number) => string
  removeSection: (sectionId: string) => void
  updateSection: (sectionId: string, patch: Partial<Omit<Section, 'id' | 'blocks'>>) => void
  moveSection: (sectionId: string, toIndex: number) => void
  duplicateSection: (sectionId: string) => void

  addBlock: (sectionId: string, type: BlockType, atIndex?: number, columnId?: string) => string
  updateBlock: <T extends Block | LeafBlock>(path: BlockPath, patch: Partial<T>, opts?: { commit?: boolean }) => void
  removeBlock: (path: BlockPath) => void
  duplicateBlock: (path: BlockPath) => void
  moveBlock: (from: BlockPath, to: { sectionId: string; columnId?: string; index: number }) => void

  select: (path: BlockPath | null) => void
  selectSection: (sectionId: string | null) => void
  undo: () => void
  redo: () => void
}

export const useEditorStore = create<EditorState>()(
  immer(set => ({
    projectId: null,
    projectName: 'Sans titre',
    category: 'custom',
    document: emptyDocument(),
    selected: null,
    selectedSectionId: null,
    past: [],
    future: [],
    dirty: false,
    lastSavedAt: null,

    loadProject: project => set(state => {
      state.projectId = project.id
      state.projectName = project.name
      state.category = project.category
      state.document = project.document
      state.selected = null
      state.selectedSectionId = project.document.sections[0]?.id ?? null
      state.past = []
      state.future = []
      state.dirty = false
      state.lastSavedAt = project.updatedAt
    }),

    newBlankDocument: (name, category) => set(state => {
      state.projectId = null
      state.projectName = name
      state.category = category
      state.document = { ...emptyDocument(), sections: [emptySection()] }
      state.selected = null
      state.selectedSectionId = state.document.sections[0]?.id ?? null
      state.past = []
      state.future = []
      state.dirty = true
      state.lastSavedAt = null
    }),

    markSaved: () => set(state => { state.dirty = false; state.lastSavedAt = new Date().toISOString() }),

    setSubject: v => commitAnd(set, state => { state.document.subject = v }),
    setPreheader: v => commitAnd(set, state => { state.document.preheader = v }),
    setPageBackground: v => commitAnd(set, state => { state.document.pageBackground = v }),
    setFontFamily: v => commitAnd(set, state => { state.document.fontFamily = v }),
    setProjectName: v => set(state => { state.projectName = v; state.dirty = true }),

    addSection: atIndex => {
      const id = newId('sec')
      commitAnd(set, state => {
        const section = emptySection()
        section.id = id
        if (atIndex == null) state.document.sections.push(section)
        else state.document.sections.splice(atIndex, 0, section)
        state.selectedSectionId = id
        state.selected = null
      })
      return id
    },

    removeSection: sectionId => commitAnd(set, state => {
      state.document.sections = state.document.sections.filter(s => s.id !== sectionId)
      if (state.selected?.sectionId === sectionId) state.selected = null
      if (state.selectedSectionId === sectionId) state.selectedSectionId = state.document.sections[0]?.id ?? null
    }),

    updateSection: (sectionId, patch) => commitAnd(set, state => {
      const section = state.document.sections.find(s => s.id === sectionId)
      if (section) Object.assign(section, patch)
    }),

    moveSection: (sectionId, toIndex) => commitAnd(set, state => {
      const from = state.document.sections.findIndex(s => s.id === sectionId)
      if (from === -1) return
      const [section] = state.document.sections.splice(from, 1)
      state.document.sections.splice(toIndex, 0, section!)
    }),

    duplicateSection: sectionId => commitAnd(set, state => {
      const idx = state.document.sections.findIndex(s => s.id === sectionId)
      if (idx === -1) return
      const copy: Section = JSON.parse(JSON.stringify(state.document.sections[idx]))
      copy.id = newId('sec')
      copy.blocks = copy.blocks.map(b => cloneBlockWithNewIds(b))
      state.document.sections.splice(idx + 1, 0, copy)
    }),

    addBlock: (sectionId, type, atIndex, columnId) => {
      const id = newId('blk')
      commitAnd(set, state => {
        const section = state.document.sections.find(s => s.id === sectionId)
        if (!section) return
        const block = columnId ? createDefaultLeafBlock(type as Exclude<BlockType, 'columns'>) : createDefaultBlock(type)
        block.id = id
        const target = columnId ? findColumnBlocks(section, columnId) : section.blocks
        if (!target) return
        if (atIndex == null) target.push(block as never)
        else target.splice(atIndex, 0, block as never)
      })
      return id
    },

    updateBlock: (path, patch, opts) => {
      const apply = (state: EditorState) => {
        const section = state.document.sections.find(s => s.id === path.sectionId)
        if (!section) return
        const target = findTargetArray(section, path.columnId)
        const block = target?.find(b => b.id === path.blockId)
        if (block) Object.assign(block, patch)
      }
      if (opts?.commit === false) set(apply as never)
      else commitAnd(set, apply as never)
    },

    removeBlock: path => commitAnd(set, state => {
      const section = state.document.sections.find(s => s.id === path.sectionId)
      if (!section) return
      if (path.columnId) {
        const col = findColumnBlocks(section, path.columnId)
        if (col) {
          const i = col.findIndex(b => b.id === path.blockId)
          if (i !== -1) col.splice(i, 1)
        }
      } else {
        section.blocks = section.blocks.filter(b => b.id !== path.blockId)
      }
      if (state.selected?.blockId === path.blockId) state.selected = null
    }),

    duplicateBlock: path => commitAnd(set, state => {
      const section = state.document.sections.find(s => s.id === path.sectionId)
      if (!section) return
      const target = findTargetArray(section, path.columnId)
      if (!target) return
      const idx = target.findIndex(b => b.id === path.blockId)
      if (idx === -1) return
      const copy = cloneBlockWithNewIds(target[idx] as Block)
      target.splice(idx + 1, 0, copy as never)
    }),

    moveBlock: (from, to) => commitAnd(set, state => {
      const fromSection = state.document.sections.find(s => s.id === from.sectionId)
      const toSection = state.document.sections.find(s => s.id === to.sectionId)
      if (!fromSection || !toSection) return
      const fromArr = findTargetArray(fromSection, from.columnId)
      const toArr = findTargetArray(toSection, to.columnId)
      if (!fromArr || !toArr) return
      const idx = fromArr.findIndex(b => b.id === from.blockId)
      if (idx === -1) return
      const [block] = fromArr.splice(idx, 1)
      // Même liste : après avoir retiré l'élément, tout ce qui suivait son
      // ancienne position a déjà glissé d'un cran — compenser, sinon
      // l'élément atterrit un cran trop loin.
      const insertIndex = fromArr === toArr && idx < to.index ? to.index - 1 : to.index
      toArr.splice(insertIndex, 0, block as never)
    }),

    select: path => set(state => {
      state.selected = path
      if (path) state.selectedSectionId = path.sectionId
    }),

    selectSection: sectionId => set(state => {
      state.selectedSectionId = sectionId
      state.selected = null
    }),

    undo: () => set(state => {
      const prev = state.past.pop()
      if (!prev) return
      state.future.unshift(JSON.parse(JSON.stringify(state.document)))
      state.document = prev
      state.dirty = true
    }),

    redo: () => set(state => {
      const next = state.future.shift()
      if (!next) return
      state.past.push(JSON.parse(JSON.stringify(state.document)))
      state.document = next
      state.dirty = true
    }),
  })),
)

/** Pousse l'état courant dans l'historique PUIS applique la mutation — jamais l'inverse. */
function commitAnd(set: (fn: (state: EditorState) => void) => void, mutate: (state: EditorState) => void) {
  set(state => {
    state.past.push(JSON.parse(JSON.stringify(state.document)))
    if (state.past.length > MAX_HISTORY) state.past.shift()
    state.future = []
    state.dirty = true
  })
  set(mutate)
}

export function useCanUndo(): boolean {
  return useEditorStore(s => s.past.length > 0)
}
export function useCanRedo(): boolean {
  return useEditorStore(s => s.future.length > 0)
}
