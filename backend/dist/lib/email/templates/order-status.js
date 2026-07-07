"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOrderStatusEmail = sendOrderStatusEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
const ORDER_STATUS_MAP = {
    confirmed: {
        title: 'Commande confirmée',
        tag: 'Confirmée',
        emoji: '✅',
        accent: '#059669',
        accentBg: '#d1fae5',
        msg: 'Votre commande a été confirmée et est en cours de préparation.',
    },
    preparing: {
        title: 'En préparation',
        tag: 'Préparation',
        emoji: '📦',
        accent: '#d97706',
        accentBg: '#fef3c7',
        msg: 'Notre équipe prépare soigneusement votre colis.',
    },
    shipped: {
        title: 'En livraison',
        tag: 'Expédiée',
        emoji: '🚚',
        accent: '#0891b2',
        accentBg: '#e0f2fe',
        msg: 'Votre colis est en route. Le livreur vous contactera pour la remise.',
    },
    delivered: {
        title: 'Commande livrée',
        tag: 'Livrée',
        emoji: '🎉',
        accent: '#059669',
        accentBg: '#d1fae5',
        msg: "Votre commande vous a bien été remise. Nous espérons qu'elle vous satisfait pleinement.",
    },
    cancelled: {
        title: 'Commande annulée',
        tag: 'Annulée',
        emoji: '❌',
        accent: '#dc2626',
        accentBg: '#fee2e2',
        msg: 'Votre commande a été annulée. Un remboursement sera effectué sous 48h ouvrées si applicable.',
    },
};
async function sendOrderStatusEmail(to, prenom, orderNumber, status) {
    const info = ORDER_STATUS_MAP[status];
    if (!info)
        return;
    const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.ahobaut.fr';
    await (0, client_1.send)(to, `${info.emoji} ${info.title} · ${orderNumber}`, (0, layout_1.baseLayout)(`
      ${(0, components_1.statusTag)(info.tag, info.accent, info.accentBg)}
      ${(0, components_1.heading)(info.title)}
      ${(0, components_1.paragraph)(`Bonjour <strong style="color:#111827">${prenom}</strong>,`)}
      ${(0, components_1.paragraph)(info.msg)}

      ${(0, components_1.highlightBox)(`
        <p style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;color:#6b7280;margin:0 0 6px;text-transform:uppercase;letter-spacing:.5px">Référence commande</p>
        <p style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#111827;margin:0;letter-spacing:.5px">${orderNumber}</p>
      `)}

      ${(0, components_1.ctaButton)('Voir ma commande', `${frontUrl}/commandes/${orderNumber}`, info.accent)}
    `, info.msg));
}
//# sourceMappingURL=order-status.js.map