import type { Order, OrderItem } from '@prisma/client';
import type { SiteSettings } from '@prisma/client';
type OrderWithItems = Order & {
    items: OrderItem[];
};
/** Construit le PDF de facture pour une commande — le document reste à .end() par l'appelant. */
export declare function buildInvoicePdf(order: OrderWithItems, settings: SiteSettings): PDFKit.PDFDocument;
export {};
//# sourceMappingURL=invoicePdf.d.ts.map