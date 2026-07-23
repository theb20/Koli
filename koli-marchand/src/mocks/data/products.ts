import type { Product, ProductStatus } from '@/types'
import { daysAgo, mulberry32, randomInt } from './rng'

const CATEGORIES = [
  'Smartphones',
  'Ordinateurs portables',
  'Écouteurs & Audio',
  'Accessoires',
  'Montres connectées',
  'Tablettes',
  'Gaming',
  'Stockage & Périphériques',
]

const CATALOG: { name: string; category: string; price: number }[] = [
  { name: 'iPhone 14 Pro Max 256 Go', category: 'Smartphones', price: 745000 },
  { name: 'Samsung Galaxy A54 5G', category: 'Smartphones', price: 265000 },
  { name: 'Xiaomi Redmi Note 13 Pro', category: 'Smartphones', price: 189000 },
  { name: 'MacBook Air M2 13"', category: 'Ordinateurs portables', price: 890000 },
  { name: 'HP Pavilion 15 Ryzen 7', category: 'Ordinateurs portables', price: 420000 },
  { name: 'Lenovo IdeaPad Slim 3', category: 'Ordinateurs portables', price: 310000 },
  { name: 'Écouteurs sans fil Pro X', category: 'Écouteurs & Audio', price: 24500 },
  { name: 'Casque Bluetooth ANC Studio', category: 'Écouteurs & Audio', price: 42000 },
  { name: 'Enceinte Bluetooth portable Boom', category: 'Écouteurs & Audio', price: 18500 },
  { name: 'Montre connectée SmartFit 2', category: 'Montres connectées', price: 32000 },
  { name: 'Montre connectée Sport GPS', category: 'Montres connectées', price: 45500 },
  { name: 'Tablette Galaxy Tab A9', category: 'Tablettes', price: 135000 },
  { name: 'Tablette iPad 10ᵉ génération', category: 'Tablettes', price: 385000 },
  { name: 'Manette PS5 DualSense', category: 'Gaming', price: 47000 },
  { name: 'Casque gaming RGB Surround', category: 'Gaming', price: 28000 },
  { name: 'Chargeur rapide 65W USB-C', category: 'Accessoires', price: 9500 },
  { name: 'Powerbank 20000mAh', category: 'Accessoires', price: 14500 },
  { name: 'Coque de protection renforcée', category: 'Accessoires', price: 4500 },
  { name: 'Câble USB-C vers Lightning 1m', category: 'Accessoires', price: 3500 },
  { name: 'Clavier mécanique RGB', category: 'Stockage & Périphériques', price: 32500 },
  { name: 'Souris gaming sans fil', category: 'Stockage & Périphériques', price: 16500 },
  { name: 'Disque SSD externe 1 To', category: 'Stockage & Périphériques', price: 55000 },
  { name: 'Clé USB 128 Go', category: 'Stockage & Périphériques', price: 9000 },
  { name: 'Webcam Full HD 1080p', category: 'Stockage & Périphériques', price: 21000 },
]

function statusFor(rand: () => number, stock: number): ProductStatus {
  if (stock === 0) return 'out_of_stock'
  if (rand() < 0.12) return 'draft'
  return 'online'
}

export function generateProducts(): Product[] {
  const rand = mulberry32(42)
  return CATALOG.map((entry, i) => {
    const stock = rand() < 0.15 ? 0 : randomInt(rand, 0, 120)
    const soldCount = randomInt(rand, 5, 480)
    const id = `prod_${String(i + 1).padStart(3, '0')}`
    return {
      id,
      sku: `SKG-${String(i + 1).padStart(4, '0')}`,
      name: entry.name,
      category: entry.category,
      price: entry.price,
      compareAtPrice: rand() < 0.3 ? Math.round(entry.price * 1.15) : undefined,
      stock,
      status: statusFor(rand, stock),
      description: `${entry.name} — produit reconditionné vérifié, garanti 6 mois, livré avec accessoires d'origine.`,
      images: [`https://picsum.photos/seed/${id}/300/300`],
      soldCount,
      revenue: soldCount * entry.price,
      createdAt: daysAgo(randomInt(rand, 30, 300)),
      updatedAt: daysAgo(randomInt(rand, 0, 20)),
    }
  })
}

export const PRODUCT_CATEGORIES = CATEGORIES
