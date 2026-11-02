import { create } from 'zustand'
import type { BlockPath } from './editorStore'

/** État de glisser-déposer éphémère — jamais persisté, jamais dans l'historique d'annulation. */
interface DndState {
  draggedPath: BlockPath | null
  overPath: (BlockPath & { edge: 'before' | 'after' }) | null
  setDragged: (p: BlockPath | null) => void
  setOver: (p: (BlockPath & { edge: 'before' | 'after' }) | null) => void
}

export const useDndStore = create<DndState>(set => ({
  draggedPath: null,
  overPath: null,
  setDragged: p => set({ draggedPath: p }),
  setOver: p => set({ overPath: p }),
}))
