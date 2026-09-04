import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { computeDocumentTotals, toMinorUnits } from '../src/lib/money.js'

const prisma = new PrismaClient()

async function main() {
  const email = 'demo@skignas.com'
  const passwordHash = await bcrypt.hash('demo1234', 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, firstName: 'Frédérick', lastName: 'Ahobaut' },
  })

  const companyA = await prisma.company.create({
    data: {
      userId: user.id,
      name: 'Skignas SARL',
      address: 'Cocody Angré, Abidjan, Côte d’Ivoire',
      phone: '+225 07 00 00 00 00',
      email: 'contact@skignas.com',
      website: 'https://skignas.com',
      taxId: 'CI-ABJ-2026-B-00000',
      rccm: 'CI-ABJ-2026-B-12345',
      logoUrl: null,
    },
  })
  const companyB = await prisma.company.create({
    data: {
      userId: user.id,
      name: 'Skignas Services',
      address: 'Plateau, Abidjan, Côte d’Ivoire',
      phone: '+225 05 00 00 00 00',
      email: 'services@skignas.com',
      taxId: 'CI-ABJ-2026-B-00001',
      rccm: 'CI-ABJ-2026-B-54321',
    },
  })

  await prisma.membership.createMany({
    data: [
      { userId: user.id, companyId: companyA.id, role: 'ADMIN' },
      { userId: user.id, companyId: companyB.id, role: 'ADMIN' },
    ],
  })

  for (const company of [companyA, companyB]) {
    await prisma.documentSettings.create({
      data: {
        companyId: company.id,
        defaultCurrency: 'XOF',
        defaultTerms: 'Cette facture proforma est valable 30 jours à compter de sa date d’émission.',
        defaultFooter: `${company.name} — Merci de votre confiance.`,
      },
    })
  }

  const tvaStandard = await prisma.tax.create({ data: { companyId: companyA.id, name: 'TVA', rate: 18, isDefault: true } })
  await prisma.tax.create({ data: { companyId: companyA.id, name: 'Exonéré', rate: 0 } })
  const tvaB = await prisma.tax.create({ data: { companyId: companyB.id, name: 'TVA', rate: 18, isDefault: true } })

  await prisma.paymentTerm.createMany({
    data: [
      { companyId: companyA.id, label: 'Paiement à réception', description: 'Paiement dû immédiatement à réception de la facture.' },
      { companyId: companyA.id, label: '30 jours net', description: 'Paiement dû sous 30 jours à compter de la date d’émission.' },
      { companyId: companyB.id, label: '50% à la commande, solde à la livraison' },
    ],
  })

  const clientNames = [
    { name: 'Groupe Ivoire Distribution', contact: 'Mariam Koné', email: 'achats@ivoiredistribution.ci', country: 'Côte d’Ivoire' },
    { name: 'Atelier Bogolan Design', contact: 'Yves Traoré', email: 'contact@bogolandesign.ci', country: 'Côte d’Ivoire' },
    { name: 'Nour Import-Export', contact: 'Nour Haddad', email: 'nour@nourimportexport.com', country: 'Sénégal' },
    { name: 'Cabinet Konan & Associés', contact: 'Aya Konan', email: 'aya.konan@konanassocies.ci', country: 'Côte d’Ivoire' },
    { name: 'Boutique Wax & Co', contact: 'Fatou Diarra', email: 'commande@waxandco.ci', country: 'Côte d’Ivoire' },
  ]
  const clients = []
  for (const c of clientNames) {
    clients.push(
      await prisma.client.create({
        data: {
          companyId: companyA.id,
          name: c.name,
          contactName: c.contact,
          email: c.email,
          country: c.country,
          address: 'Abidjan, Côte d’Ivoire',
          phone: '+225 01 02 03 04 05',
        },
      })
    )
  }

  const productDefs = [
    { name: 'Développement site vitrine (5 pages)', price: 350000, unit: 'forfait' },
    { name: 'Développement application web sur mesure', price: 90000, unit: 'jour' },
    { name: 'Développement application mobile (iOS/Android)', price: 100000, unit: 'jour' },
    { name: 'Design UI/UX (maquettes Figma)', price: 150000, unit: 'forfait' },
    { name: 'Intégration front-end responsive', price: 70000, unit: 'jour' },
    { name: 'Développement API backend', price: 85000, unit: 'jour' },
    { name: 'Référencement SEO (optimisation)', price: 120000, unit: 'forfait' },
    { name: 'Nom de domaine + hébergement web', price: 60000, unit: 'an' },
    { name: 'Maintenance & mises à jour mensuelles', price: 40000, unit: 'mois' },
    { name: 'Formation à la prise en main', price: 45000, unit: 'session' },
  ]
  const products = []
  for (const [i, p] of productDefs.entries()) {
    products.push(
      await prisma.product.create({
        data: {
          companyId: companyA.id,
          reference: `PRD-${String(i + 1).padStart(3, '0')}`,
          name: p.name,
          unitPrice: toMinorUnits(p.price, 'XOF'),
          unit: p.unit,
          defaultTaxId: tvaStandard.id,
        },
      })
    )
  }

  const settingsA = await prisma.documentSettings.findUniqueOrThrow({ where: { companyId: companyA.id } })

  const statuses: Array<'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED'> = [
    'DRAFT',
    'SENT',
    'VIEWED',
    'ACCEPTED',
    'REFUSED',
    'EXPIRED',
    'ACCEPTED',
    'DRAFT',
  ]

  for (let i = 0; i < statuses.length; i++) {
    const client = clients[i % clients.length]
    const chosenProducts = [products[i % products.length], products[(i + 3) % products.length]]
    const items = chosenProducts.map((p, idx) => ({
      productId: p.id,
      reference: p.reference,
      name: p.name,
      quantity: idx === 0 ? 2 : 1,
      unit: p.unit,
      unitPrice: p.unitPrice,
      discountPercent: idx === 0 ? 5 : 0,
      taxId: tvaStandard.id,
      taxRate: 18,
    }))

    const totals = computeDocumentTotals({
      items: items.map((it) => ({ quantity: it.quantity, unitPrice: it.unitPrice, discountPercent: it.discountPercent, taxRate: it.taxRate })),
      discountType: 'percent',
      discountValue: 0,
      shippingFee: 0,
      otherFees: 0,
      deposit: 0,
    })

    await prisma.documentSettings.update({ where: { companyId: companyA.id }, data: { proformaCounter: { increment: 1 } } })
    const number = `${settingsA.proformaPrefix}-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`

    const issueDate = new Date()
    issueDate.setDate(issueDate.getDate() - (statuses.length - i) * 4)
    const expiryDate = new Date(issueDate)
    expiryDate.setDate(expiryDate.getDate() + 30)

    await prisma.proforma.create({
      data: {
        companyId: companyA.id,
        clientId: client.id,
        number,
        object: 'Prestations de développement web',
        issueDate,
        expiryDate,
        currency: 'XOF',
        status: statuses[i],
        template: ['classic', 'modern', 'minimal', 'corporate', 'elegant'][i % 5],
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        shippingFee: totals.shippingFee,
        otherFees: totals.otherFees,
        deposit: totals.deposit,
        total: totals.total,
        balanceDue: totals.balanceDue,
        termsText: 'Cette facture proforma est valable 30 jours à compter de sa date d’émission.',
        footerText: `${companyA.name} — Merci de votre confiance.`,
        items: { create: items.map((it, pos) => ({ ...it, discountAmount: totals.lines[pos].discountAmount, lineTotal: totals.lines[pos].lineTotal, position: pos })) },
        activity: { create: { action: 'Proforma créée (démo)', actor: 'system' } },
      },
    })
  }

  console.log('Seed terminé.')
  console.log(`Connexion démo → email: ${email} / mot de passe: demo1234`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
