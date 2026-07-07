"use strict";
/* ─────────────────────────────────────────────────────────────
   Composants HTML réutilisables pour les emails Skignas
   Chaque fonction retourne une chaîne HTML inline-stylée,
   compatible Gmail, Outlook, Apple Mail et dark mode.
───────────────────────────────────────────────────────────── */
Object.defineProperty(exports, "__esModule", { value: true });
exports.subheading = subheading;
exports.heading = heading;
exports.paragraph = paragraph;
exports.divider = divider;
exports.ctaButton = ctaButton;
exports.statusTag = statusTag;
exports.highlightBox = highlightBox;
exports.metaTable = metaTable;
exports.orderItemsTable = orderItemsTable;
exports.iconRow = iconRow;
/** Sous-titre bleu en capslock avant le heading */
function subheading(text) {
    return `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:600;color:#0421ff;letter-spacing:.6px;text-transform:uppercase;margin:0 0 16px">${text}</p>`;
}
/** Titre principal H1 */
function heading(text) {
    return `<h1 style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:26px;font-weight:800;color:#111827;line-height:1.2;margin:0 0 12px;letter-spacing:-0.5px">${text}</h1>`;
}
/** Paragraphe de corps de texte */
function paragraph(text, extraStyle = '') {
    return `<p style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;color:#4b5563;line-height:1.75;margin:0 0 16px${extraStyle ? ';' + extraStyle : ''}">${text}</p>`;
}
/** Séparateur horizontal */
function divider() {
    return `<div style="border-top:1px solid #e5edff;margin:28px 0"></div>`;
}
/** Bouton CTA principal */
function ctaButton(label, url, color = '#0421ff') {
    return `
    <div style="margin-top:28px">
      <a href="${url}"
        style="display:inline-block;background:${color};color:#ffffff;font-family:system-ui,-apple-system,sans-serif;font-size:14px;font-weight:700;letter-spacing:.3px;padding:14px 32px;border-radius:12px;text-decoration:none;line-height:1">
        ${label} &rarr;
      </a>
    </div>`;
}
/** Pill de statut (badge arrondi) */
function statusTag(label, accent, accentBg) {
    return `<span style="display:inline-block;background:${accentBg};color:${accent};font-family:system-ui,-apple-system,sans-serif;font-size:11px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;padding:5px 12px;border-radius:100px;margin:0 0 20px">${label}</span>`;
}
/** Bloc encadré avec fond coloré */
function highlightBox(content, bg = '#eef2ff') {
    return `
    <div style="background:${bg};border-radius:12px;padding:16px 20px;margin:20px 0">
      ${content}
    </div>`;
}
/** Tableau de métadonnées label / valeur alignés */
function metaTable(rows) {
    const html = rows.map(([label, value]) => `
    <tr>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;letter-spacing:.4px;text-transform:uppercase;color:#9ca3af;padding:10px 0;border-bottom:1px solid #e5edff;white-space:nowrap;vertical-align:middle;padding-right:20px">${label}</td>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#111827;padding:10px 0;border-bottom:1px solid #e5edff;text-align:right;font-weight:500">${value}</td>
    </tr>`).join('');
    return `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
      ${html}
    </table>`;
}
/** Tableau d'articles de commande */
function orderItemsTable(items) {
    const fmt = (n) => n.toLocaleString('fr-FR') + '&nbsp;FCFA';
    const rows = items.map(i => `
    <tr>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;color:#111827;padding:11px 0;border-bottom:1px solid #e5edff;line-height:1.4">${i.name}</td>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#6b7280;padding:11px 0;border-bottom:1px solid #e5edff;text-align:center;white-space:nowrap">&times;${i.qty}</td>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;font-weight:600;color:#111827;padding:11px 0;border-bottom:1px solid #e5edff;text-align:right;white-space:nowrap">${fmt(i.price * i.qty)}</td>
    </tr>`).join('');
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
    </table>`;
}
/** Ligne icône + texte */
function iconRow(icon, text) {
    return `
    <tr>
      <td style="vertical-align:top;padding-right:12px;font-size:18px;padding-top:2px;width:28px">${icon}</td>
      <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;color:#374151;line-height:1.6">${text}</td>
    </tr>`;
}
//# sourceMappingURL=components.js.map