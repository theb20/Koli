export type NewOrderWhatsAppPayload = {
    orderNumber: string;
    orderId: string;
    clientNom: string;
    clientTelephone: string;
    total: number;
    paymentMethod: string;
};
/**
 * Notifie l'équipe (SiteSettings.whatsappNumber) d'une nouvelle commande via
 * un message modèle WhatsApp — voir client.ts pour la configuration requise.
 * Ne fait rien (silencieux) si l'API n'est pas configurée ; à l'appelant de
 * décider s'il veut logger l'échec (.catch()) — jamais bloquant pour la commande.
 */
export declare function sendNewOrderWhatsAppNotification(to: string, order: NewOrderWhatsAppPayload): Promise<void>;
//# sourceMappingURL=newOrderNotification.d.ts.map