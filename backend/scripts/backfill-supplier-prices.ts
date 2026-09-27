/**
 * Backfill des prix d'achat fournisseurs des produits existants (table
 * product_sourcing). N'affecte QUE les ventes futures : les commandes déjà
 * payées restent « coût inconnu » (on ne recalcule jamais le passé).
 *
 * 1. Exporter les produits du catalogue Skignas sans prix d'achat :
 *      npx tsx scripts/backfill-supplier-prices.ts --export prix-fournisseurs.csv
 * 2. Compléter les colonnes supplier_id et supplier_price (F CFA HT, entier).
 *    Les ids de fournisseurs sont visibles dans l'admin → Fournisseurs.
 * 3. Vérifier (aucune écriture) :
 *      npx tsx scripts/backfill-supplier-prices.ts --file prix-fournisseurs.csv
 * 4. Appliquer :
 *      npx tsx scripts/backfill-supplier-prices.ts --file prix-fournisseurs.csv --apply
 *
 * Les produits des boutiques marchandes sont ignorés (commission merchantgo).
 */
import 'dotenv/config'
import fs from 'fs'
import { PrismaClient } from '@prisma/client'
import { parse } from 'csv-parse/sync'

const prisma = new PrismaClient()
const args = process.argv.slice(2)
const arg = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }

const HEADER = ['product_id', 'name', 'brand', 'price_ht', 'supplier_id', 'supplier_price']
const csvCell = (v: unknown) => { const s = String(v ?? ''); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

async function exportMissing(path: string) {
  const products = await prisma.product.findMany({
    where: { storeId: null, OR: [{ sourcing: { is: null } }, { sourcing: { is: { supplierPrice: null } } }] },
    orderBy: { id: 'asc' },
    select: { id: true, name: true, brand: true, price: true, sourcing: { select: { supplierId: true } } },
  })
  const rows = products.map(p => [p.id, p.name, p.brand, p.price, p.sourcing?.supplierId ?? '', ''])
  fs.writeFileSync(path, [HEADER, ...rows].map(r => r.map(csvCell).join(',')).join('\n') + '\n')
  console.log(`${products.length} produit(s) sans prix d'achat exporté(s) dans ${path}`)
}

async function importFile(path: string, apply: boolean) {
  const records = parse(fs.readFileSync(path), { columns: true, skip_empty_lines: true, trim: true, delimiter: [',', ';'] }) as Record<string, string>[]
  const suppliers = new Map((await prisma.supplier.findMany({ select: { id: true, mode: true } })).map(s => [s.id, s.mode]))
  const updates: { productId: number; supplierId: number | null; supplierPrice: number | null }[] = []
  const errors: string[] = []

  for (const [i, r] of records.entries()) {
    const line = i + 2
    const productId = Number(r['product_id'])
    const supplierId = r['supplier_id'] ? Number(r['supplier_id']) : null
    const rawPrice = (r['supplier_price'] ?? '').replace(/[\s  ]/g, '')
    const supplierPrice = rawPrice ? Number(rawPrice) : null
    if (!Number.isInteger(productId) || productId <= 0) { errors.push(`ligne ${line} : product_id invalide`); continue }
    if (supplierId != null && !suppliers.has(supplierId)) { errors.push(`ligne ${line} : fournisseur ${supplierId} introuvable`); continue }
    if (supplierPrice != null && (!Number.isInteger(supplierPrice) || supplierPrice < 0)) { errors.push(`ligne ${line} : supplier_price doit être un entier ≥ 0 (F CFA)`); continue }
    if (supplierPrice == null && supplierId == null) continue // ligne laissée vide
    if (supplierPrice == null && suppliers.get(supplierId!) !== 'COMMISSION') { errors.push(`ligne ${line} : prix d'achat requis (fournisseur en mode marge)`); continue }
    updates.push({ productId, supplierId, supplierPrice })
  }

  const existing = new Set((await prisma.product.findMany({ where: { id: { in: updates.map(u => u.productId) }, storeId: null }, select: { id: true } })).map(p => p.id))
  for (const u of updates.filter(u => !existing.has(u.productId))) errors.push(`produit ${u.productId} introuvable ou produit marchand`)
  const valid = updates.filter(u => existing.has(u.productId))

  console.log(`${records.length} ligne(s) lue(s) — ${valid.length} à mettre à jour, ${errors.length} erreur(s)`)
  errors.forEach(e => console.log(`  ✗ ${e}`))
  if (!apply) { console.log('Vérification seule : relancez avec --apply pour écrire.'); return }

  for (const u of valid) {
    const data = { supplierId: u.supplierId, supplierPrice: u.supplierPrice }
    await prisma.productSourcing.upsert({ where: { productId: u.productId }, create: { productId: u.productId, ...data }, update: data })
  }
  console.log(`✓ ${valid.length} produit(s) mis à jour`)
}

async function main() {
  const exportPath = arg('--export')
  const file = arg('--file')
  if (exportPath) return exportMissing(exportPath)
  if (file) return importFile(file, args.includes('--apply'))
  console.log('Usage : --export <fichier.csv> | --file <fichier.csv> [--apply]')
}

main()
  .catch(err => { console.error(err); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
