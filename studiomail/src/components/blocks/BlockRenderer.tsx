import { useState, type DragEvent } from 'react'
import { motion } from 'motion/react'
import { Copy, GripVertical, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Block, BlockType, ColumnsBlock } from '@/types/document'
import { useEditorStore, type BlockPath } from '@/store/editorStore'
import { useDndStore } from '@/store/dndStore'
import { BlockContent } from './BlockContent'
import { AddBlockPopover } from './AddBlockPopover'

function DropLine({ active }: { active: boolean }) {
  if (!active) return null
  return <div className="h-0.5 -my-px bg-accent rounded-full relative z-10" />
}

export function BlockRenderer({ block, path, index }: { block: Block; path: BlockPath; index: number }) {
  const selected = useEditorStore(s => s.selected)
  const select = useEditorStore(s => s.select)
  const removeBlock = useEditorStore(s => s.removeBlock)
  const duplicateBlock = useEditorStore(s => s.duplicateBlock)
  const moveBlock = useEditorStore(s => s.moveBlock)
  const [hovered, setHovered] = useState(false)
  const isSelected = selected?.blockId === block.id
  const overPath = useDndStore(s => s.overPath)
  const setDragged = useDndStore(s => s.setDragged)
  const setOver = useDndStore(s => s.setOver)
  const isOver = overPath?.blockId === block.id

  const onDragStart = (e: DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    setDragged(path)
  }
  const onDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const edge = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after'
    setOver({ ...path, edge })
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const dragged = useDndStore.getState().draggedPath
    const over = useDndStore.getState().overPath
    setDragged(null)
    setOver(null)
    if (!dragged || !over || dragged.blockId === block.id) return
    const toIndex = over.edge === 'before' ? index : index + 1
    moveBlock(dragged, { sectionId: path.sectionId, columnId: path.columnId, index: toIndex })
  }

  return (
    <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: .97 }} transition={{ duration: .16 }}>
      <DropLine active={isOver && overPath?.edge === 'before'} />
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={() => { setDragged(null); setOver(null) }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={e => { e.stopPropagation(); select(path) }}
        style={{ background: block.backgroundColor ?? undefined }}
        className={cn(
          'relative group/block transition-shadow',
          isSelected ? 'ring-2 ring-accent ring-inset' : hovered ? 'ring-1 ring-border-strong ring-inset' : '',
        )}
      >
        <div style={{ padding: `${block.padding.top}px ${block.padding.right}px ${block.padding.bottom}px ${block.padding.left}px` }}>
          {block.type === 'columns' ? <ColumnsView block={block} path={path} /> : <BlockContent block={block} path={path} />}
        </div>

        {(isSelected || hovered) && (
          <div className="absolute -top-3.5 right-2 flex items-center gap-0.5 bg-ink text-white rounded-lg shadow-lg px-1 py-1 z-20 animate-pop-in">
            <span className="w-6 h-6 inline-flex items-center justify-center cursor-grab text-white/60" title="Glisser pour réordonner"><GripVertical size={13} /></span>
            <button title="Dupliquer" onClick={e => { e.stopPropagation(); duplicateBlock(path) }} className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-white/15"><Copy size={12} /></button>
            <button title="Supprimer" onClick={e => { e.stopPropagation(); removeBlock(path) }} className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-white/15"><Trash2 size={12} /></button>
          </div>
        )}
      </div>
      <DropLine active={isOver && overPath?.edge === 'after'} />
    </motion.div>
  )
}

function ColumnsView({ block, path }: { block: ColumnsBlock; path: BlockPath }) {
  const addBlock = useEditorStore(s => s.addBlock)
  return (
    <div className="flex" style={{ gap: block.gap }}>
      {block.columns.map(col => (
        <div key={col.id} className="min-w-0" style={{ width: `${col.widthPct}%` }}>
          {col.blocks.map((b, i) => (
            <BlockRenderer key={b.id} block={b as Block} path={{ sectionId: path.sectionId, columnId: col.id, blockId: b.id }} index={i} />
          ))}
          <ColumnDropZone sectionId={path.sectionId} columnId={col.id} index={col.blocks.length} />
          <AddBlockPopover
            leafOnly
            onPick={(type: BlockType) => addBlock(path.sectionId, type, undefined, col.id)}
            trigger={
              <button className="w-full mt-1 h-8 rounded-lg border border-dashed border-border-strong text-ink-faint hover:text-accent hover:border-accent flex items-center justify-center gap-1 text-[11px] transition-colors">
                <Plus size={12} /> Bloc
              </button>
            }
          />
        </div>
      ))}
    </div>
  )
}

/** Zone de dépôt en fin de colonne (colonne vide ou dépôt après le dernier bloc). */
function ColumnDropZone({ sectionId, columnId, index }: { sectionId: string; columnId: string; index: number }) {
  const moveBlock = useEditorStore(s => s.moveBlock)
  const [over, setOver] = useState(false)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        e.preventDefault()
        setOver(false)
        const dragged = useDndStore.getState().draggedPath
        useDndStore.getState().setDragged(null)
        if (!dragged) return
        moveBlock(dragged, { sectionId, columnId, index })
      }}
      className={cn('h-3 rounded transition-colors', over && 'bg-accent-dim')}
    />
  )
}
