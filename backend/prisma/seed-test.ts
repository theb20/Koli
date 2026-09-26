/**
 * SKIGNAS — Seed de l'environnement de TEST LOCAL (captures, démos UI).
 *
 * Commande : npm run db:test:seed   (charge .env.test, jamais .env)
 *
 * Identifiants du compte admin de test : lus dans backend/.env.test
 * (jamais commité — TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD). Si le mot de
 * passe est absent, un mot de passe aléatoire est généré et écrit dans
 * .env.test. Aucun secret dans ce fichier (dépôt public, scanné).
 * Le script REFUSE de tourner ailleurs que sur une base locale dont le nom
 * finit par "_test", et il VIDE entièrement la base cible avant d'insérer.
 *
 * Données fictives mais réalistes : FCFA, communes d'Abidjan, 6 mois
 * d'historique de commandes, marchands, retours, avis, demandes de sourcing.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { appendFileSync } from 'node:fs'
import { resolve } from 'node:path'

/* ── Identifiants de test : backend/.env.test (jamais commité) ─ */
const ENV_TEST_PATH = resolve(__dirname, '../.env.test')
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin.test@skignas.local'
let TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? ''
if (!TEST_ADMIN_PASSWORD) {
  TEST_ADMIN_PASSWORD = randomBytes(18).toString('base64url')
  appendFileSync(ENV_TEST_PATH, `\n# Compte admin de test (généré par seed-test)\nTEST_ADMIN_EMAIL=${TEST_ADMIN_EMAIL}\nTEST_ADMIN_PASSWORD=${TEST_ADMIN_PASSWORD}\n`)
}

/* ── Garde-fou : jamais hors d'une base locale *_test ──────── */
const url = process.env.DATABASE_URL ?? ''
const parsed = (() => { try { return new URL(url) } catch { return null } })()
const isLocal = !!parsed && ['localhost', '127.0.0.1'].includes(parsed.hostname)
const dbName  = parsed?.pathname.replace(/^\//, '') ?? ''
if (!isLocal || !dbName.endsWith('_test')) {
  console.error(`✗ Refusé : seed-test ne tourne que sur une base locale "*_test" (reçu : ${parsed?.hostname ?? '?'} / ${dbName || '?'}).`)
  process.exit(1)
}

const prisma = new PrismaClient()

/* ── Aléatoire déterministe (mêmes données à chaque seed) ──── */
let seed = 20260926
const rand  = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const pick  = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!
const int   = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min
const round = (n: number, step = 500) => Math.round(n / step) * step
const daysAgo = (d: number, h = int(8, 20)) => {
  const date = new Date(); date.setDate(date.getDate() - d); date.setHours(h, int(0, 59), 0, 0); return date
}
const img = (slug: string) => `https://picsum.photos/seed/skignas-${slug}/600/600`

const PRENOMS = ['Awa', 'Kouadio', 'Aya', 'Yao', 'Mariam', 'Koffi', 'Adjoua', 'Ibrahim', 'Fatou', 'Serge', 'Aminata', 'Jean-Marc', 'Affoué', 'Moussa', 'Nadège', 'Didier', 'Salimata', 'Hervé', 'Christelle', 'Bakary']
const NOMS    = ['Koné', 'Kouassi', 'Traoré', 'Yao', 'Bamba', 'Ouattara', 'N\'Guessan', 'Diabaté', 'Konan', 'Coulibaly', 'Touré', 'Kouamé', 'Soro', 'Aka', 'Gbagbo', 'Fofana']
const COMMUNES = ['Cocody', 'Cocody', 'Cocody', 'Yopougon', 'Yopougon', 'Plateau', 'Marcory', 'Marcory', 'Abobo', 'Treichville', 'Koumassi', 'Port-Bouët', 'Adjamé', 'Bingerville'] as const
const VILLES_HORS_ABIDJAN = ['Bouaké', 'Yamoussoukro', 'San-Pédro', 'Daloa', 'Korhogo'] as const

const CATEGORIES = [
  { slug: 'telephones',       name: 'Téléphones & Tablettes', icon: 'Smartphone' },
  { slug: 'informatique',     name: 'Informatique',           icon: 'Laptop' },
  { slug: 'maison-connectee', name: 'Maison connectée',        icon: 'Home' },
  { slug: 'electromenager',   name: 'Électroménager',          icon: 'Refrigerator' },
  { slug: 'audio',            name: 'Audio & Son',             icon: 'Headphones' },
  { slug: 'mode',             name: 'Mode',                    icon: 'Shirt' },
  { slug: 'beaute',           name: 'Beauté & Santé',          icon: 'Sparkles' },
  { slug: 'sport',            name: 'Sport & Loisirs',         icon: 'Dumbbell' },
] as const

const PRODUCTS: { name: string; brand: string; cat: typeof CATEGORIES[number]['slug']; price: number; stock: number; store?: number; assistance?: boolean }[] = [
  { name: 'Samsung Galaxy A55 5G 256 Go',        brand: 'Samsung',  cat: 'telephones',       price: 289_000, stock: 24 },
  { name: 'iPhone 15 128 Go',                     brand: 'Apple',    cat: 'telephones',       price: 689_000, stock: 6 },
  { name: 'Tecno Camon 30 Pro',                   brand: 'Tecno',    cat: 'telephones',       price: 164_500, stock: 41, store: 0 },
  { name: 'Infinix Hot 40i',                      brand: 'Infinix',  cat: 'telephones',       price: 79_900,  stock: 3,  store: 0 },
  { name: 'Xiaomi Redmi Pad SE 11"',              brand: 'Xiaomi',   cat: 'telephones',       price: 129_000, stock: 12 },
  { name: 'HP 250 G10 Core i5 16 Go',             brand: 'HP',       cat: 'informatique',     price: 445_000, stock: 9,  assistance: true },
  { name: 'Lenovo IdeaPad Slim 3 Ryzen 5',        brand: 'Lenovo',   cat: 'informatique',     price: 398_000, stock: 0 },
  { name: 'Imprimante Epson EcoTank L3250',       brand: 'Epson',    cat: 'informatique',     price: 119_000, stock: 15, assistance: true },
  { name: 'Onduleur APC 1200 VA',                 brand: 'APC',      cat: 'informatique',     price: 89_500,  stock: 2 },
  { name: 'Routeur TP-Link Archer AX55',          brand: 'TP-Link',  cat: 'informatique',     price: 64_000,  stock: 18, store: 1 },
  { name: 'LSC Smart Connect Caméra Intérieure Full HD', brand: 'LSC', cat: 'maison-connectee', price: 24_900, stock: 33, assistance: true },
  { name: 'Caméra extérieure Ezviz C3TN',         brand: 'Ezviz',    cat: 'maison-connectee', price: 42_000, stock: 21, store: 1, assistance: true },
  { name: 'Boîtier d\'économie d\'énergie',       brand: 'PowerSave', cat: 'maison-connectee', price: 15_000, stock: 60, store: 1 },
  { name: 'Serrure connectée Tuya Wi-Fi',         brand: 'Tuya',     cat: 'maison-connectee', price: 58_000, stock: 4,  store: 1, assistance: true },
  { name: 'Climatiseur Nasco 1,5 CV Inverter',    brand: 'Nasco',    cat: 'electromenager',   price: 329_000, stock: 7,  assistance: true },
  { name: 'Réfrigérateur Hisense 205 L',          brand: 'Hisense',  cat: 'electromenager',   price: 245_000, stock: 5 },
  { name: 'Blender Moulinex 1,5 L',               brand: 'Moulinex', cat: 'electromenager',   price: 32_500,  stock: 27, store: 2 },
  { name: 'Ventilateur sur pied Binatone',        brand: 'Binatone', cat: 'electromenager',   price: 21_000,  stock: 52, store: 2 },
  { name: 'Écouteurs JBL Tune 520BT',             brand: 'JBL',      cat: 'audio',            price: 38_900,  stock: 30 },
  { name: 'Enceinte JBL Flip 6',                  brand: 'JBL',      cat: 'audio',            price: 94_000,  stock: 11 },
  { name: 'Barre de son Samsung HW-C400',         brand: 'Samsung',  cat: 'audio',            price: 115_000, stock: 1 },
  { name: 'Pagne wax Vlisco 6 yards',             brand: 'Vlisco',   cat: 'mode',             price: 45_000,  stock: 40, store: 3 },
  { name: 'Sandales cuir artisanales',            brand: 'Made in CI', cat: 'mode',           price: 18_500,  stock: 25, store: 3 },
  { name: 'Sac à main tissé Bogolan',             brand: 'Made in CI', cat: 'mode',           price: 27_000,  stock: 13, store: 3 },
  { name: 'Beurre de karité bio 500 g',           brand: 'Karité CI', cat: 'beaute',          price: 6_500,   stock: 120, store: 2 },
  { name: 'Tondeuse Philips OneBlade',            brand: 'Philips',  cat: 'beaute',           price: 29_900,  stock: 19 },
  { name: 'Ballon Adidas Côte d\'Ivoire',         brand: 'Adidas',   cat: 'sport',            price: 22_000,  stock: 36 },
  { name: 'Vélo d\'appartement pliable',           brand: 'FitLine',  cat: 'sport',            price: 135_000, stock: 3 },
]

const STORES = [
  { name: 'TechMobile Adjamé', desc: 'Smartphones et accessoires, Adjamé Liberté', prenom: 'Salif', nom: 'Diaby' },
  { name: 'Domotik CI',        desc: 'Maison connectée et sécurité, Cocody Angré', prenom: 'Estelle', nom: 'Kouamé' },
  { name: 'Maison Plus Marcory', desc: 'Électroménager et bien-être, Marcory Zone 4', prenom: 'Arouna', nom: 'Sylla' },
  { name: 'Wax & Co',          desc: 'Mode africaine et artisanat, Treichville', prenom: 'Mireille', nom: 'Aké' },
]

async function wipe() {
  const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  )
  if (tables.length) {
    await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map(t => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`)
  }
}

async function main() {
  console.log(`→ Base de test : ${dbName}`)
  await wipe()

  const hash = await bcrypt.hash(TEST_ADMIN_PASSWORD, 10)

  /* Admin */
  await prisma.user.create({
    data: { email: TEST_ADMIN_EMAIL, password: hash, prenom: 'Frederick', nom: 'Ahobaut', role: 'admin', isVerified: true, telephone: '+2250700000001' },
  })

  /* Réglages, TVA */
  await prisma.siteSettings.create({ data: { id: 1 } })
  await prisma.taxRate.create({ data: { name: 'TVA Côte d\'Ivoire', rate: 18, isDefault: true } })

  /* Catégories */
  const cats = new Map<string, number>()
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await prisma.category.create({ data: { slug: c.slug, name: c.name, icon: c.icon, position: i, image: img(c.slug) } })
    cats.set(c.slug, row.id)
  }

  /* Marchands + boutiques */
  const storeIds: number[] = []
  for (const s of STORES) {
    const u = await prisma.user.create({
      data: {
        email: `${s.prenom.toLowerCase()}.${s.nom.toLowerCase().replace(/[^a-z]/g, '')}@marchand.test`,
        password: hash, prenom: s.prenom, nom: s.nom, role: 'seller', isVerified: true,
        telephone: `+22507${int(10000000, 99999999)}`, createdAt: daysAgo(int(120, 300)),
      },
    })
    const store = await prisma.sellerStore.create({
      data: { userId: u.id, name: s.name, description: s.desc, isApproved: true, logo: img(`logo-${s.name}`), createdAt: daysAgo(int(100, 280)) },
    })
    storeIds.push(store.id)
  }

  /* Produits */
  const products = []
  for (const [i, p] of PRODUCTS.entries()) {
    const onSale = i % 7 === 2
    products.push(await prisma.product.create({
      data: {
        name: p.name, brand: p.brand, category: p.cat, categoryId: cats.get(p.cat),
        price: p.price, oldPrice: i % 4 === 0 ? round(p.price * 1.15) : null,
        stock: p.stock, isActive: i !== PRODUCTS.length - 1, isNew: i % 5 === 0,
        storeId: p.store != null ? storeIds[p.store] : null,
        description: `${p.name} — garanti, livré partout à Abidjan sous 24 à 72 h.`,
        badge: onSale ? 'sale' : i % 6 === 0 ? 'hot' : null,
        salePrice: onSale ? round(p.price * 0.85) : null,
        saleStartsAt: onSale ? daysAgo(2) : null,
        saleEndsAt: onSale ? daysAgo(-5) : null,
        assistanceEnabled: !!p.assistance,
        createdAt: daysAgo(int(30, 200)),
        images: { create: [{ url: img(`p${i}`), position: 0 }] },
      },
    }))
  }

  /* Clients */
  const customers = []
  for (let i = 0; i < 60; i++) {
    const prenom = pick(PRENOMS), nom = pick(NOMS)
    customers.push(await prisma.user.create({
      data: {
        email: `${prenom.toLowerCase().replace(/[^a-z]/g, '')}.${nom.toLowerCase().replace(/[^a-z]/g, '')}${i}@client.test`,
        password: hash, prenom, nom, role: 'customer', isVerified: rand() > 0.2,
        telephone: `+22507${int(10000000, 99999999)}`,
        loyaltyPoints: int(0, 4000), createdAt: daysAgo(int(0, 200)),
      },
    }))
  }

  /* Commandes — 6 mois, croissance progressive, statuts cohérents avec l'âge */
  const orderIds: { id: string; userId: string | null; status: string; items: { id: number; price: number; qty: number }[] }[] = []
  let n = 0
  for (let d = 180; d >= 0; d--) {
    const perDay = Math.max(0, Math.round((d < 30 ? 3.2 : d < 90 ? 2.2 : 1.4) + (rand() - 0.5) * 2.5))
    for (let k = 0; k < perDay; k++) {
      n++
      const customer = rand() > 0.15 ? pick(customers) : null
      const lines = Array.from({ length: int(1, 3) }, () => pick(products.filter(p => p.isActive)))
      const uniq = [...new Map(lines.map(l => [l.id, l])).values()]
      const items = uniq.map(p => ({ product: p, qty: p.price > 200_000 ? 1 : int(1, 3) }))
      const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0)
      const assistanceTotal = items.filter(i => i.product.assistanceEnabled && rand() > 0.6).length * 10_000
      const shippingCost = subtotal >= 25_000 ? 0 : 1_500
      const taxAmount = Math.round((subtotal + assistanceTotal) * 0.18)
      const status =
        d > 10 ? (rand() < 0.08 ? 'cancelled' : 'delivered')
        : d > 5 ? pick(['delivered', 'delivered', 'shipped', 'cancelled'] as const)
        : d > 2 ? pick(['shipped', 'processing', 'confirmed', 'delivered'] as const)
        : pick(['pending', 'pending', 'confirmed', 'processing'] as const)
      const paymentMethod = rand() > 0.35 ? 'online' : 'cash'
      const paid = status !== 'cancelled' && (paymentMethod === 'online' ? status !== 'pending' : status === 'delivered')
      const horsAbidjan = rand() < 0.12
      const prenom = customer?.prenom ?? pick(PRENOMS), nom = customer?.nom ?? pick(NOMS)
      const createdAt = daysAgo(d)
      const order = await prisma.order.create({
        data: {
          orderNumber: `KLI-${createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${String(1000 + n)}`,
          userId: customer?.id ?? null,
          clientPrenom: prenom, clientNom: nom,
          clientEmail: customer?.email ?? `${prenom.toLowerCase().replace(/[^a-z]/g, '')}.invite${n}@client.test`,
          clientTelephone: customer?.telephone ?? `+22501${int(10000000, 99999999)}`,
          deliveryMethod: rand() > 0.8 ? 'express' : 'standard',
          shippingAddress: JSON.stringify(horsAbidjan
            ? { ville: pick(VILLES_HORS_ABIDJAN), quartier: 'Centre', adresse: 'Près du marché central' }
            : { ville: 'Abidjan', quartier: pick(COMMUNES), adresse: `Rue ${int(1, 250)}, lot ${int(1, 900)}` }),
          shippingCost, paymentMethod, paymentStatus: status === 'cancelled' ? 'cancelled' : paid ? 'paid' : 'pending',
          subtotal, assistanceTotal, taxRate: 18, taxAmount,
          total: subtotal + assistanceTotal + taxAmount + shippingCost,
          status, createdAt, updatedAt: createdAt,
          deliveredAt: status === 'delivered' ? daysAgo(Math.max(0, d - int(1, 3))) : null,
          items: {
            create: items.map(i => ({
              productId: i.product.id, name: i.product.name, brand: i.product.brand,
              price: i.product.price, qty: i.qty, image: img(`p${products.indexOf(i.product)}`),
            })),
          },
        },
        include: { items: true },
      })
      orderIds.push({ id: order.id, userId: order.userId, status, items: order.items.map(i => ({ id: i.id, price: i.price, qty: i.qty })) })
    }
  }

  /* Retours — sur des commandes livrées avec compte */
  const deliveredWithUser = orderIds.filter(o => o.status === 'delivered' && o.userId)
  const RETURN_STATES = ['requested', 'requested', 'requested', 'approved', 'received', 'refunded', 'rejected', 'cancelled'] as const
  const REASONS = ['defective', 'wrong_item', 'not_as_described', 'no_longer_needed'] as const
  for (const [i, state] of RETURN_STATES.entries()) {
    const o = deliveredWithUser[deliveredWithUser.length - 1 - i * 3]
    if (!o) break
    const it = o.items[0]!
    await prisma.orderReturn.create({
      data: {
        orderId: o.id, userId: o.userId!, status: state, reason: pick(REASONS),
        customerComment: 'Le produit ne correspond pas à ce que j\'attendais.',
        refundAmount: state === 'refunded' ? it.price : null,
        refundMethod: state === 'refunded' ? 'mobile_money' : null,
        requestedAt: daysAgo(int(1, 10)),
        items: { create: [{ orderItemId: it.id, quantity: 1 }] },
      },
    })
  }

  /* Avis produits + avis plateforme */
  const REVIEW_TEXTS = [
    'Très bon produit, conforme à la description. Livraison rapide à Cocody.',
    'Qualité correcte pour le prix, je recommande.',
    'Livré en 48 h à Yopougon, le livreur était très poli.',
    'Batterie un peu faible mais le reste est parfait.',
    'Excellent rapport qualité/prix, deuxième achat chez Skignas.',
  ]
  for (let i = 0; i < 40; i++) {
    const p = pick(products), u = pick(customers)
    await prisma.review.create({
      data: { userId: u.id, productId: p.id, rating: pick([5, 5, 4, 4, 3, 2]), body: pick(REVIEW_TEXTS), verified: rand() > 0.3, createdAt: daysAgo(int(0, 90)) },
    })
  }
  for (const p of products) {
    const agg = await prisma.review.aggregate({ where: { productId: p.id }, _avg: { rating: true }, _count: { rating: true } })
    await prisma.product.update({ where: { id: p.id }, data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviews: agg._count.rating, sold: int(5, 180) } })
  }
  for (let i = 0; i < 8; i++) {
    await prisma.siteReview.create({ data: { userId: customers[i]!.id, rating: pick([5, 5, 4]), body: pick(REVIEW_TEXTS), createdAt: daysAgo(int(0, 60)) } })
  }

  /* Demandes de sourcing */
  const REQUESTS = [
    ['Groupe électrogène 5 kVA silencieux', 'new'], ['Panneau solaire 300 W + batterie', 'processing'],
    ['PlayStation 5 Slim', 'quoted'], ['Machine à coudre Singer', 'new'], ['Drone DJI Mini 4', 'declined'],
  ] as const
  for (const [name, status] of REQUESTS) {
    const u = pick(customers)
    await prisma.productRequest.create({
      data: {
        userId: u.id, clientPrenom: u.prenom, clientNom: u.nom, clientEmail: u.email, clientTelephone: u.telephone,
        productName: name, description: `Je recherche : ${name}. Merci de me faire une proposition.`,
        quantity: 1, budget: int(100, 900) * 1000, deliveryAddress: `Abidjan, ${pick(COMMUNES)}`,
        status, quotedPrice: status === 'quoted' || status === 'declined' ? int(150, 700) * 1000 : null,
        createdAt: daysAgo(int(0, 20)),
      },
    })
  }

  /* Messages de contact */
  const SUBJECTS = ['Retard de livraison', 'Question sur la garantie', 'Devenir vendeur', 'Paiement Wave non reçu', 'Modifier mon adresse']
  for (const [i, sujet] of SUBJECTS.entries()) {
    const u = pick(customers)
    await prisma.contactMessage.create({
      data: { prenom: u.prenom, nom: u.nom, email: u.email, telephone: u.telephone, sujet, message: `Bonjour, ${sujet.toLowerCase()} pour ma dernière commande. Merci.`, status: i < 3 ? 'new' : 'read', createdAt: daysAgo(int(0, 7)) },
    })
  }

  /* Codes promo */
  await prisma.promoCode.createMany({
    data: [
      { code: 'BIENVENUE10', type: 'percent', value: 10, minOrder: 20_000, usedCount: 42 },
      { code: 'TABASKI5000', type: 'fixed',   value: 5_000, minOrder: 50_000, maxUses: 200, usedCount: 118, expiresAt: daysAgo(-20) },
      { code: 'ABIDJAN2026', type: 'percent', value: 15, minOrder: 100_000, maxUses: 50, usedCount: 50, isActive: false },
    ],
  })

  console.log(`✓ Seed OK : ${products.length} produits, ${customers.length} clients, ${orderIds.length} commandes, ${STORES.length} boutiques.`)
  console.log(`  Admin de test : TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD dans backend/.env.test (non commité)`)
}

main()
  .catch(err => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
