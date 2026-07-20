"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNewOrderWhatsAppNotification = sendNewOrderWhatsAppNotification;
const client_1 = require("./client");
const TEMPLATE_NAME = process.env.WHATSAPP_ORDER_TEMPLATE ?? 'new_order_notification';
const TEMPLATE_LANG = process.env.WHATSAPP_ORDER_TEMPLATE_LANG ?? 'fr';
const PAYMENT_LABELS = {
    orange: 'Orange Money',
    mtn: 'MTN Mobile Money',
    wave: 'Wave',
    cash: 'Paiement à la livraison',
};
/**
 * Notifie l'équipe (SiteSettings.whatsappNumber) d'une nouvelle commande via
 * un message modèle WhatsApp — voir client.ts pour la configuration requise.
 * Ne fait rien (silencieux) si l'API n'est pas configurée ; à l'appelant de
 * décider s'il veut logger l'échec (.catch()) — jamais bloquant pour la commande.
 */
async function sendNewOrderWhatsAppNotification(to, order) {
    if (!(0, client_1.isWhatsAppConfigured)())
        return;
    const components = [
        {
            type: 'body',
            parameters: [
                { type: 'text', text: order.orderNumber },
                { type: 'text', text: order.clientNom },
                { type: 'text', text: order.clientTelephone },
                { type: 'text', text: order.total.toLocaleString('fr-FR') },
                { type: 'text', text: PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod },
            ],
        },
        {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: order.orderId }],
        },
    ];
    await (0, client_1.sendWhatsAppTemplate)(to, TEMPLATE_NAME, TEMPLATE_LANG, components);
}
//# sourceMappingURL=newOrderNotification.js.map