/* ─────────────────────────────────────────────────────────────
   Assainissement du HTML saisi par l'utilisateur (texte riche d'un
   paragraphe, ou bloc HTML personnalisé) — jamais de script, jamais
   d'iframe, jamais de gestionnaire d'événement, jamais d'URL
   javascript:. Utilisé avant TOUT rendu (canvas ET export), jamais
   seulement à l'affichage (voir components/blocks, lib/html).
───────────────────────────────────────────────────────────── */

const RICH_TEXT_ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'A', 'UL', 'OL', 'LI', 'BR', 'SPAN', 'P'])
const CUSTOM_HTML_ALLOWED_TAGS = new Set([
  ...RICH_TEXT_ALLOWED_TAGS, 'DIV', 'TABLE', 'TR', 'TD', 'TH', 'TBODY', 'THEAD', 'IMG', 'H1', 'H2', 'H3', 'H4', 'SMALL', 'HR',
])

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase()
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) return false
  return true
}

function cleanNode(node: Node, allowedTags: Set<string>): void {
  const children = Array.from(node.childNodes)
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) continue

    if (child.nodeType !== Node.ELEMENT_NODE) {
      node.removeChild(child)
      continue
    }

    const el = child as Element
    if (!allowedTags.has(el.tagName)) {
      // Pas une balise autorisée : on garde le contenu texte, on jette la balise.
      const text = document.createTextNode(el.textContent ?? '')
      node.replaceChild(text, el)
      continue
    }

    // Retire tous les attributs sauf la whitelist stricte par balise.
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on')) { el.removeAttribute(attr.name); continue }
      if (el.tagName === 'A' && name === 'href') {
        if (!isSafeUrl(attr.value)) el.setAttribute('href', '#')
        continue
      }
      if (el.tagName === 'A' && (name === 'target' || name === 'rel')) continue
      if (el.tagName === 'IMG' && (name === 'src' || name === 'alt' || name === 'width' || name === 'height')) {
        if (name === 'src' && !isSafeUrl(attr.value)) el.removeAttribute('src')
        continue
      }
      if (name === 'style') {
        // Autorise uniquement color/font-weight/font-style/text-decoration — jamais
        // position/behavior/expression (ancienne faille CSS IE) ni url().
        const safe = attr.value
          .split(';')
          .map(s => s.trim())
          .filter(s => /^(color|font-weight|font-style|text-decoration)\s*:/.test(s) && !/url\s*\(/i.test(s))
          .join('; ')
        if (safe) el.setAttribute('style', safe); else el.removeAttribute('style')
        continue
      }
      el.removeAttribute(attr.name)
    }
    if (el.tagName === 'A') el.setAttribute('rel', 'noopener noreferrer')

    cleanNode(el, allowedTags)
  }
}

function sanitize(html: string, allowedTags: Set<string>): string {
  const template = document.createElement('template')
  template.innerHTML = html
  cleanNode(template.content, allowedTags)
  return template.innerHTML
}

/** Texte riche d'un paragraphe — gras/italique/souligné/lien/liste uniquement. */
export function sanitizeRichText(html: string): string {
  return sanitize(html, RICH_TEXT_ALLOWED_TAGS)
}

/** Bloc "HTML personnalisé" — un peu plus permissif (mise en page basique), toujours sans script. */
export function sanitizeCustomHtml(html: string): string {
  return sanitize(html, CUSTOM_HTML_ALLOWED_TAGS)
}
