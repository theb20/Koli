/* ─────────────────────────────────────────────────────────────
   Composants HTML réutilisables pour les emails Skignas — design
   "Google Material" (Google Sans/Roboto, couleurs Material,
   boutons pilule, ombres douces).
   Chaque fonction retourne une chaîne HTML inline-stylée,
   compatible Gmail, Outlook, Apple Mail et dark mode.
───────────────────────────────────────────────────────────── */

const FONT_BRAND = "'Google Sans',Roboto,Arial,sans-serif"
const FONT_BODY  = 'Roboto,Arial,sans-serif'

/** Sous-titre bleu en capslock avant le heading, avec puce */
export function subheading(text: string): string {
  return `<p style="font-family:${FONT_BRAND};font-size:12px;font-weight:600;color:#1967d2;letter-spacing:.2px;text-transform:uppercase;margin:0 0 14px">
    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#1a73e8;margin-right:8px;vertical-align:middle"></span>${text}
  </p>`
}

/** Titre principal H1 */
export function heading(text: string): string {
  return `<h1 style="font-family:${FONT_BRAND};font-size:22px;font-weight:500;color:#202124;line-height:1.35;margin:0 0 10px;letter-spacing:0">${text}</h1>`
}

/** Paragraphe de corps de texte */
export function paragraph(text: string, extraStyle = ''): string {
  return `<p style="font-family:${FONT_BODY};font-size:14px;color:#5f6368;line-height:1.7;margin:0 0 16px${extraStyle ? ';' + extraStyle : ''}">${text}</p>`
}

/** Séparateur horizontal */
export function divider(): string {
  return `<div style="height:1px;background:#e8eaed;margin:28px 0"></div>`
}

/** Bouton CTA principal (pilule, style Material) */
export function ctaButton(label: string, url: string, color = '#1a73e8'): string {
  return `
    <div style="margin-top:24px">
      <a href="${url}" class="cta"
        style="display:inline-block;background:${color};color:#ffffff;font-family:${FONT_BRAND};font-size:14px;font-weight:500;letter-spacing:.2px;padding:12px 28px;border-radius:20px;text-decoration:none;line-height:1;box-shadow:0 1px 2px 0 rgba(60,64,67,.30),0 1px 3px 1px rgba(60,64,67,.15)">
        ${label}
      </a>
    </div>`
}

/** Badge de confirmation avec coche (ex: "Compte activé") */
export function checkBadge(label: string, color = '#1a73e8'): string {
  return `
    <table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;margin:0 0 20px">
      <tr>
        <td style="vertical-align:middle;padding-right:8px">
          <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${color};text-align:center;line-height:20px">
            <span style="color:#ffffff;font-size:12px;font-weight:700;font-family:Arial,sans-serif">&#10003;</span>
          </span>
        </td>
        <td style="font-family:${FONT_BRAND};font-size:12px;font-weight:600;letter-spacing:.2px;color:#1967d2;vertical-align:middle">${label}</td>
      </tr>
    </table>`
}

/** Bloc de fonctionnalités (icône + titre + description), fond gris clair */
export function featureBlock(items: Array<{ icon: string; iconBg: string; title: string; desc: string }>): string {
  const rows = items.map((it, i) => `
    <tr>
      <td style="vertical-align:top;padding-right:14px;${i < items.length - 1 ? 'padding-bottom:16px;' : ''}width:36px">
        <span style="display:inline-block;width:32px;height:32px;border-radius:8px;background:${it.iconBg};text-align:center;line-height:32px;font-size:16px">${it.icon}</span>
      </td>
      <td style="font-family:${FONT_BODY};font-size:13px;color:#5f6368;line-height:1.6;${i < items.length - 1 ? 'padding-bottom:16px;' : ''}vertical-align:middle">
        <span style="color:#202124;font-weight:500;font-family:${FONT_BRAND}">${it.title}</span><br/>${it.desc}
      </td>
    </tr>`).join('')

  return `
    <table class="feature-block" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8f9fa;border-radius:12px;border-collapse:separate">
      <tr>
        <td style="padding:18px 20px">
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
            <tbody>${rows}</tbody>
          </table>
        </td>
      </tr>
    </table>`
}

/** Pill de statut (badge arrondi) avec puce */
export function statusTag(label: string, accent: string, accentBg: string): string {
  return `<span style="display:inline-block;background:${accentBg};color:${accent};font-family:${FONT_BRAND};font-size:11px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;padding:6px 14px 6px 10px;border-radius:100px;margin:0 0 20px">
    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${accent};margin-right:6px;vertical-align:middle"></span>${label}
  </span>`
}

/** Bloc encadré avec fond coloré et bordure discrète */
export function highlightBox(content: string, bg = '#e8f0fe'): string {
  return `
    <div style="background:${bg};border:1px solid rgba(26,115,232,.12);border-radius:12px;padding:18px 20px;margin:20px 0">
      ${content}
    </div>`
}

/** Tableau de métadonnées label / valeur alignés */
export function metaTable(rows: Array<[string, string]>): string {
  const html = rows.map(([label, value]) => `
    <tr>
      <td style="font-family:${FONT_BODY};font-size:12px;font-weight:500;letter-spacing:.2px;text-transform:uppercase;color:#9aa0a6;padding:11px 0;border-bottom:1px solid #e8eaed;white-space:nowrap;vertical-align:middle;padding-right:20px">${label}</td>
      <td style="font-family:${FONT_BODY};font-size:14px;color:#202124;padding:11px 0;border-bottom:1px solid #e8eaed;text-align:right;font-weight:500">${value}</td>
    </tr>`).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
      ${html}
    </table>`
}

/** Tableau d'articles de commande */
export function orderItemsTable(items: Array<{ name: string; qty: number; price: number }>): string {
  const fmt = (n: number) => n.toLocaleString('fr-FR') + '&nbsp;FCFA'

  const rows = items.map(i => `
    <tr>
      <td style="font-family:${FONT_BODY};font-size:14px;color:#202124;padding:12px 0;border-bottom:1px solid #e8eaed;line-height:1.4">${i.name}</td>
      <td style="font-family:${FONT_BODY};font-size:13px;color:#5f6368;padding:12px 0;border-bottom:1px solid #e8eaed;text-align:center;white-space:nowrap">&times;${i.qty}</td>
      <td style="font-family:${FONT_BODY};font-size:14px;font-weight:500;color:#202124;padding:12px 0;border-bottom:1px solid #e8eaed;text-align:right;white-space:nowrap">${fmt(i.price * i.qty)}</td>
    </tr>`).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
      <thead>
        <tr>
          <th style="font-family:${FONT_BODY};font-size:11px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;color:#9aa0a6;padding:0 0 12px;border-bottom:2px solid #202124;text-align:left">Article</th>
          <th style="font-family:${FONT_BODY};font-size:11px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;color:#9aa0a6;padding:0 0 12px;border-bottom:2px solid #202124;text-align:center">Qté</th>
          <th style="font-family:${FONT_BODY};font-size:11px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;color:#9aa0a6;padding:0 0 12px;border-bottom:2px solid #202124;text-align:right">Prix</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

/** Carte produit en promo (vente flash) — image, prix barré, prix promo, réduction */
export function dealProductCard(p: { name: string; image: string; price: number; salePrice: number; url: string }): string {
  const fmt  = (n: number) => n.toLocaleString('fr-FR') + '&nbsp;FCFA'
  const disc = Math.round(((p.price - p.salePrice) / p.price) * 100)

  return `
    <a href="${p.url}" style="text-decoration:none">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
        style="border-collapse:collapse;border:1px solid #e8eaed;border-radius:12px;overflow:hidden;margin-bottom:14px">
        <tr>
          <td width="88" style="width:88px;vertical-align:top">
            <img src="${p.image}" alt="${p.name}" width="88" height="88" style="width:88px;height:88px;object-fit:cover;display:block" />
          </td>
          <td style="padding:14px 16px;vertical-align:middle">
            <p style="font-family:${FONT_BODY};font-size:13px;font-weight:500;color:#202124;margin:0 0 6px;line-height:1.3">${p.name}</p>
            <span style="display:inline-block;background:#fce8e6;color:#d93025;font-family:${FONT_BRAND};font-size:11px;font-weight:600;padding:3px 8px;border-radius:100px;margin-right:8px">-${disc}%</span>
            <span style="font-family:${FONT_BRAND};font-size:15px;font-weight:600;color:#d93025">${fmt(p.salePrice)}</span>
            <span style="font-family:${FONT_BODY};font-size:12px;color:#9aa0a6;text-decoration:line-through;margin-left:6px">${fmt(p.price)}</span>
          </td>
        </tr>
      </table>
    </a>`
}

/** Ligne icône + texte */
export function iconRow(icon: string, text: string): string {
  return `
    <tr>
      <td style="vertical-align:top;padding-right:12px;font-size:18px;padding-top:2px;padding-bottom:12px;width:28px">${icon}</td>
      <td style="font-family:${FONT_BODY};font-size:13px;color:#5f6368;line-height:1.6;padding-bottom:12px">${text}</td>
    </tr>`
}
