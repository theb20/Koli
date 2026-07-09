"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewProductRequestAdminEmail = sendNewProductRequestAdminEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
function fmt(n) {
    return n.toLocaleString('fr-FR') + '&nbsp;FCFA';
}
async function sendNewProductRequestAdminEmail(to, req) {
    const adminUrl = process.env.ADMIN_URL ?? 'https://adminskignas.web.app';
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.subheading)('Nouvelle demande de sourcing')}
      ${(0, components_1.heading)(req.productName)}
      ${(0, components_1.paragraph)(`<strong style="color:#111827">${req.clientNom}</strong> recherche ce produit :`)}
      ${(0, components_1.paragraph)(req.description, 'background:#f8faff;border-radius:12px;padding:14px 16px')}

      ${(0, components_1.divider)()}
      ${(0, components_1.metaTable)([
        ['Client', req.clientNom],
        ['Email', req.clientEmail],
        ...(req.clientTelephone ? [['Téléphone', req.clientTelephone]] : []),
        ...(req.quantity ? [['Quantité', String(req.quantity)]] : []),
        ...(req.budget ? [['Budget', fmt(req.budget)]] : []),
        ['Livraison', req.deliveryAddress],
    ])}

      ${(0, components_1.ctaButton)('Répondre à la demande', `${adminUrl}/product-requests/${req.id}`)}
    `, `Nouvelle demande de sourcing : ${req.productName}`);
    await (0, client_1.send)(to, `🔎 Nouvelle demande de sourcing — ${req.productName}`, html);
}
//# sourceMappingURL=new-product-request-admin.js.map