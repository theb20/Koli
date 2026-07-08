"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewOrderAdminEmail = sendNewOrderAdminEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
const PAYMENT_LABELS = {
    orange: 'Orange Money',
    mtn: 'MTN Mobile Money',
    wave: 'Wave',
    cash: 'Paiement à la livraison',
};
function fmt(n) {
    return n.toLocaleString('fr-FR') + '&nbsp;FCFA';
}
async function sendNewOrderAdminEmail(to, order) {
    const adminUrl = process.env.ADMIN_URL ?? 'https://adminskignas.web.app';
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.subheading)('Nouvelle commande')}
      ${(0, components_1.heading)(`💰 ${fmt(order.total)}`)}
      ${(0, components_1.paragraph)(`Une nouvelle commande vient d'être passée par <strong style="color:#111827">${order.clientNom}</strong>.`)}

      ${(0, components_1.divider)()}
      ${(0, components_1.orderItemsTable)(order.items)}

      <div style="margin-top:8px">
        ${(0, components_1.metaTable)([
        ['Commande', order.orderNumber],
        ['Client', order.clientNom],
        ['Téléphone', order.clientTelephone],
        ['Email', order.clientEmail],
        ['Paiement', PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod],
        ['Livraison', order.deliveryMethod === 'express' ? 'Express · 24h' : 'Standard · 48–72h'],
    ])}
      </div>

      ${(0, components_1.ctaButton)('Voir la commande', `${adminUrl}/orders/${order.orderId}`)}
    `, `Nouvelle commande ${order.orderNumber} — ${fmt(order.total)}`);
    await (0, client_1.send)(to, `🛎️ Nouvelle commande ${order.orderNumber} · ${fmt(order.total).replace('&nbsp;', ' ')}`, html);
}
//# sourceMappingURL=new-order-admin.js.map