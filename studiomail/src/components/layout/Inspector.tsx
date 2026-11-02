import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useEditorStore } from '@/store/editorStore'
import { Tabs } from '../ui/Tabs'
import { AlignField, ColorField, NumberField, SelectField, TextAreaField, TextField, ToggleField } from '../ui/Field'
import { EmptyState } from '../ui/EmptyState'
import { MousePointerClick } from 'lucide-react'
import { newId } from '@/lib/id'
import type { Block, SocialPlatform } from '@/types/document'

type InspectorTab = 'content' | 'style' | 'responsive'

const SOCIAL_OPTIONS: { value: SocialPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' }, { value: 'facebook', label: 'Facebook' }, { value: 'x', label: 'X' },
  { value: 'linkedin', label: 'LinkedIn' }, { value: 'tiktok', label: 'TikTok' }, { value: 'youtube', label: 'YouTube' }, { value: 'whatsapp', label: 'WhatsApp' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 pb-4 mb-4 border-b border-border last:border-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{title}</p>
      {children}
    </div>
  )
}

export function Inspector() {
  const selected = useEditorStore(s => s.selected)
  const selectedSectionId = useEditorStore(s => s.selectedSectionId)
  const doc = useEditorStore(s => s.document)
  const updateBlock = useEditorStore(s => s.updateBlock)
  const updateSection = useEditorStore(s => s.updateSection)
  const [tab, setTab] = useState<InspectorTab>('content')

  if (selected) {
    const sec = doc.sections.find(s => s.id === selected.sectionId)
    const block = selected.columnId
      ? sec?.blocks.find((b): b is Extract<typeof b, { type: 'columns' }> => b.type === 'columns' && b.columns.some(c => c.id === selected.columnId))
        ?.columns.find(c => c.id === selected.columnId)?.blocks.find(b => b.id === selected.blockId)
      : sec?.blocks.find(b => b.id === selected.blockId)

    if (!block) return <EmptyState icon={MousePointerClick} title="Bloc introuvable" />

    const set = (patch: Record<string, unknown>) => updateBlock(selected, patch as never)
    const setLive = (patch: Record<string, unknown>) => updateBlock(selected, patch as never, { commit: false })

    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-border"><Tabs value={tab} onChange={setTab} options={[{ value: 'content', label: 'Contenu' }, { value: 'style', label: 'Style' }, { value: 'responsive', label: 'Responsive' }]} /></div>
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'content' && <ContentFields block={block} set={set} setLive={setLive} />}
          {tab === 'style' && <StyleFields block={block} set={set} />}
          {tab === 'responsive' && <ResponsiveFields block={block} set={set} />}
        </div>
      </div>
    )
  }

  if (selectedSectionId) {
    const sec = doc.sections.find(s => s.id === selectedSectionId)
    if (!sec) return <EmptyState icon={MousePointerClick} title="Section introuvable" />
    return (
      <div className="p-4 overflow-y-auto">
        <Section title="Section">
          <ColorField label="Couleur de fond" value={sec.backgroundColor} onChange={v => updateSection(sec.id, { backgroundColor: v })} />
          <NumberField label="Largeur du contenu" value={sec.contentWidthPx} min={320} max={760} suffix="px" onChange={v => updateSection(sec.id, { contentWidthPx: v })} />
        </Section>
        <Section title="Marge intérieure">
          <div className="grid grid-cols-2 gap-2">
            <NumberField label="Haut" value={sec.padding.top} min={0} max={160} onChange={v => updateSection(sec.id, { padding: { ...sec.padding, top: v } })} />
            <NumberField label="Bas" value={sec.padding.bottom} min={0} max={160} onChange={v => updateSection(sec.id, { padding: { ...sec.padding, bottom: v } })} />
            <NumberField label="Gauche" value={sec.padding.left} min={0} max={160} onChange={v => updateSection(sec.id, { padding: { ...sec.padding, left: v } })} />
            <NumberField label="Droite" value={sec.padding.right} min={0} max={160} onChange={v => updateSection(sec.id, { padding: { ...sec.padding, right: v } })} />
          </div>
        </Section>
      </div>
    )
  }

  return <EmptyState icon={MousePointerClick} title="Rien de sélectionné" description="Cliquez sur un bloc ou une section pour modifier ses propriétés." />
}

function ContentFields({ block, set, setLive }: { block: Block; set: (p: Record<string, unknown>) => void; setLive: (p: Record<string, unknown>) => void }) {
  switch (block.type) {
    case 'heading':
      return <Section title="Contenu"><TextField label="Texte" value={block.text} onChange={v => setLive({ text: v })} /></Section>
    case 'paragraph':
      return <Section title="Contenu"><TextAreaField label="Texte (gras/italique/lien via la sélection dans le canevas)" value={block.html} rows={5} onChange={v => setLive({ html: v })} /></Section>
    case 'button':
      return (
        <Section title="Contenu">
          <TextField label="Libellé" value={block.label} onChange={v => setLive({ label: v })} />
          <TextField label="Lien (URL)" value={block.href} onChange={v => set({ href: v })} placeholder="https://" />
        </Section>
      )
    case 'image':
      return (
        <Section title="Contenu">
          <TextField label="URL de l'image" value={block.src} onChange={v => set({ src: v })} placeholder="https://..." />
          <TextField label="Texte alternatif" value={block.alt} onChange={v => set({ alt: v })} placeholder="Décrit l'image pour l'accessibilité" />
          <TextField label="Lien au clic (optionnel)" value={block.link ?? ''} onChange={v => set({ link: v || null })} placeholder="https://" />
        </Section>
      )
    case 'logo':
      return (
        <Section title="Contenu">
          <TextField label="URL du logo" value={block.src} onChange={v => set({ src: v })} />
          <TextField label="Texte alternatif" value={block.alt} onChange={v => set({ alt: v })} />
        </Section>
      )
    case 'footer':
      return (
        <Section title="Contenu">
          <TextField label="Nom de l'entreprise" value={block.companyName} onChange={v => setLive({ companyName: v })} />
          <TextField label="Adresse" value={block.address} onChange={v => setLive({ address: v })} />
          <TextField label="Texte du lien de désinscription" value={block.unsubscribeLabel} onChange={v => setLive({ unsubscribeLabel: v })} />
          <TextField label="URL de désinscription" value={block.unsubscribeUrl ?? ''} onChange={v => set({ unsubscribeUrl: v || null })} placeholder="https://" />
        </Section>
      )
    case 'social':
      return (
        <Section title="Liens">
          {block.links.map((l, i) => (
            <div key={l.id} className="flex items-center gap-1.5">
              <select value={l.platform} onChange={e => set({ links: block.links.map((x, j) => j === i ? { ...x, platform: e.target.value } : x) })}
                className="h-9 rounded-lg border border-border bg-surface px-2 text-[12px]">
                {SOCIAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input value={l.url} onChange={e => setLive({ links: block.links.map((x, j) => j === i ? { ...x, url: e.target.value } : x) })}
                placeholder="https://" className="flex-1 h-9 rounded-lg border border-border bg-surface px-2 text-[12px] min-w-0" />
              <button onClick={() => set({ links: block.links.filter((_, j) => j !== i) })} className="w-8 h-9 inline-flex items-center justify-center text-ink-faint hover:text-danger shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
          <button onClick={() => set({ links: [...block.links, { id: newId('soc'), platform: 'instagram', url: '' }] })}
            className="inline-flex items-center gap-1 text-[12px] text-accent font-medium"><Plus size={13} /> Ajouter un lien</button>
        </Section>
      )
    case 'html':
      return <Section title="HTML"><TextAreaField label="Code HTML (assaini avant rendu)" value={block.html} rows={8} onChange={v => setLive({ html: v })} /></Section>
    case 'divider':
    case 'spacer':
    case 'columns':
      return <p className="text-[12px] text-ink-faint">Aucune option de contenu pour ce bloc — voir l'onglet Style.</p>
  }
}

function StyleFields({ block, set }: { block: Block; set: (p: Record<string, unknown>) => void }) {
  switch (block.type) {
    case 'heading':
      return (
        <Section title="Style">
          <SelectField label="Niveau" value={block.level} onChange={v => set({ level: v })} options={[{ value: 'h1', label: 'Titre 1' }, { value: 'h2', label: 'Titre 2' }, { value: 'h3', label: 'Titre 3' }]} />
          <AlignField label="Alignement" value={block.align} onChange={v => set({ align: v })} />
          <ColorField label="Couleur" value={block.color} onChange={v => set({ color: v })} />
          <NumberField label="Taille" value={block.fontSize} min={12} max={64} suffix="px" onChange={v => set({ fontSize: v })} />
        </Section>
      )
    case 'paragraph':
      return (
        <Section title="Style">
          <AlignField label="Alignement" value={block.align} onChange={v => set({ align: v })} />
          <ColorField label="Couleur" value={block.color} onChange={v => set({ color: v })} />
          <NumberField label="Taille" value={block.fontSize} min={10} max={28} suffix="px" onChange={v => set({ fontSize: v })} />
        </Section>
      )
    case 'button':
      return (
        <Section title="Style">
          <AlignField label="Alignement" value={block.align} onChange={v => set({ align: v })} />
          <ColorField label="Couleur de fond" value={block.bgColor} onChange={v => set({ bgColor: v })} />
          <ColorField label="Couleur du texte" value={block.textColor} onChange={v => set({ textColor: v })} />
          <NumberField label="Arrondi" value={block.radius} min={0} max={40} suffix="px" onChange={v => set({ radius: v })} />
          <NumberField label="Taille du texte" value={block.fontSize} min={10} max={22} suffix="px" onChange={v => set({ fontSize: v })} />
          <ToggleField label="Pleine largeur" checked={block.fullWidth} onChange={v => set({ fullWidth: v })} />
        </Section>
      )
    case 'image':
      return (
        <Section title="Style">
          <AlignField label="Alignement" value={block.align} onChange={v => set({ align: v })} />
          <NumberField label="Largeur" value={block.widthPct} min={10} max={100} suffix="%" onChange={v => set({ widthPct: v })} />
          <NumberField label="Arrondi" value={block.radius} min={0} max={40} suffix="px" onChange={v => set({ radius: v })} />
        </Section>
      )
    case 'logo':
      return (
        <Section title="Style">
          <AlignField label="Alignement" value={block.align} onChange={v => set({ align: v })} />
          <NumberField label="Largeur" value={block.widthPx} min={24} max={320} suffix="px" onChange={v => set({ widthPx: v })} />
        </Section>
      )
    case 'divider':
      return (
        <Section title="Style">
          <ColorField label="Couleur" value={block.color} onChange={v => set({ color: v })} />
          <NumberField label="Épaisseur" value={block.thickness} min={1} max={8} suffix="px" onChange={v => set({ thickness: v })} />
        </Section>
      )
    case 'spacer':
      return <Section title="Style"><NumberField label="Hauteur" value={block.height} min={4} max={240} suffix="px" onChange={v => set({ height: v })} /></Section>
    case 'social':
      return (
        <Section title="Style">
          <AlignField label="Alignement" value={block.align} onChange={v => set({ align: v })} />
          <NumberField label="Taille des icônes" value={block.iconSize} min={16} max={48} suffix="px" onChange={v => set({ iconSize: v })} />
        </Section>
      )
    case 'footer':
      return (
        <Section title="Style">
          <AlignField label="Alignement" value={block.align} onChange={v => set({ align: v })} />
          <ColorField label="Couleur du texte" value={block.color} onChange={v => set({ color: v })} />
        </Section>
      )
    case 'columns':
      return (
        <Section title="Style">
          <NumberField label="Espace entre colonnes" value={block.gap} min={0} max={48} suffix="px" onChange={v => set({ gap: v })} />
          <ToggleField label="Empiler sur mobile" checked={block.stackOnMobile} onChange={v => set({ stackOnMobile: v })} />
        </Section>
      )
    case 'html':
      return <p className="text-[12px] text-ink-faint">Aucune option de style — contrôlée par le code HTML lui-même.</p>
  }
}

function ResponsiveFields({ block, set }: { block: Block; set: (p: Record<string, unknown>) => void }) {
  return (
    <Section title="Visibilité">
      <ToggleField label="Masquer sur mobile" checked={block.hiddenOnMobile} onChange={v => set({ hiddenOnMobile: v })} />
      <ToggleField label="Masquer sur ordinateur" checked={block.hiddenOnDesktop} onChange={v => set({ hiddenOnDesktop: v })} />
      <div className="pt-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Marge intérieure</p>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Haut" value={block.padding.top} min={0} max={160} onChange={v => set({ padding: { ...block.padding, top: v } })} />
          <NumberField label="Bas" value={block.padding.bottom} min={0} max={160} onChange={v => set({ padding: { ...block.padding, bottom: v } })} />
          <NumberField label="Gauche" value={block.padding.left} min={0} max={160} onChange={v => set({ padding: { ...block.padding, left: v } })} />
          <NumberField label="Droite" value={block.padding.right} min={0} max={160} onChange={v => set({ padding: { ...block.padding, right: v } })} />
        </div>
      </div>
    </Section>
  )
}
