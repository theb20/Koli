export declare function isMerchantConfigured(): boolean;
/**
 * Enregistrement à faire une seule fois : associe le projet Google Cloud
 * (celui du compte de service) au compte Merchant Center comme "développeur
 * API" — sans ça, tout appel à l'API Merchant échoue avec UNAUTHENTICATED
 * même si le compte de service a bien accès au compte Merchant Center.
 * `developerEmail` doit être un vrai compte Google humain, jamais un compte
 * de service (qui ne peut pas recevoir d'email) — exigence de l'API Google.
 */
export declare function registerGcpDeveloper(developerEmail: string): Promise<void>;
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