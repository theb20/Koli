import { useState, type DragEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Copy, Mail, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useEditorStore } from '@/store/editorStore'
import { useDndStore } from '@/store/dndStore'
import { BlockRenderer } from '../blocks/BlockRenderer'
import { AddBlockPopover } from '../blocks/AddBlockPopover'
import { EmptyState } from '../ui/EmptyState'
import type { BlockType } from '@/types/document'

function SectionEndDropZone({ sectionId, index }: { sectionId: string; index: number }) {
  const moveBlock = useEditorStore(s => s.moveBlock)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault()
        setOver(false)
        const dragged = useDndStore.getState().draggedPath
        useDndStore.getState().setDragged(null)
        if (!dragged) return
        moveBlock(dragged, { sectionId, index })
      }}
      className={cn('h-4 rounded transition-colors', over && 'bg-accent-dim')}
    />
  )
}

function SectionView({ sectionId, index, total }: { sectionId: string; index: number; total: number }) {
  const section = useEditorStore(s => s.document.sections.find(sec => sec.id === sectionId))
  const selectedSectionId = useEditorStore(s => s.selectedSectionId)
  const selected = useEditorStore(s => s.selected)
  const selectSection = useEditorStore(s => s.selectSection)
  const removeSection = useEditorStore(s => s.removeSection)
  const duplicateSection = useEditorStore(s => s.duplicateSection)
  const moveSection = useEditorStore(s => s.moveSection)
  const addBlock = useEditorStore(s => s.addBlock)
  const [hovered, setHovered] = useState(false)
  if (!section) return null
  const isSelected = selectedSectionId === sectionId && !selected

  return (
    <motion.div layout="position" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => selectSection(sectionId)}
      className={cn('relative group/section', isSelected && 'ring-2 ring-accent/50 ring-inset')}
      style={{ background: section.backgroundColor }}
    >
      {(hovered || isSelected) && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-0.5 bg-ink text-white rounded-lg shadow-lg px-1 py-1 z-20 animate-pop-in">
          <button disabled={index === 0} title="Monter" onClick={e => { e.stopPropagation(); moveSection(sectionId, index - 1) }} className="px-1.5 h-6 text-[10px] rounded hover:bg-white/15 disabled:opacity-30">↑</button>
          <button disabled={index === total - 1} title="Descendre" onClick={e => { e.stopPropagation(); moveSection(sectionId, index + 1) }} className="px-1.5 h-6 text-[10px] rounded hover:bg-white/15 disabled:opacity-30">↓</button>
          <button title="Dupliquer la section" onClick={e => { e.stopPropagation(); duplicateSection(sectionId) }} className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-white/15"><Copy size={12} /></button>
          <button title="Supprimer la section" onClick={e => { e.stopPropagation(); removeSection(sectionId) }} className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-white/15"><Trash2 size={12} /></button>
        </div>
      )}
      <div className="mx-auto" style={{ maxWidth: section.contentWidthPx, padding: `${section.padding.top}px ${section.padding.right}px ${section.padding.bottom}px ${section.padding.left}px` }}>
        {section.blocks.length === 0 ? (
          <div onDragOver={e => e.preventDefault()} className="h-16 flex items-center justify-center text-[12px] text-ink-faint border-2 border-dashed border-border-strong rounded-xl m-3">
            Section vide — ajoutez un bloc
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {section.blocks.map((b, i) => (
              <BlockRenderer key={b.id} block={b} path={{ sectionId, blockId: b.id }} index={i} />
            ))}
          </AnimatePresence>
        )}
        <SectionEndDropZone sectionId={sectionId} index={section.blocks.length} />
        <div className="flex justify-center py-1.5">
          <AddBlockPopover
            onPick={(type: BlockType) => addBlock(sectionId, type)}
            trigger={
              <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-border-strong text-ink-faint hover:text-accent hover:border-accent text-[12px] transition-colors">
                <Plus size={13} /> Ajouter un bloc
              </button>
            }
          />
        </div>
      </div>
    </motion.div>
  )
}

export function Canvas() {
  const sections = useEditorStore(s => s.document.sections)
  const pageBackground = useEditorStore(s => s.document.pageBackground)
  const fontFamily = useEditorStore(s => s.document.fontFamily)
  const addSection = useEditorStore(s => s.addSection)
  const select = useEditorStore(s => s.select)
  const selectSection = useEditorStore(s => s.selectSection)

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--color-canvas)' }} onClick={() => { select(null); selectSection(null) }}>
      <div className="max-w-[760px] mx-auto py-10 px-4">
        <div
          className="rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,.06),0_20px_50px_-20px_rgba(0,0,0,.18)] border border-border"
          style={{ background: pageBackground, fontFamily: fontFamily === 'serif' ? 'var(--font-email-serif)' : 'var(--font-sans)' }}
          onClick={e => e.stopPropagation()}
        >
          {sections.length === 0 ? (
            <EmptyState icon={Mail} title="Document vide" description="Ajoutez une première section pour commencer à composer votre e-mail."
              action={<button onClick={() => addSection()} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-accent text-accent-ink text-sm font-medium"><Plus size={14} /> Ajouter une section</button>} />
          ) : (
            <AnimatePresence initial={false}>
              {sections.map((s, i) => <SectionView key={s.id} sectionId={s.id} index={i} total={sections.length} />)}
            </AnimatePresence>
          )}
        </div>
        {sections.length > 0 && (
          <div className="flex justify-center mt-4">
            <button onClick={() => addSection()} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-dashed border-border-strong text-ink-dim hover:text-accent hover:border-accent text-[13px] bg-surface transition-colors">
              <Plus size={14} /> Ajouter une section
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
