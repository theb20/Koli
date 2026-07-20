export declare function isMerchantConfigured(): boolean;
export type MerchantSyncResult = {
    total: number;
    succeeded: number;
    failed: {
        productId: number;
        name: string;
        error: string;
    }[];
    skippedNoImage: {
        productId: number;
        name: string;
    }[];
};
/**
 * Pousse tous les produits actifs vers Google Merchant Center.
 * Un produit sans image est ignoré (Google exige imageLink) plutôt que
 * d'échouer toute la synchronisation. Chaque échec individuel est
 * collecté sans interrompre les suivants.
 */
export declare function syncAllProductsToMerchant(): Promise<MerchantSyncResult>;
//# sourceMappingURL=merchantFeed.d.ts.map