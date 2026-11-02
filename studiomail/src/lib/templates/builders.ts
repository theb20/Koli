/* Petits constructeurs pour écrire des templates de démonstration sans
   répéter tous les champs par défaut de chaque bloc à chaque fois. */
import { newId } from '@/lib/id'
import type {
  Block, ButtonBlock, ColumnsBlock, DividerBlock, FooterBlock, HeadingBlock,
  ImageBlock, LeafBlock, LogoBlock, ParagraphBlock, Section, SocialBlock, SpacerBlock,
} from '@/types/document'

const P = (top = 8, right = 24, bottom = 8, left = 24) => ({ top, right, bottom, left })

export function heading(text: string, opts: Partial<HeadingBlock> = {}): HeadingBlock {
  return { id: newId('blk'), type: 'heading', text, level: 'h1', align: 'left', color: '#19181a', fontSize: 26, fontFamily: 'sans', padding: P(16), hiddenOnMobile: false, hiddenOnDesktop: false, backgroundColor: null, ...opts }
}
export function paragraph(html: string, opts: Partial<ParagraphBlock> = {}): ParagraphBlock {
  return { id: newId('blk'), type: 'paragraph', html, align: 'left', color: '#45423d', fontSize: 15, padding: P(), hiddenOnMobile: false, hiddenOnDesktop: false, backgroundColor: null, ...opts }
}
export function button(label: string, href: string, opts: Partial<ButtonBlock> = {}): ButtonBlock {
  return { id: newId('blk'), type: 'button', label, href, align: 'left', bgColor: '#5b4df0', textColor: '#ffffff', radius: 8, fullWidth: false, fontSize: 15, padding: P(16, 24, 16, 24), hiddenOnMobile: false, hiddenOnDesktop: false, backgroundColor: null, ...opts }
}
export function divider(opts: Partial<DividerBlock> = {}): DividerBlock {
  return { id: newId('blk'), type: 'divider', color: '#e8e6e1', thickness: 1, padding: P(16, 24, 16, 24), hiddenOnMobile: false, hiddenOnDesktop: false, backgroundColor: null, ...opts }
}
export function spacer(height = 24): SpacerBlock {
  return { id: newId('blk'), type: 'spacer', height, padding: P(0, 0, 0, 0), hiddenOnMobile: false, hiddenOnDesktop: false, backgroundColor: null }
}
export function image(src: string, alt: string, opts: Partial<ImageBlock> = {}): ImageBlock {
  return { id: newId('blk'), type: 'image', src, alt, link: null, widthPct: 100, radius: 12, align: 'center', padding: P(), hiddenOnMobile: false, hiddenOnDesktop: false, backgroundColor: null, ...opts }
}
export function logo(src: string, alt = 'Logo', opts: Partial<LogoBlock> = {}): LogoBlock {
  return { id: newId('blk'), type: 'logo', src, alt, widthPx: 140, align: 'center', padding: P(24, 24, 16, 24), hiddenOnMobile: false, hiddenOnDesktop: false, backgroundColor: null, ...opts }
}
export function footer(companyName: string, opts: Partial<FooterBlock> = {}): FooterBlock {
  return { id: newId('blk'), type: 'footer', companyName, address: '', unsubscribeLabel: 'Se désinscrire', unsubscribeUrl: '#', color: '#9a958c', align: 'center', padding: P(24, 24, 24, 24), hiddenOnMobile: false, hiddenOnDesktop: false, backgroundColor: null, ...opts }
}
export function social(opts: Partial<SocialBlock> = {}): SocialBlock {
  return {
    id: newId('blk'), type: 'social', align: 'center', iconSize: 28, padding: P(), hiddenOnMobile: false, hiddenOnDesktop: false, backgroundColor: null,
    links: [{ id: newId('soc'), platform: 'instagram', url: '#' }, { id: newId('soc'), platform: 'facebook', url: '#' }, { id: newId('soc'), platform: 'x', url: '#' }],
    ...opts,
  }
}
export function columns(cols: LeafBlock[][], opts: Partial<ColumnsBlock> = {}): ColumnsBlock {
  return {
    id: newId('blk'), type: 'columns', gap: 16, stackOnMobile: true, padding: P(), hiddenOnMobile: false, hiddenOnDesktop: false, backgroundColor: null,
    columns: cols.map(blocks => ({ id: newId('col'), widthPct: 100 / cols.length, blocks })),
    ...opts,
  }
}
export function section(blocks: Block[], opts: Partial<Section> = {}): Section {
  return { id: newId('sec'), backgroundColor: '#ffffff', contentWidthPx: 600, padding: P(0, 0, 0, 0), blocks, ...opts }
}
