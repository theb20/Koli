/* ─────────────────────────────────────────────────────────────
   Composants HTML réutilisables pour les emails Koli
   Chaque fonction retourne une chaîne HTML inline-stylée,
   compatible Gmail, Outlook, Apple Mail et dark mode.
───────────────────────────────────────────────────────────── */

/** Sous-titre bleu en capslock avant le heading */
export function subheading(text: string): string {
  return `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:600;color:#0421ff;letter-spacing:.6px;text-transform:uppercase;margin:0 0 16px">${text}</p>`
}

/** Titre principal H1 */
export function heading(text: string): string {
  return `<h1 style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:26px;font-weight:800;color:#111827;line-height:1.2;margin:0 0 12px;letter-spacing:-0.5px">${text}</h1>`
}

/** Paragraphe de corps de texte */
export function paragraph(text: string, extraStyle = ''): string {
  return `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;color:#4b5563;line-height:1.75;margin:0 0 16px${extraStyle ? ';' + extraStyle : ''}">${text}</p>`
}

/** Séparateur horizontal */
export function divider(): string {
  return `<div style="border-top:1px solid #e5edff;margin:28px 0"></div>`
}

/** Bouton CTA principal */
export function ctaButton(label: string, url: string, color = '#0421ff'): string {
  return `
    <div style="margin-top:28px">
      <a href="${url}"
        style="display:inline-block;background:${color};color:#ffffff;font-family:system-ui,-apple-system,sans-serif;font-size:14px;font-weight:700;letter-spacing:.3px;padding:14px 32px;border-radius:12px;text-decoration:none;line-height:1">
        ${label} &rarr;
      </a>
    </div>`
}

/** Pill de statut (badge arrondi) */
export function statusTag(label: string, accent: string, accentBg: string): string {
  return `<span style="display:inline-block;background:${accentBg};color:${accent};font-family:system-ui,-apple-system,sans-serif;font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;padding:5px 12px;border-radius:100px;margin:0 0 20px">${label}</span>`
}

/** Bloc encadré avec fond coloré */
export function highlightBox(content: string, bg = '#eef2ff'): string {
  return `
    <div style="background:${bg};border-radius:12px;padding:16px 20px;margin:20px 0">
      ${content}
    </div>`
}

/** Tableau de métadonnées label / valeur alignés */
export function metaTable(rows: Array<[string, string]>): string {
  const html = rows.map(([label, value]) => `
    <tr>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:#9ca3af;padding:10px 0;border-bottom:1px solid #e5edff;white-space:nowrap;vertical-align:middle;padding-right:20px">${label}</td>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#111827;padding:10px 0;border-bottom:1px solid #e5edff;text-align:right;font-weight:500">${value}</td>
    </tr>`).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
      ${html}
    </table>`
}

/** Tableau d'articles de commande */
export function orderItemsTable(items: Array<{ name: string; qty: number; price: number }>): string {
  const fmt = (n: number) => (n / 100).toLocaleString('fr-FR') + '&nbsp;FCFA'

  const rows = items.map(i => `
    <tr>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#111827;padding:11px 0;border-bottom:1px solid #e5edff;line-height:1.4">${i.name}</td>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#6b7280;padding:11px 0;border-bottom:1px solid #e5edff;text-align:center;white-space:nowrap">&times;${i.qty}</td>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;font-weight:600;color:#111827;padding:11px 0;border-bottom:1px solid #e5edff;text-align:right;white-space:nowrap">${fmt(i.price * i.qty)}</td>
    </tr>`).join('')

  return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
      <thead>
        <tr>
          <th style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#9ca3af;padding:0 0 10px;border-bottom:2px solid #111827;text-align:left">Article</th>
          <th style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#9ca3af;padding:0 0 10px;border-bottom:2px solid #111827;text-align:center">Qté</th>
          <th style="font-family:system-ui,-apple-system,sans-serif;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#9ca3af;padding:0 0 10px;border-bottom:2px solid #111827;text-align:right">Prix</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

/** Ligne icône + texte */
export function iconRow(icon: string, text: string): string {
  return `
    <tr>
      <td style="vertical-align:top;padding-right:12px;font-size:18px;padding-top:2px;width:28px">${icon}</td>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.6">${text}</td>
    </tr>`
}
