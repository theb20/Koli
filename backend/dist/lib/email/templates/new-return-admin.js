"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewReturnAdminEmail = sendNewReturnAdminEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
const REASON_LABELS = {
    defective: 'Article défectueux',
    wrong_item: 'Mauvais article reçu',
    not_as_described: "Ne correspond pas à la description",
    no_longer_needed: "N'en a plus besoin",
    other: 'Autre',
};
async function sendNewReturnAdminEmail(to, r) {
    const adminUrl = process.env.ADMIN_URL ?? 'https://adminskignas.web.app';
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.subheading)('Nouvelle demande de retour')}
      ${(0, components_1.heading)(`🔄 Retour · ${r.orderNumber}`)}
      ${(0, components_1.paragraph)(`<strong style="color:#111827">${r.clientNom}</strong> souhaite retourner un ou plusieurs articles de sa commande.`)}

      ${(0, components_1.divider)()}

      ${(0, components_1.metaTable)([
        ['Commande', r.orderNumber],
        ['Client', r.clientNom],
        ['Email', r.clientEmail],
        ['Motif', REASON_LABELS[r.reason] ?? r.reason],
        ['Articles', r.itemsLabel],
    ])}

      ${(0, components_1.ctaButton)('Traiter la demande', `${adminUrl}/returns/${r.returnId}`)}
    `, `Nouvelle demande de retour — ${r.orderNumber}`);
    await (0, client_1.send)(to, `🔄 Nouvelle demande de retour · ${r.orderNumber}`, html);
}
//# sourceMappingURL=new-return-admin.js.map