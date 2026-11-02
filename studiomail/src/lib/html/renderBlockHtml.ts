/* ─────────────────────────────────────────────────────────────
   Un bloc → un fragment HTML autonome, pensé pour les clients de
   messagerie : tables, styles inline, pas de flexbox/grid, pas de
   position absolue. Chaque fonction ici est le pendant exact du rendu
   canvas (components/blocks/BlockRenderer.tsx) — même modèle de données,
   deux sorties différentes.
───────────────────────────────────────────────────────────── */
import type { Block, LeafBlock, Spacing } from '@/types/document'
import { sanitizeCustomHtml, sanitizeRichText } from '../sanitizeRichText'

const SOCIAL_LABEL: Record<string, string> = {
  facebook: 'Facebook', instagram: 'Instagram', x: 'X', linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube', whatsapp: 'WhatsApp',
}

function pad(s: Spacing): string {
  return `${s.top}px ${s.right}px ${s.bottom}px ${s.left}px`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function wrap(block: Block | LeafBlock, inner: string): string {
  const bg = block.backgroundColor ? ` bgcolor="${block.backgroundColor}" style="background:${block.backgroundColor}"` : ''
  const hideClass = [block.hiddenOnMobile ? 'sm-hide' : '', block.hiddenOnDesktop ? 'sm-only' : ''].filter(Boolean).join(' ')
  return `<tr><td${bg}${hideClass ? ` class="${hideClass}"` : ''} style="padding:${pad(block.padding)}">${inner}</td></tr>`
}

export function renderBlockHtml(block: Block | LeafBlock): string {
  switch (block.type) {
    case 'heading': {
      const Tag = block.level
      return wrap(block, `<${Tag} style="margin:0;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:${block.fontSize}px;line-height:1.3;color:${block.color};text-align:${block.align}">${esc(block.text)}</${Tag}>`)
    }
    case 'paragraph':
      return wrap(block, `<div style="font-family:Arial,Helvetica,sans-serif;font-size:${block.fontSize}px;line-height:1.6;color:${block.color};text-align:${block.align}">${sanitizeRichText(block.html)}</div>`)
    case 'divider':
      return wrap(block, `<hr style="border:none;border-top:${block.thickness}px solid ${block.color};margin:0" />`)
    case 'spacer':
      return `<tr><td style="font-size:0;line-height:0;height:${block.height}px">&nbsp;</td></tr>`
    case 'image': {
      const img = `<img src="${esc(block.src)}" alt="${esc(block.alt)}" width="100%" style="display:block;width:100%;max-width:100%;border-radius:${block.radius}px" />`
      const content = `<table role="presentation" width="${block.widthPct}%" align="${block.align}" style="margin:0 auto"><tr><td>${block.link ? `<a href="${esc(block.link)}" target="_blank" rel="noopener noreferrer">${img}</a>` : img}</td></tr></table>`
      return wrap(block, content)
    }
    case 'button': {
      const width = block.fullWidth ? '100%' : 'auto'
      const btn = `<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:${block.align === 'center' ? '0 auto' : block.align === 'right' ? '0 0 0 auto' : '0'}"><tr><td align="center" bgcolor="${block.bgColor}" style="border-radius:${block.radius}px">
        <a href="${esc(block.href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:${width};padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:${block.fontSize}px;font-weight:600;color:${block.textColor};text-decoration:none;border-radius:${block.radius}px">${esc(block.label)}</a>
      </td></tr></table>`
      return wrap(block, btn)
    }
    case 'social': {
      const icons = block.links.map(l => `<td style="padding:0 6px"><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;width:${block.iconSize}px;height:${block.iconSize}px;border-radius:50%;background:#e8e6e1;text-align:center;line-height:${block.iconSize}px;font-family:Arial,sans-serif;font-size:10px;color:#45423d;text-decoration:none">${SOCIAL_LABEL[l.platform]?.slice(0, 2).toUpperCase() ?? '•'}</a></td>`).join('')
      return wrap(block, `<table role="presentation" align="${block.align}" style="margin:0 auto"><tr>${icons}</tr></table>`)
    }
    case 'footer': {
      const unsub = block.unsubscribeUrl ? `<a href="${esc(block.unsubscribeUrl)}" style="color:${block.color};text-decoration:underline">${esc(block.unsubscribeLabel)}</a>` : esc(block.unsubscribeLabel)
      return wrap(block, `<div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${block.color};text-align:${block.align}">
        <p style="margin:0 0 4px">${esc(block.companyName)}</p>
        ${block.address ? `<p style="margin:0 0 8px">${esc(block.address)}</p>` : ''}
        <p style="margin:0">${unsub}</p>
      </div>`)
    }
    case 'logo': {
      const img = `<img src="${esc(block.src)}" alt="${esc(block.alt)}" width="${block.widthPx}" style="display:block;width:${block.widthPx}px;max-width:100%" />`
      return wrap(block, `<table role="presentation" align="${block.align}" style="margin:0 auto"><tr><td>${img}</td></tr></table>`)
    }
    case 'html':
      return wrap(block, sanitizeCustomHtml(block.html))
    case 'columns': {
      const colWidthPctSum = block.columns.reduce((s, c) => s + c.widthPct, 0) || 100
      const cells = block.columns.map(col => {
        const innerRows = col.blocks.map(b => renderBlockHtml(b)).join('')
        const pct = (col.widthPct / colWidthPctSum) * 100
        return `<td class="sm-col" valign="top" width="${pct.toFixed(2)}%" style="padding-right:${block.gap}px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tbody>${innerRows}</tbody></table>
        </td>`
      }).join('')
      return wrap(block, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="${block.stackOnMobile ? 'sm-stack' : ''}"><tr>${cells}</tr></table>`)
    }
  }
}
