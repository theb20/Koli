/* ─────────────────────────────────────────────────────────────
   Assainissement d'un document HTML d'e-mail complet envoyé tel quel
   (voir lib/email/templates/security-alert.ts, customHtml) — typiquement
   l'export d'un outil externe comme StudioMail : tables, styles inline,
   un bloc <style> pour le responsive. Jamais de script, iframe, objet
   intégré, gestionnaire d'événement ni URL javascript:/data:.

   Réservé à une route [ADMIN] (voir routes/admin-security-emails.ts) : ce
   n'est pas une barrière contre un attaquant disposant déjà d'un accès
   admin (qui pourrait causer bien pire ailleurs), seulement une défense
   en profondeur contre un copier-coller malformé ou un outil compromis.
───────────────────────────────────────────────────────────── */
import sanitizeHtml from 'sanitize-html'

const EMAIL_HTML_TAGS = [
  'html', 'head', 'meta', 'title', 'style', 'body', 'noscript',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'div', 'span', 'p', 'a', 'img', 'br', 'hr',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'small',
]

const options: sanitizeHtml.IOptions = {
  allowedTags: EMAIL_HTML_TAGS,
  allowedAttributes: {
    '*': ['style', 'class', 'align', 'valign', 'width', 'height', 'bgcolor', 'role', 'cellpadding', 'cellspacing', 'border', 'lang', 'dir'],
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    meta: ['charset', 'name', 'content', 'http-equiv'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowProtocolRelative: false,
  // <style> et <head> ne sont pas filtrés tag par tag comme le corps —
  // sanitize-html les garde tels quels s'ils sont dans allowedTags, mais
  // nettoie toujours les attributs on* et les URL dangereuses ailleurs.
  allowVulnerableTags: true,
}

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, options)
}
