"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMerchantConfigured = isMerchantConfigured;
exports.syncAllProductsToMerchant = syncAllProductsToMerchant;
/* ─────────────────────────────────────────────────────────────
   Synchronisation du catalogue vers Google Merchant Center, via
   l'API Merchant officielle (@google-shopping/products) — pas un flux
   que Google viendrait lire lui-même : c'est nous qui poussons les
   produits vers Google, à la demande (déclenché depuis le back-office).

   Configuration requise (backend/.env) :
     GOOGLE_MERCHANT_ACCOUNT_ID     — ID du compte Merchant Center
     GOOGLE_MERCHANT_DATA_SOURCE_ID — ID de la source de données "API"
                                      (créée dans Merchant Center → Ajouter
                                      une source de produits → À l'aide de l'API)
     GOOGLE_MERCHANT_CLIENT_EMAIL   — email du compte de service GCP
     GOOGLE_MERCHANT_PRIVATE_KEY    — clé privée du compte de service
     GOOGLE_MERCHANT_FEED_LABEL     — optionnel, défaut "CI"

   Le compte de service doit être ajouté comme utilisateur du compte
   Merchant Center (Paramètres → Accès au compte) avant de fonctionner.

   Tant que ces variables sont absentes, isMerchantConfigured() est
   false et la synchronisation échoue proprement (message clair),
   jamais de crash au démarrage du serveur pour cette intégration
   optionnelle.
───────────────────────────────────────────────────────────── */
const products_1 = require("@google-shopping/products");
const prisma_1 = require("./prisma");
const FEED_LABEL = process.env.GOOGLE_MERCHANT_FEED_LABEL ?? 'CI';
const CURRENCY = 'XOF'; // Franc CFA (BCEAO) — devise utilisée par Skignas
function isMerchantConfigured() {
    return Boolean(process.env.GOOGLE_MERCHANT_ACCOUNT_ID &&
        process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID &&
        process.env.GOOGLE_MERCHANT_CLIENT_EMAIL &&
        process.env.GOOGLE_MERCHANT_PRIVATE_KEY);
}
function getClient() {
    return new products_1.ProductInputsServiceClient({
        credentials: {
            client_email: process.env.GOOGLE_MERCHANT_CLIENT_EMAIL,
            // Les clés privées stockées en variable d'env contiennent des "\n"
            // littéraux (échappés) plutôt que de vrais retours à la ligne.
            private_key: process.env.GOOGLE_MERCHANT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
    });
}
function toAmountMicros(fcfa) {
    return String(Math.round(fcfa * 1_000_000));
}
function buildProductInput(p, accountId, dataSourceId) {
    const frontUrl = process.env.FRONTEND_URL ?? 'https://skignas.com';
    const [primaryImage, ...otherImages] = p.images;
    return {
        parent: `accounts/${accountId}`,
        dataSource: `accounts/${accountId}/dataSources/${dataSourceId}`,
        productInput: {
            offerId: String(p.id),
            contentLanguage: 'fr',
            feedLabel: FEED_LABEL,
            productAttributes: {
                title: p.name,
                description: p.description || p.name,
                link: `${frontUrl}/catalogue/${p.id}`,
                imageLink: primaryImage?.url,
                additionalImageLinks: otherImages.slice(0, 9).map(i => i.url),
                availability: p.stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
                condition: 'NEW',
                brand: p.brand,
                price: { amountMicros: toAmountMicros(p.price), currencyCode: CURRENCY },
                ...(p.salePrice ? { salePrice: { amountMicros: toAmountMicros(p.salePrice), currencyCode: CURRENCY } } : {}),
                productTypes: [p.category],
            },
        },
    };
}
/**
 * Pousse tous les produits actifs vers Google Merchant Center.
 * Un produit sans image est ignoré (Google exige imageLink) plutôt que
 * d'échouer toute la synchronisation. Chaque échec individuel est
 * collecté sans interrompre les suivants.
 */
async function syncAllProductsToMerchant() {
    if (!isMerchantConfigured()) {
        throw new Error('Google Merchant Center non configuré (variables GOOGLE_MERCHANT_* manquantes)');
    }
    const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID;
    const dataSourceId = process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID;
    const client = getClient();
    const products = await prisma_1.prisma.product.findMany({
        where: { isActive: true },
        select: {
            id: true, name: true, brand: true, category: true, price: true,
            salePrice: true, stock: true, description: true,
            images: { orderBy: { position: 'asc' }, select: { url: true } },
        },
    });
    const result = { total: products.length, succeeded: 0, failed: [], skippedNoImage: [] };
    for (const p of products) {
        if (p.images.length === 0) {
            result.skippedNoImage.push({ productId: p.id, name: p.name });
            continue;
        }
        try {
            const request = buildProductInput(p, accountId, dataSourceId);
            await client.insertProductInput(request);
            result.succeeded++;
        }
        catch (err) {
            result.failed.push({
                productId: p.id,
                name: p.name,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    return result;
}
//# sourceMappingURL=merchantFeed.js.map