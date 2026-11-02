/* Version texte brut — repli pour les clients qui n'affichent pas le HTML. */
import type { Block, EmailDocument, LeafBlock } from '@/types/document'

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent ?? '').replace(/\s+\n/g, '\n').trim()
}

function blockToText(block: Block | LeafBlock): string {
  switch (block.type) {
    case 'heading':   return `${block.text.toUpperCase()}\n`
    case 'paragraph': return `${stripHtml(block.html)}\n`
    case 'button':    return `${block.label} : ${block.href}\n`
    case 'image':     return block.alt ? `[Image : ${block.alt}]\n` : ''
    case 'logo':      return ''
    case 'divider':   return '----------\n'
    case 'spacer':    return ''
    case 'social':    return block.links.length ? `${block.links.map(l => l.url).join(' · ')}\n` : ''
    case 'footer':    return `${block.companyName}${block.address ? ' — ' + block.address : ''}\n${block.unsubscribeUrl ? `${block.unsubscribeLabel} : ${block.unsubscribeUrl}\n` : ''}`
    case 'html':      return `${stripHtml(block.html)}\n`
    case 'columns':   return block.columns.map(c => c.blocks.map(blockToText).join('')).join('\n')
  }
}

export function renderDocumentText(doc: EmailDocument): string {
  const parts = doc.sections.flatMap(s => s.blocks.map(blockToText)).filter(Boolean)
  return parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
