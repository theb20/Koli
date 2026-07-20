"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendReturnStatusEmail = sendReturnStatusEmail;
const client_1 = require("../client");
const layout_1 = require("../layout");
const components_1 = require("../components");
const RETURN_STATUS_MAP = {
    requested: {
        title: 'Demande de retour reçue',
        tag: 'En attente',
        emoji: '📥',
        accent: '#d97706',
        accentBg: '#fef3c7',
        msg: () => 'Votre demande de retour a bien été enregistrée. Notre équipe l\'examine et vous répond sous 48h ouvrées.',
    },
    approved: {
        title: 'Retour approuvé',
        tag: 'Approuvé',
        emoji: '✅',
        accent: '#059669',
        accentBg: '#d1fae5',
        msg: () => 'Votre demande de retour a été approuvée. Merci de nous renvoyer le(s) article(s) selon les instructions communiquées.',
    },
    rejected: {
        title: 'Retour refusé',
        tag: 'Refusé',
        emoji: '❌',
        accent: '#dc2626',
        accentBg: '#fee2e2',
        msg: (extra) => extra ? `Votre demande de retour n'a pas pu être acceptée. Motif : ${extra}` : "Votre demande de retour n'a pas pu être acceptée.",
    },
    received: {
        title: 'Article reçu',
        tag: 'Reçu',
        emoji: '📦',
        accent: '#0891b2',
        accentBg: '#e0f2fe',
        msg: () => "Nous avons bien reçu et contrôlé votre retour. Le remboursement est en cours de traitement.",
    },
    refunded: {
        title: 'Remboursement effectué',
        tag: 'Remboursé',
        emoji: '💳',
        accent: '#059669',
        accentBg: '#d1fae5',
        msg: () => 'Votre remboursement a été traité. Comptez 3 à 5 jours ouvrés pour voir les fonds sur votre moyen de paiement.',
    },
    cancelled: {
        title: 'Retour annulé',
        tag: 'Annulé',
        emoji: '🚫',
        accent: '#6b7280',
        accentBg: '#f3f4f6',
        msg: () => 'Votre demande de retour a été annulée à votre demande.',
    },
};
async function sendReturnStatusEmail(to, prenom, orderNumber, status, extra) {
    const info = RETURN_STATUS_MAP[status];
    if (!info)
        return;
    const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com';
    const message = info.msg(extra);
    const html = await (0, layout_1.baseLayout)(`
      ${(0, components_1.statusTag)(info.tag, info.accent, info.accentBg)}
      ${(0, components_1.heading)(info.title)}
      ${(0, components_1.paragraph)(`Bonjour <strong style="color:#111827">${prenom}</strong>,`)}
      ${(0, components_1.paragraph)(message)}

      ${(0, components_1.highlightBox)(`
        <p style="font-family:system-ui,-apple-system,sans-serif;font-size:12px;font-weight:600;color:#6b7280;margin:0 0 6px;text-transform:uppercase;letter-spacing:.5px">Commande concernée</p>
        <p style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#111827;margin:0;letter-spacing:.5px">${orderNumber}</p>
      `)}

      ${(0, components_1.ctaButton)('Suivre ma commande', `${frontUrl}/commandes/${orderNumber}`, info.accent)}
    `, message);
    await (0, client_1.send)(to, `${info.emoji} ${info.title} · ${orderNumber}`, html);
}
//# sourceMappingURL=return-status.js.map