import type { OrderItem } from '../types';
export type NewOrderAdminPayload = {
    orderNumber: string;
    clientNom: string;
    clientTelephone: string;
    clientEmail: string;
    items: OrderItem[];
    total: number;
    paymentMethod: string;
    deliveryMethod: string;
    orderId: string;
};
export declare function sendNewOrderAdminEmail(to: string, order: NewOrderAdminPayload): Promise<void>;
//# sourceMappingURL=new-order-admin.d.ts.map