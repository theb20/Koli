import { newId } from '../id'
import type { Block, BlockType, ColumnItem, LeafBlock, Spacing } from '@/types/document'

const noPadding: Spacing = { top: 0, right: 0, bottom: 0, left: 0 }
const textPadding: Spacing = { top: 8, right: 24, bottom: 8, left: 24 }

const base = () => ({
  id: newId('blk'),
  hiddenOnMobile: false,
  hiddenOnDesktop: false,
  backgroundColor: null,
})

/** Un bloc neuf, prêt à être déposé dans une section — valeurs par défaut crédibles, jamais vides au point d'être inutilisables. */
export function createDefaultBlock(type: BlockType): Block {
  switch (type) {
    case 'heading':
      return { ...base(), type, padding: { ...textPadding, top: 16 }, text: 'Votre titre', level: 'h1', align: 'left', color: '#19181a', fontSize: 28, fontFamily: 'sans' }
    case 'paragraph':
      return { ...base(), type, padding: textPadding, html: '<p>Votre texte ici. Cliquez pour modifier.</p>', align: 'left', color: '#45423d', fontSize: 15 }
    case 'divider':
      return { ...base(), type, padding: { top: 16, right: 24, bottom: 16, left: 24 }, color: '#e8e6e1', thickness: 1 }
    case 'spacer':
      return { ...base(), type, padding: noPadding, height: 24 }
    case 'image':
      return { ...base(), type, padding: textPadding, src: '', alt: '', link: null, widthPct: 100, radius: 8, align: 'center' }
    case 'button':
      return { ...base(), type, padding: { ...textPadding, top: 16, bottom: 16 }, label: 'Cliquez ici', href: 'https://', align: 'center', bgColor: '#5b4df0', textColor: '#ffffff', radius: 8, fullWidth: false, fontSize: 15 }
    case 'social':
      return { ...base(), type, padding: textPadding, align: 'center', iconSize: 28, links: [] }
    case 'footer':
      return {
        ...base(), type, padding: { top: 24, right: 24, bottom: 24, left: 24 },
        companyName: 'Votre entreprise', address: '', unsubscribeLabel: 'Se désinscrire', unsubscribeUrl: null, color: '#9a958c', align: 'center',
      }
    case 'logo':
      return { ...base(), type, padding: { top: 24, right: 24, bottom: 16, left: 24 }, src: '', alt: 'Logo', widthPx: 140, align: 'center' }
    case 'html':
      return { ...base(), type, padding: noPadding, html: '<!-- votre HTML -->' }
    case 'columns':
      return {
        ...base(), type, padding: textPadding, gap: 16, stackOnMobile: true,
        columns: [createDefaultColumn(), createDefaultColumn()],
      }
  }
}

export function createDefaultColumn(): ColumnItem {
  return { id: newId('col'), widthPct: 50, blocks: [] }
}

export function createDefaultLeafBlock(type: Exclude<BlockType, 'columns'>): LeafBlock {
  return createDefaultBlock(type) as LeafBlock
}

/** Copie profonde avec de nouveaux identifiants — jamais le même id que l'original (duplication). */
export function cloneBlockWithNewIds<T extends Block>(block: T): T {
  const copy: Block = JSON.parse(JSON.stringify(block))
  copy.id = newId('blk')
  if (copy.type === 'columns') {
    copy.columns = copy.columns.map(col => ({ ...col, id: newId('col'), blocks: col.blocks.map(b => ({ ...b, id: newId('blk') })) }))
  }
  return copy as T
}
