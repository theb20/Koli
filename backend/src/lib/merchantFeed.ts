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
import { ProductInputsServiceClient } from '@google-shopping/products'
import { DeveloperRegistrationServiceClient } from '@google-shopping/accounts'
import { prisma } from './prisma'

const FEED_LABEL = process.env.GOOGLE_MERCHANT_FEED_LABEL ?? 'CI'
const CURRENCY   = 'XOF' // Franc CFA (BCEAO) — devise utilisée par Skignas

// Volontairement PAS FRONTEND_URL : cette variable est souvent réglée sur
// localhost en dev, et Google refuse (et déréférence) tout produit dont le
// lien ne correspond pas au domaine validé dans Merchant Center. Le lien
// produit envoyé à Google doit toujours pointer vers le vrai site public,
// quel que soit l'environnement où tourne le backend qui lance la synchro.
const PUBLIC_SITE_URL = process.env.GOOGLE_MERCHANT_SITE_URL ?? 'https://skignas.com'

export function isMerchantConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_MERCHANT_ACCOUNT_ID &&
    process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID &&
    process.env.GOOGLE_MERCHANT_CLIENT_EMAIL &&
    process.env.GOOGLE_MERCHANT_PRIVATE_KEY,
  )
}

function getCredentials() {
  return {
    client_email: process.env.GOOGLE_MERCHANT_CLIENT_EMAIL,
    // Les clés privées stockées en variable d'env contiennent des "\n"
    // littéraux (échappés) plutôt que de vrais retours à la ligne.
    private_key: process.env.GOOGLE_MERCHANT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }
}

function getClient(): ProductInputsServiceClient {
  return new ProductInputsServiceClient({ credentials: getCredentials() })
}

/**
 * Enregistrement à faire une seule fois : associe le projet Google Cloud
 * (celui du compte de service) au compte Merchant Center comme "développeur
 * API" — sans ça, tout appel à l'API Merchant échoue avec UNAUTHENTICATED
 * même si le compte de service a bien accès au compte Merchant Center.
 * `developerEmail` doit être un vrai compte Google humain, jamais un compte
 * de service (qui ne peut pas recevoir d'email) — exigence de l'API Google.
 */
export async function registerGcpDeveloper(developerEmail: string): Promise<void> {
  if (!isMerchantConfigured()) {
    throw new Error('Google Merchant Center non configuré (variables GOOGLE_MERCHANT_* manquantes)')
  }
  const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID!
  const client = new DeveloperRegistrationServiceClient({ credentials: getCredentials() })
  await client.registerGcp({
    name: `accounts/${accountId}/developerRegistration`,
    developerEmail,
  })
}

type ProductForMerchant = {
  id: number
  name: string
  brand: string
  category: string
  price: number
  salePrice: number | null
  stock: number
  description: string | null
  images: { url: string }[]
}

function toAmountMicros(fcfa: number): string {
  return String(Math.round(fcfa * 1_000_000))
}

function buildProductInput(p: ProductForMerchant, accountId: string, dataSourceId: string) {
  const [primaryImage, ...otherImages] = p.images

  return {
    parent: `accounts/${accountId}`,
    dataSource: `accounts/${accountId}/dataSources/${dataSourceId}`,
    productInput: {
      offerId: String(p.id),
      contentLanguage: 'fr',
      feedLabel: FEED_LABEL,
      productAttributes: {
        title:       p.name,
        description: p.description || p.name,
        link:        `${PUBLIC_SITE_URL}/catalogue/${p.id}`,
        imageLink:   primaryImage?.url,
        additionalImageLinks: otherImages.slice(0, 9).map(i => i.url),
        availability: p.stock > 0 ? 'IN_STOCK' as const : 'OUT_OF_STOCK' as const,
        condition:    'NEW' as const,
        brand:        p.brand,
        price:        { amountMicros: toAmountMicros(p.price), currencyCode: CURRENCY },
        ...(p.salePrice ? { salePrice: { amountMicros: toAmountMicros(p.salePrice), currencyCode: CURRENCY } } : {}),
        productTypes: [p.category],
      },
    },
  }
}

export type MerchantSyncResult = {
  total: number
  succeeded: number
  failed: { productId: number; name: string; error: string }[]
  skippedNoImage: { productId: number; name: string }[]
}

/**
 * Pousse tous les produits actifs vers Google Merchant Center.
 * Un produit sans image est ignoré (Google exige imageLink) plutôt que
 * d'échouer toute la synchronisation. Chaque échec individuel est
 * collecté sans interrompre les suivants.
 */
export async function syncAllProductsToMerchant(): Promise<MerchantSyncResult> {
  if (!isMerchantConfigured()) {
    throw new Error('Google Merchant Center non configuré (variables GOOGLE_MERCHANT_* manquantes)')
  }

  const accountId    = process.env.GOOGLE_MERCHANT_ACCOUNT_ID!
  const dataSourceId = process.env.GOOGLE_MERCHANT_DATA_SOURCE_ID!
  const client = getClient()

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, brand: true, category: true, price: true,
      salePrice: true, stock: true, description: true,
      images: { orderBy: { position: 'asc' }, select: { url: true } },
    },
  })

  const result: MerchantSyncResult = { total: products.length, succeeded: 0, failed: [], skippedNoImage: [] }

  for (const p of products) {
    if (p.images.length === 0) {
      result.skippedNoImage.push({ productId: p.id, name: p.name })
      continue
    }
    const request = buildProductInput(p, accountId, dataSourceId)
    const err = await insertWithRetry(client, request)
    if (err) {
      result.failed.push({ productId: p.id, name: p.name, error: err })
    } else {
      result.succeeded++
    }
  }

  return result
}

/**
 * Réessaie un envoi qui échoue avec une erreur transitoire connue côté
 * Google — observé en pratique : juste après un registerGcp/changement
 * de droits, la vérification "utilisateur API_DEVELOPER vérifié" touche
 * un cache Google pas encore propagé partout, un produit sur trois environ
 * échoue au hasard puis passe à la tentative suivante. DEADLINE_EXCEEDED
 * (timeout réseau ponctuel) est réessayé pour la même raison.
 * Retourne le message d'erreur final si les 3 tentatives échouent, sinon null.
 */
async function insertWithRetry(
  client: ProductInputsServiceClient,
  request: Parameters<ProductInputsServiceClient['insertProductInput']>[0],
  attempts = 3,
): Promise<string | null> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await client.insertProductInput(request)
      return null
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const transient = /UNAUTHENTICATED.*verified.*not pending|DEADLINE_EXCEEDED/i.test(message)
      if (!transient || attempt === attempts) return message
      await new Promise(resolve => setTimeout(resolve, attempt * 2000))
    }
  }
  return 'Échec après plusieurs tentatives'
}
