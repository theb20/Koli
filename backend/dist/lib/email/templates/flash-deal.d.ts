export type FlashDealProduct = {
    id: number;
    name: string;
    image: string;
    price: number;
    salePrice: number;
};
export declare function sendFlashDealEmail(to: string, prenom: string, products: FlashDealProduct[], endsAt: Date): Promise<void>;
//# sourceMappingURL=flash-deal.d.ts.map