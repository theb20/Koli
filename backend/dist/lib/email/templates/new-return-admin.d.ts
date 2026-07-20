export type NewReturnAdminPayload = {
    orderNumber: string;
    clientNom: string;
    clientEmail: string;
    reason: string;
    itemsLabel: string;
    returnId: string;
};
export declare function sendNewReturnAdminEmail(to: string, r: NewReturnAdminPayload): Promise<void>;
//# sourceMappingURL=new-return-admin.d.ts.map