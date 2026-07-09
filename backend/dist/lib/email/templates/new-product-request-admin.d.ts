export type NewProductRequestAdminPayload = {
    id: string;
    productName: string;
    description: string;
    clientNom: string;
    clientEmail: string;
    clientTelephone?: string | null;
    quantity?: number | null;
    budget?: number | null;
    deliveryAddress: string;
};
export declare function sendNewProductRequestAdminEmail(to: string, req: NewProductRequestAdminPayload): Promise<void>;
//# sourceMappingURL=new-product-request-admin.d.ts.map