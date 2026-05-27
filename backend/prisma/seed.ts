/**
 * KOLI — Seed de base de données
 * Importe les produits du frontend + crée les données initiales
 * Commande : npm run db:seed
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/* ─── Produits (repris du frontend) ─────────────────────────── */
const U = 'https://images.unsplash.com/photo-'
const Q = '?w=800&q=85'

type SeedProduct = {
  name: string; brand: string; category: string
  price: number; oldPrice?: number; rating: number; reviews: number
  badge?: string; sold: number; stock?: number; isNew?: boolean; description?: string
  colors?: string[]; images: string[]
  specs?: { label: string; value: string }[]
}

const SEED_PRODUCTS: SeedProduct[] = [
  {
    name: 'Montre Connectée Pro X7', brand: 'TechWave', category: 'hightech',
    price: 29990, oldPrice: 49990, rating: 4.8, reviews: 2341, badge: 'hot', sold: 1240, stock: 12,
    images: [`${U}1546868871-7041f2a55e12${Q}`, `${U}1523275335684-37898b6baf30${Q}`, `${U}1508685096489-7aacd43bd3b1${Q}`, `${U}1579586337278-3befd40fd17a${Q}`],
    colors: ['#1a1a2e', '#c0c0c0', '#b87333'],
    description: 'La Montre Connectée Pro X7 redéfinit l\'élégance technologique. Écran AMOLED 1.4" Always-On, suivi santé 24/7, autonomie 14 jours, étanche 50m.',
    specs: [
      { label: 'Écran', value: 'AMOLED 1.4" Always-On 454×454px' },
      { label: 'Autonomie', value: '14 jours (mode eco : 30 jours)' },
      { label: 'Étanchéité', value: '5ATM — 50 mètres' },
      { label: 'Capteurs', value: 'Cardio, SpO2, Gyroscope, Accéléromètre' },
      { label: 'Garantie', value: '24 mois constructeur' },
    ],
  },
  {
    name: 'Écouteurs Sans Fil ANC 40h', brand: 'SoundMax', category: 'hightech',
    price: 24990, oldPrice: 39990, rating: 4.7, reviews: 1105, badge: 'sale', sold: 890,
    images: [`${U}1505740420928-5e560c06d30e${Q}`, `${U}1484704849700-f032a568e944${Q}`, `${U}1524678714210-9917a6c619c2${Q}`, `${U}1583394838336-acd977736f90${Q}`],
    colors: ['#0a0a0a', '#f5f5f5', '#1a3a6b'],
    description: 'Réduction active du bruit -35dB, 40h d\'autonomie totale, drivers 40mm hi-fi.',
    specs: [
      { label: 'Autonomie écouteurs', value: '10h (ANC on)' },
      { label: 'Autonomie totale', value: '40h avec étui' },
      { label: 'Réduction bruit', value: 'Hybride ANC -35dB' },
      { label: 'Garantie', value: '12 mois' },
    ],
  },
  {
    name: 'Smartphone 5G 256Go Camera 200MP', brand: 'NovaPro', category: 'hightech',
    price: 149990, oldPrice: 189990, rating: 4.9, reviews: 876, badge: 'top', sold: 432,
    images: [`${U}1511707171634-5f897ff02aa9${Q}`, `${U}1598327105666-5b89351aff97${Q}`, `${U}1565849904461-04a58ad377e0${Q}`, `${U}1580910051074-3eb694886505${Q}`],
    colors: ['#0d1117', '#6e40c9', '#c0c0c0'],
    description: 'Capteur 200MP OIS, zoom 10×, Snapdragon 8 Gen 3, charge 100W.',
    specs: [
      { label: 'Écran', value: '6.8" AMOLED 144Hz 2K+' },
      { label: 'Processeur', value: 'Snapdragon 8 Gen 3' },
      { label: 'Caméra', value: '200MP OIS f/1.7' },
      { label: 'Batterie', value: '5000 mAh — Charge 100W' },
    ],
  },
  {
    name: 'Tablette 11" AMOLED 120Hz', brand: 'TabX', category: 'hightech',
    price: 89990, oldPrice: 129990, rating: 4.6, reviews: 543, badge: 'new', sold: 315, isNew: true,
    images: [`${U}1544244015-0df4b3ffc6b0${Q}`, `${U}1561154464-82e9adf32764${Q}`, `${U}1585789575492-f4a154d5b5a9${Q}`, `${U}1627454820516-d7b7d6fe7a59${Q}`],
    colors: ['#1a1a2e', '#f8f8f8'],
    description: 'Écran AMOLED 120Hz, compatibilité stylet, 8h autonomie.',
  },
  {
    name: 'Chargeur Rapide 65W GaN 4-en-1', brand: 'PowerGo', category: 'hightech',
    price: 14990, oldPrice: 24990, rating: 4.5, reviews: 2100, badge: 'sale', sold: 3200,
    images: [`${U}1609091839311-d5365f9ff1c5${Q}`, `${U}1583863788434-e58a36330cf0${Q}`, `${U}1588508065123-287b28e013da${Q}`, `${U}1615655406736-b37c4fabf923${Q}`],
    colors: ['#1a1a1a', '#f5f5f5'],
    description: '4 appareils simultanément, technologie GaN, Power Delivery 3.0.',
  },
  {
    name: 'Caméra Surveillance WiFi 4K', brand: 'SecureCam', category: 'hightech',
    price: 34990, oldPrice: 49990, rating: 4.7, reviews: 671, sold: 560, stock: 8,
    images: [`${U}1555618254-9c4b7bffd6f0${Q}`, `${U}1557597774-9d273605dfa9${Q}`, `${U}1596568400823-3a8a5e1e72e1${Q}`, `${U}1568992687947-868a62a9f521${Q}`],
    description: '4K Ultra HD, détection IA, vision nocturne 30m, sirène 110dB.',
  },
  {
    name: 'Enceinte Bluetooth 360° Waterproof', brand: 'BoomX', category: 'hightech',
    price: 19990, oldPrice: 29990, rating: 4.6, reviews: 1890, badge: 'hot', sold: 2100,
    images: [`${U}1608043152269-30bd6e7b3c67${Q}`, `${U}1558618666-fcd25c85cd64${Q}`, `${U}1589003077984-894e133dabab${Q}`, `${U}1531746020798-e6953c6e8e04${Q}`],
    description: '360° son immersif, IPX7 waterproof, 24h autonomie.',
  },
  {
    name: 'Lampe de Bureau LED Connectée', brand: 'LightIQ', category: 'maison',
    price: 12990, oldPrice: 19990, rating: 4.4, reviews: 892, sold: 1560, isNew: true,
    images: [`${U}1593011951432-d57604b67e31${Q}`, `${U}1507473885765-e6ed057f782c${Q}`, `${U}1554200876-56c2f25224fa${Q}`, `${U}1495474472287-4d71bcdd2085${Q}`],
    description: 'WiFi + Bluetooth, 5 modes, compatible Alexa & Google Home.',
  },
  {
    name: 'Robot Aspirateur Intelligent', brand: 'CleanBot', category: 'maison',
    price: 89990, oldPrice: 139990, rating: 4.8, reviews: 1203, badge: 'top', sold: 743,
    images: [`${U}1558618047-3d306f3de78e${Q}`, `${U}1581578731548-c64695cc6952${Q}`, `${U}1558108781-d36f7a5c0b2c${Q}`, `${U}1603712903765-6b7e4fc5a5e3${Q}`],
    description: 'LiDAR 360°, cartographie 3D, aspiration 4500Pa, compatible App.',
  },
  {
    name: 'Cafetière Automatique Barista', brand: 'BrewMaster', category: 'maison',
    price: 49990, oldPrice: 79990, rating: 4.7, reviews: 654, badge: 'sale', sold: 890,
    images: [`${U}1495474472287-4d71bcdd2085${Q}`, `${U}1611854779393-1b2da9d400fe${Q}`, `${U}1509042239860-f550ce710b93${Q}`, `${U}1461023058943-07fcbe16d735${Q}`],
    description: '19 bars, 10 programmes, mousseur lait, réservoir 1.5L.',
  },
  {
    name: 'Kit Skincare Hydratant Premium', brand: 'GlowPro', category: 'beaute',
    price: 24990, oldPrice: 39990, rating: 4.9, reviews: 3421, badge: 'hot', sold: 5600,
    images: [`${U}1556228453-efd6c1ff04f6${Q}`, `${U}1598440947619-2c35fc9aa908${Q}`, `${U}1570194065650-d99fb4bedf0a${Q}`, `${U}1571781926291-c477ebfd024b${Q}`],
    description: 'Sérum hyaluronique, crème jour SPF30, contour yeux & masque nuit.',
  },
  {
    name: 'Pistolet Massage Professionnel', brand: 'RecoverPro', category: 'sport',
    price: 34990, oldPrice: 59990, rating: 4.8, reviews: 2109, badge: 'top', sold: 3200,
    images: [`${U}1571019613454-1cb2f99b2d8b${Q}`, `${U}1544367567-0f2fcb009e0b${Q}`, `${U}1593079831268-3381b0db4a77${Q}`, `${U}1541534741688-6078c7bdfbe5${Q}`],
    description: '6 têtes, 30 vitesses, 3200tr/min, autonomie 8h, silencieux 45dB.',
  },
  {
    name: 'Tapis Yoga Premium Antidérapant', brand: 'ZenFit', category: 'sport',
    price: 14990, oldPrice: 24990, rating: 4.6, reviews: 1870, badge: 'new', sold: 2800, isNew: true,
    images: [`${U}1544367567-0f2fcb009e0b${Q}`, `${U}1571019613454-1cb2f99b2d8b${Q}`, `${U}1518611507418-8d7cd8e44656${Q}`, `${U}1549576317-d12c97d0658a${Q}`],
    description: 'TPE écologique, 6mm, marqueurs d\'alignement, sac de transport.',
  },
  {
    name: 'Montre GPS Running Endurance', brand: 'SpeedTrack', category: 'sport',
    price: 59990, oldPrice: 89990, rating: 4.7, reviews: 987, badge: 'hot', sold: 1100, stock: 20,
    images: [`${U}1551698618-1dce5972d1c3${Q}`, `${U}1546753181-2f3dc1af8b3a${Q}`, `${U}1558618666-fcd25c85cd64${Q}`, `${U}1508685096489-7aacd43bd3b1${Q}`],
    description: 'GPS multi-bandes, 100h autonomie GPS, V̇O₂max, plan entraînement.',
  },
  {
    name: 'Sneakers Urban Boost Comfort', brand: 'StreetStep', category: 'mode',
    price: 29990, oldPrice: 44990, rating: 4.5, reviews: 2340, badge: 'sale', sold: 4200,
    images: [`${U}1542291026-7eec264c27ff${Q}`, `${U}1595950653106-bde1c8dc02e3${Q}`, `${U}1511556820780-d912e501ef0f${Q}`, `${U}1607522370275-d06b22d66b40${Q}`],
    colors: ['#ffffff', '#000000', '#1a3a6b', '#8b0000'],
    description: 'Semelle amortissante, mesh respirant, design urban, pointures 36–46.',
  },
  {
    name: 'Sac à Dos Cuir Végétal Pro', brand: 'CarryIt', category: 'mode',
    price: 39990, oldPrice: 59990, rating: 4.8, reviews: 1120, badge: 'new', sold: 1890, isNew: true,
    images: [`${U}1553062407-98eeb64c6a62${Q}`, `${U}1491637639811-60e2756cc1c7${Q}`, `${U}1548036161-16d0a52499ef${Q}`, `${U}1564894809611-1742fc40ed80${Q}`],
    colors: ['#1a1a1a', '#8b6914', '#1a3a6b'],
    description: 'Cuir végan PU premium, poche laptop 15", port USB, 30L.',
  },
  {
    name: 'Console Gaming Portable HD', brand: 'GameX', category: 'jeux',
    price: 44990, oldPrice: 69990, rating: 4.9, reviews: 3201, badge: 'hot', sold: 6800,
    images: [`${U}1493711662062-fa541adb3fc8${Q}`, `${U}1612287230288-edd8af3b7f9b${Q}`, `${U}1560419450-1987f6a3ca23${Q}`, `${U}1538481199705-c710c4e965fc${Q}`],
    description: '7" écran IPS, 256Go stockage, HDMI, manettes détachables, 10000mAh.',
  },
  {
    name: 'Kit Lego Technic Architecture', brand: 'BrickPro', category: 'jeux',
    price: 24990, oldPrice: 34990, rating: 4.7, reviews: 892, badge: 'new', sold: 1240, isNew: true,
    images: [`${U}1585399000684-d2f72660f092${Q}`, `${U}1558618047-3d306f3de78e${Q}`, `${U}1606092195730-5d7b9af1eef8${Q}`, `${U}1560419450-1987f6a3ca23${Q}`],
    description: '1542 pièces, mécanismes Technic, niveau expert 16+.',
  },
  {
    name: 'Humidificateur Aromathérapie 5L', brand: 'AirPure', category: 'maison',
    price: 19990, oldPrice: 29990, rating: 4.5, reviews: 1560, sold: 2300,
    images: [`${U}1612200895013-39f2965c0ad4${Q}`, `${U}1586105449291-8c3ef55b9d28${Q}`, `${U}1559181567-c3190b9a0e48${Q}`, `${U}1584735935682-f66f049de3e8${Q}`],
    description: '5L, 360° rotation, 7 couleurs LED, diffuseur huiles essentielles.',
  },
  {
    name: 'Bracelet Connecté Santé Sport', brand: 'FitBand', category: 'sport',
    price: 9990, oldPrice: 14990, rating: 4.4, reviews: 4521, badge: 'sale', sold: 8900,
    images: [`${U}1575311373937-4b31cc48aa14${Q}`, `${U}1524178232363-1fb2b075b655${Q}`, `${U}1551698618-1dce5972d1c3${Q}`, `${U}1558618666-fcd25c85cd64${Q}`],
    colors: ['#000000', '#1a3a6b', '#8b0000', '#2d5016'],
    description: 'Cardio, SpO2, sommeil, 15 sports, 14j autonomie, waterproof.',
  },
]

/* ─── Codes promo ────────────────────────────────────────────── */
const PROMO_CODES = [
  { code: 'KOLI10',      type: 'percent', value: 10, minOrder: 0,       maxUses: null },
  { code: 'BIENVENUE',   type: 'percent', value: 10, minOrder: 0,       maxUses: 1000 },
  { code: 'FLASH50',     type: 'fixed',   value: 5000, minOrder: 50000, maxUses: 200  },
  { code: 'NOEL2026',    type: 'percent', value: 20, minOrder: 100000,  maxUses: 500  },
]

/* ─── Seed principal ─────────────────────────────────────────── */
async function main() {
  console.log('🌱 Démarrage du seed...')

  // Admin user
  const adminPassword = await bcrypt.hash('Admin@Koli2026', 12)
  const admin = await prisma.user.upsert({
    where:  { email: 'admin@koli.cm' },
    update: {},
    create: {
      email:      'admin@koli.cm',
      password:   adminPassword,
      prenom:     'Admin',
      nom:        'Koli',
      role:       'admin',
      isVerified: true,
    },
  })
  console.log(`✅ Admin créé : ${admin.email}`)

  // Client test
  const clientPassword = await bcrypt.hash('Test@1234', 12)
  const client = await prisma.user.upsert({
    where:  { email: 'test@koli.cm' },
    update: {},
    create: {
      email:      'test@koli.cm',
      password:   clientPassword,
      prenom:     'Kouamé',
      nom:        'Atta',
      telephone:  '655123456',
      isVerified: true,
    },
  })
  console.log(`✅ Client test créé : ${client.email}`)

  // Produits
  for (const p of SEED_PRODUCTS) {
    const { images, specs, colors, ...data } = p

    // Vérifier si le produit existe déjà par son nom
    const existing = await prisma.product.findFirst({ where: { name: data.name } })
    if (existing) {
      console.log(`⏭  Produit existant : ${data.name}`)
      continue
    }

    await prisma.product.create({
      data: {
        ...data,
        stock:    data.stock  ?? 100,
        isNew:    data.isNew  ?? false,
        colors:   colors ? JSON.stringify(colors) : null,
        images: { create: images.map((url, i) => ({ url, position: i })) },
        specs:  specs ? { create: specs.map((s, i) => ({ ...s, position: i })) } : undefined,
      },
    })
    console.log(`✅ Produit : ${data.name}`)
  }

  // Codes promo
  for (const promo of PROMO_CODES) {
    await prisma.promoCode.upsert({
      where:  { code: promo.code },
      update: {},
      create: promo,
    })
  }
  console.log(`✅ ${PROMO_CODES.length} codes promo créés`)

  // Adresse pour le client test
  const existingAddr = await prisma.address.findFirst({ where: { userId: client.id } })
  if (!existingAddr) {
    await prisma.address.create({
      data: {
        userId:    client.id,
        label:     'Domicile',
        prenom:    'Kouamé',
        nom:       'Atta',
        telephone: '655123456',
        ville:     'Douala',
        quartier:  'Bonanjo',
        adresse:   'Rue des Bananiers, Immeuble Central 3e étage',
        isDefault: true,
      },
    })
    console.log('✅ Adresse client test créée')
  }

  console.log('\n🎉 Seed terminé avec succès !')
  console.log('──────────────────────────────')
  console.log('Admin  : admin@koli.cm / Admin@Koli2026')
  console.log('Client : test@koli.cm  / Test@1234')
  console.log('Promos : KOLI10, BIENVENUE, FLASH50, NOEL2026')
}

main()
  .catch(e => { console.error('❌ Seed échoué:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
