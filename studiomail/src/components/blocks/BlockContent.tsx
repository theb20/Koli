import { Globe } from 'lucide-react'
import type { Block, HeadingBlock, ButtonBlock, LeafBlock, ParagraphBlock } from '@/types/document'
import { useEditableHtml, useEditableText } from '@/hooks/useEditableRef'
import { sanitizeCustomHtml, sanitizeRichText } from '@/lib/sanitizeRichText'
import type { BlockPath } from '@/store/editorStore'
import { useEditorStore } from '@/store/editorStore'

// lucide-react n'expose plus d'icônes de marque (Facebook/Instagram/...) —
// un badge générique + le nom de la plateforme en infobulle, pas d'icône
// de marque approximative qui induirait en erreur.
const SOCIAL_LABEL: Record<string, string> = {
  facebook: 'Facebook', instagram: 'Instagram', x: 'X', linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube', whatsapp: 'WhatsApp',
}

/* Chaque variante qui a besoin d'édition inline a SON propre composant,
   avec son propre hook appelé sans condition — jamais de hook dans une
   branche de switch (violerait les règles des hooks React). */

function HeadingContent({ block, path }: { block: HeadingBlock; path: BlockPath }) {
  const updateBlock = useEditorStore(s => s.updateBlock)
  const editable = useEditableText<HTMLHeadingElement>(block.text, text => updateBlock(path, { text } as never))
  const Tag = block.level
  return (
    // Jamais dangerouslySetInnerHTML ici : block.text est du texte brut, pas
    // du HTML — voir useEditableText (hooks/useEditableRef.ts) qui le
    // synchronise déjà via textContent, jamais innerHTML.
    <Tag {...editable}
      style={{ textAlign: block.align, color: block.color, fontSize: block.fontSize, fontFamily: block.fontFamily === 'serif' ? 'var(--font-email-serif)' : undefined }}
      className="font-bold leading-tight outline-none" />
  )
}

function ParagraphContent({ block, path }: { block: ParagraphBlock; path: BlockPath }) {
  const updateBlock = useEditorStore(s => s.updateBlock)
  const editable = useEditableHtml<HTMLDivElement>(block.html, html => updateBlock(path, { html: sanitizeRichText(html) } as never))
  return (
    <div {...editable} style={{ textAlign: block.align, color: block.color, fontSize: block.fontSize }}
      className="leading-relaxed outline-none [&_a]:underline [&_a]:text-current [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.html) }} />
  )
}

function ButtonContent({ block, path }: { block: ButtonBlock; path: BlockPath }) {
  const updateBlock = useEditorStore(s => s.updateBlock)
  const editable = useEditableText<HTMLSpanElement>(block.label, label => updateBlock(path, { label } as never))
  return (
    <div style={{ textAlign: block.align }}>
      <span
        style={{ background: block.bgColor, color: block.textColor, borderRadius: block.radius, fontSize: block.fontSize, width: block.fullWidth ? '100%' : undefined }}
        className="inline-block px-7 py-3 font-semibold cursor-text select-text"
      >
        <span {...editable} className="outline-none" />
      </span>
    </div>
  )
}

/** Rendu "contenu" d'un bloc — jamais la chrome de sélection/drag, voir BlockRenderer qui l'enrobe. */
export function BlockContent({ block, path }: { block: Block | LeafBlock; path: BlockPath }) {
  switch (block.type) {
    case 'heading':
      return <HeadingContent block={block} path={path} />
    case 'paragraph':
      return <ParagraphContent block={block} path={path} />
    case 'button':
      return <ButtonContent block={block} path={path} />
    case 'divider':
      return <hr style={{ borderTop: `${block.thickness}px solid ${block.color}`, borderBottom: 'none', borderLeft: 'none', borderRight: 'none' }} />
    case 'spacer':
      return <div style={{ height: block.height }} />
    case 'image':
      return (
        <div style={{ textAlign: block.align }}>
          {block.src ? (
            <img src={block.src} alt={block.alt} style={{ width: `${block.widthPct}%`, borderRadius: block.radius, display: 'inline-block', maxWidth: '100%' }} />
          ) : (
            <div className="w-full h-32 rounded-xl border-2 border-dashed border-border-strong bg-canvas flex items-center justify-center text-[12px] text-ink-faint">
              Aucune image — définissez une URL dans l'inspecteur
            </div>
          )}
        </div>
      )
    case 'logo':
      return (
        <div style={{ textAlign: block.align }}>
          {block.src ? (
            <img src={block.src} alt={block.alt} style={{ width: block.widthPx, display: 'inline-block', maxWidth: '100%' }} />
          ) : (
            <div className="inline-flex h-10 px-4 rounded-lg border-2 border-dashed border-border-strong bg-canvas items-center justify-center text-[12px] text-ink-faint">
              Logo
            </div>
          )}
        </div>
      )
    case 'social':
      return (
        <div className="flex gap-2" style={{ justifyContent: block.align === 'left' ? 'flex-start' : block.align === 'right' ? 'flex-end' : 'center' }}>
          {block.links.length === 0 && <p className="text-[12px] text-ink-faint">Aucun réseau social — ajoutez-en dans l'inspecteur</p>}
          {block.links.map(l => (
            <span key={l.id} title={SOCIAL_LABEL[l.platform]} style={{ width: block.iconSize, height: block.iconSize }}
              className="rounded-full bg-canvas border border-border flex items-center justify-center text-ink-dim">
              <Globe size={block.iconSize * 0.5} />
            </span>
          ))}
        </div>
      )
    case 'footer':
      return (
        <div style={{ color: block.color, textAlign: block.align }} className="text-[12px] leading-relaxed">
          <p className="font-medium">{block.companyName}</p>
          {block.address && <p className="mt-0.5">{block.address}</p>}
          <p className="mt-1.5 underline underline-offset-2">{block.unsubscribeLabel}</p>
        </div>
      )
    case 'html':
      return (
        <div className="relative">
          <span className="absolute -top-2.5 left-0 text-[10px] font-medium uppercase tracking-wide text-accent bg-accent-dim px-1.5 py-0.5 rounded">HTML</span>
          <div className="pt-3" dangerouslySetInnerHTML={{ __html: sanitizeCustomHtml(block.html) }} />
        </div>
      )
    case 'columns':
      // Rendu par ColumnsBlockView (un niveau de délégation, voir BlockRenderer) — jamais ici (pas d'imbrication).
      return null
  }
}
