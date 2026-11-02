import { useState } from 'react'
import { Layers, Shapes } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { Tabs } from '../ui/Tabs'
import { BLOCK_GROUPS, BLOCK_META, ALL_BLOCK_TYPES } from '@/lib/blocks/meta'
import type { Block, BlockType } from '@/types/document'
import { cn } from '@/lib/cn'

type LeftTab = 'blocks' | 'layers'

function BlocksTab() {
  const addBlock = useEditorStore(s => s.addBlock)
  const selectedSectionId = useEditorStore(s => s.selectedSectionId)
  const sections = useEditorStore(s => s.document.sections)

  const targetSectionId = selectedSectionId ?? sections[sections.length - 1]?.id ?? null

  const add = (type: BlockType) => {
    if (!targetSectionId) return
    addBlock(targetSectionId, type)
  }

  return (
    <div className="p-3 overflow-y-auto">
      {!targetSectionId && <p className="text-[12px] text-ink-faint mb-3">Ajoutez d'abord une section pour pouvoir y déposer des blocs.</p>}
      {BLOCK_GROUPS.map(group => (
        <div key={group} className="mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2 px-1">{group}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {ALL_BLOCK_TYPES.filter(t => BLOCK_META[t].group === group).map(type => {
              const meta = BLOCK_META[type]
              return (
                <button key={type} disabled={!targetSectionId} onClick={() => add(type)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface py-3 text-[11px] text-ink-dim hover:border-accent hover:text-accent hover:bg-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <meta.icon size={18} />
                  {meta.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function LayerRow({ icon: Icon, label, depth, selected, onClick }: { icon: typeof Shapes; label: string; depth: number; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{ paddingLeft: 10 + depth * 16 }}
      className={cn(
        'w-full flex items-center gap-2 h-8 rounded-lg text-[12px] text-left transition-colors',
        selected ? 'bg-accent-dim text-accent font-medium' : 'text-ink-dim hover:bg-black/5 hover:text-ink',
      )}>
      <Icon size={13} className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )
}

function blockLabel(b: Block): string {
  if (b.type === 'heading') return b.text || 'Titre'
  if (b.type === 'paragraph') return 'Paragraphe'
  if (b.type === 'button') return b.label || 'Bouton'
  return BLOCK_META[b.type].label
}

function LayersTab() {
  const sections = useEditorStore(s => s.document.sections)
  const selected = useEditorStore(s => s.selected)
  const selectedSectionId = useEditorStore(s => s.selectedSectionId)
  const select = useEditorStore(s => s.select)
  const selectSection = useEditorStore(s => s.selectSection)

  if (sections.length === 0) return <p className="text-[12px] text-ink-faint p-4">Aucune section pour l'instant.</p>

  return (
    <div className="p-2 overflow-y-auto space-y-0.5">
      {sections.map((section, si) => (
        <div key={section.id}>
          <LayerRow icon={Layers} label={`Section ${si + 1}`} depth={0} selected={selectedSectionId === section.id && !selected} onClick={() => selectSection(section.id)} />
          {section.blocks.map(b => (
            <div key={b.id}>
              <LayerRow icon={BLOCK_META[b.type].icon} label={blockLabel(b)} depth={1} selected={selected?.blockId === b.id} onClick={() => select({ sectionId: section.id, blockId: b.id })} />
              {b.type === 'columns' && b.columns.map((col, ci) => (
                <div key={col.id}>
                  <LayerRow icon={Shapes} label={`Colonne ${ci + 1}`} depth={2} selected={false} onClick={() => {}} />
                  {col.blocks.map(cb => (
                    <LayerRow key={cb.id} icon={BLOCK_META[cb.type].icon} label={blockLabel(cb)} depth={3}
                      selected={selected?.blockId === cb.id} onClick={() => select({ sectionId: section.id, columnId: col.id, blockId: cb.id })} />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function LeftPanel() {
  const [tab, setTab] = useState<LeftTab>('blocks')
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col">
      <div className="p-3 border-b border-border">
        <Tabs value={tab} onChange={setTab} options={[{ value: 'blocks', label: 'Blocs' }, { value: 'layers', label: 'Calques' }]} />
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'blocks' ? <BlocksTab /> : <LayersTab />}
      </div>
    </aside>
  )
}
