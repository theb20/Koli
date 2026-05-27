/** Email de bienvenue après inscription */
export declare function sendWelcomeEmail(to: string, prenom: string): Promise<void>;
/** Email de confirmation de commande */
export declare function sendOrderConfirmationEmail(to: string, order: {
    orderNumber: string;
    prenom: string;
    items: {
        name: string;
        qty: number;
        price: number;
    }[];
    total: number;
    paymentMethod: string;
    deliveryMethod: string;
}): Promise<void>;
/** Email de changement de statut de commande */
export declare function sendOrderStatusEmail(to: string, prenom: string, orderNumber: string, status: string): Promise<void>;
/** Email de réponse au formulaire de contact */
export declare function sendContactReply(to: string, prenom: string, sujet: string): Promise<void>;
//# sourceMappingURL=mailer.d.ts.map