/**
 * Exporte tous les produits de la base (nom + prix + infos utiles) dans un
 * fichier Excel à la racine du monorepo.
 * Usage : npx tsx scripts/export-products-xlsx.ts
 */
import 'dotenv/config'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import ExcelJS from 'exceljs'

const prisma = new PrismaClient()

const OUTPUT_PATH = path.resolve(__dirname, '../../produits.xlsx')

async function main() {
  console.log('Connexion à la base et récupération des produits...')

  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      brand: true,
      category: true,
      price: true,
      oldPrice: true,
      salePrice: true,
      stock: true,
      isActive: true,
      sold: true,
      createdAt: true,
    },
  })

  console.log(`${products.length} produit(s) trouvé(s).`)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Skignas'
  wb.created = new Date()

  const ws = wb.addWorksheet('Produits')
  ws.columns = [
    { header: 'ID',           key: 'id',        width: 8 },
    { header: 'Nom',          key: 'name',       width: 40 },
    { header: 'Marque',       key: 'brand',      width: 18 },
    { header: 'Catégorie',    key: 'category',   width: 18 },
    { header: 'Prix (FCFA)',  key: 'price',      width: 16 },
    { header: 'Ancien prix',  key: 'oldPrice',   width: 16 },
    { header: 'Prix promo',   key: 'salePrice',  width: 16 },
    { header: 'Stock',        key: 'stock',      width: 10 },
    { header: 'Vendus',       key: 'sold',       width: 10 },
    { header: 'Actif',        key: 'isActive',   width: 10 },
    { header: 'Créé le',      key: 'createdAt',  width: 14 },
  ]

  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
  headerRow.alignment = { vertical: 'middle' }
  headerRow.height = 20

  for (const p of products) {
    ws.addRow({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      price: p.price,
      oldPrice: p.oldPrice ?? '',
      salePrice: p.salePrice ?? '',
      stock: p.stock,
      sold: p.sold,
      isActive: p.isActive ? 'oui' : 'non',
      createdAt: p.createdAt.toISOString().slice(0, 10),
    })
  }

  const priceFmt = '#,##0" FCFA"'
  ;['price', 'oldPrice', 'salePrice'].forEach((key) => {
    const col = ws.getColumn(key)
    col.numFmt = priceFmt
  })

  ws.autoFilter = { from: 'A1', to: 'K1' }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  await wb.xlsx.writeFile(OUTPUT_PATH)
  console.log(`Fichier écrit : ${OUTPUT_PATH}`)
}

main()
  .catch((err) => {
    console.error('Erreur:', err.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
