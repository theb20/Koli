/* ─────────────────────────────────────────────────────────────
   Document complet → un fichier HTML autonome, table-based, styles
   inline + une feuille <style> pour le responsive (empilement des
   colonnes, masquage desktop/mobile) — ce que la plupart des clients de
   messagerie supportent. Conditionnels Outlook (mso) pour la largeur fixe
   du tableau principal, ignorés par les autres clients.

   IMPORTANT : ceci est un aperçu interne (notre propre moteur), pas une
   simulation certifiée de Gmail/Outlook/Apple Mail — voir QA panel pour
   le rappel explicite de cette limite (section 9 du cahier des charges).
───────────────────────────────────────────────────────────── */
import type { EmailDocument } from '@/types/document'
import { renderBlockHtml } from './renderBlockHtml'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function renderDocumentHtml(doc: EmailDocument): string {
  const fontStack = doc.fontFamily === 'serif'
    ? "Georgia, 'Times New Roman', Times, serif"
    : 'Arial, Helvetica, sans-serif'

  const sectionsHtml = doc.sections.map(section => {
    const rows = section.blocks.map(b => renderBlockHtml(b)).join('')
    return `
    <tr>
      <td align="center" bgcolor="${section.backgroundColor}" style="padding:${section.padding.top}px ${section.padding.right}px ${section.padding.bottom}px ${section.padding.left}px">
        <!--[if mso]>
        <table role="presentation" width="${section.contentWidthPx}" align="center"><tr><td>
        <![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${section.contentWidthPx}px;margin:0 auto" class="email-content">
          <tbody>${rows}</tbody>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>`
  }).join('')

  return `<!doctype html>
<html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${esc(doc.subject || 'Sans objet')}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body, table, td { font-family: ${fontStack}; }
  body { margin:0; padding:0; width:100% !important; background:${doc.pageBackground}; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  table { border-collapse:collapse; }
  @media only screen and (max-width:600px) {
    .email-content { width:100% !important; }
    .sm-stack td.sm-col { display:block !important; width:100% !important; padding-right:0 !important; padding-bottom:12px; }
    .sm-hide { display:none !important; }
    .sm-only { display:block !important; }
  }
  @media (prefers-color-scheme: dark) {
    .sm-dark-invert { filter: invert(1); }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${doc.pageBackground}">
  ${doc.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${esc(doc.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${doc.pageBackground}">
    <tbody>${sectionsHtml}</tbody>
  </table>
</body>
</html>`
}
