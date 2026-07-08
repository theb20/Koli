"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderConfirmationEmail = sendOrderConfirmationEmail;
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
async function sendOrderConfirmationEmail(to, order) {
    const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com';
    const paymentLabel = PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod;
    const deliveryLabel = order.deliveryMethod === 'express' ? 'Express · 24h' : 'Standard · 48–72h';
    const sub = order.subtotal ?? order.items.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = order.shippingCost ?? 0;
    const promo = order.promoDiscount ?? 0;
    const summaryRows = [
        ['Sous-total', fmt(sub)],
        ...(promo > 0 ? [['Promo', `<span style="color:#059669">−${fmt(promo)}</span>`]] : []),
        ['Livraison', shipping === 0 ? '<span style="color:#059669">Gratuite</span>' : fmt(shipping)],
    ];
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.statusTag)('Commande reçue', '#059669', '#ecfdf5')}
      ${(0, components_1.heading)(`Merci, ${order.prenom} !`)}
      ${(0, components_1.paragraph)(`Votre commande <strong style="color:#0421ff">${order.orderNumber}</strong> a bien été reçue et est en cours de traitement.`)}

      ${(0, components_1.divider)()}
      ${(0, components_1.orderItemsTable)(order.items)}

      <div style="margin-top:8px">
        ${(0, components_1.metaTable)(summaryRows)}
      </div>

      ${(0, components_1.highlightBox)(`
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse">
          <tr>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:13px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:#6b7280">Total</td>
            <td style="font-family:system-ui,-apple-system,sans-serif;font-size:22px;font-weight:900;color:#0421ff;text-align:right;letter-spacing:-0.5px">${fmt(order.total)}</td>
          </tr>
        </table>
      `, '#eef2ff')}

      ${(0, components_1.divider)()}
      ${(0, components_1.metaTable)([
        ['Paiement', paymentLabel],
        ['Livraison', deliveryLabel],
    ])}

      ${(0, components_1.ctaButton)('Suivre ma commande', `${frontUrl}/commandes/${order.orderNumber}`)}
    `, `Votre commande ${order.orderNumber} est confirmée.`);
    await (0, client_1.send)(to, `Commande ${order.orderNumber} confirmée ✓`, html);
}
//# sourceMappingURL=order-confirmation.js.map