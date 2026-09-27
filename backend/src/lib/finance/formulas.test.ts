import { describe, it, expect } from 'vitest'
import {
  allocate, effectiveLine, htFromTtc, isRevenueOrder, keptRatio, lineFinancials, marginRate, orderGrossMargin,
  orderLines, orderVolume, percentChange, productPricing, roundXof, shippingResult, splitTtc, ttcFromHt,
} from './formulas'

const VAT = 18

describe('Cas de vérification — mode MARGIN', () => {
  // Prix fournisseur 12 000 HT, prix public 21 240 TTC, TVA 18 %
  const ht = htFromTtc(21_240, VAT)

  it('prix de vente HT, TVA, marge et taux de marge', () => {
    expect(ht).toBe(18_000)
    const p = productPricing({ priceHt: ht, supplierPrice: 12_000, vatRatePct: VAT })
    expect(p).toEqual({ sellingPriceHt: 18_000, sellingPrice: 21_240, vat: 3_240, supplierPrice: 12_000, margin: 6_000, marginRate: 33.3 })
  })

  it('ligne de commande figée', () => {
    const l = lineFinancials({ unitPriceHt: ht, quantity: 1, mode: 'MARGIN', unitSupplierPrice: 12_000, commissionRate: null, vatRatePct: VAT })
    expect(l).toMatchObject({ unitSellingPriceHt: 18_000, unitSellingPriceTtc: 21_240, vatAmount: 3_240, supplierPayout: 12_000, commissionAmount: 0, margin: 6_000, costKnown: true })
    expect(marginRate(l.margin!, 18_000)).toBe(33.3)
  })
})

describe('Cas de vérification — mode COMMISSION', () => {
  // Prix public 11 800 TTC, commission 15 %, TVA 18 %
  it('HT, commission plateforme, reversé au fournisseur', () => {
    const ht = htFromTtc(11_800, VAT)
    expect(ht).toBe(10_000)
    const l = lineFinancials({ unitPriceHt: ht, quantity: 1, mode: 'COMMISSION', unitSupplierPrice: null, commissionRate: 15, vatRatePct: VAT })
    expect(l.commissionAmount).toBe(1_500)
    expect(l.supplierPayout).toBe(8_500)
    expect(l.margin).toBe(1_500) // la plateforme garde exactement sa commission
    expect(l.vatAmount).toBe(1_800)
  })

  it('le prix d\'achat éventuellement saisi est ignoré en mode commission', () => {
    const l = lineFinancials({ unitPriceHt: 10_000, quantity: 1, mode: 'COMMISSION', unitSupplierPrice: 9_999, commissionRate: 15, vatRatePct: VAT })
    expect(l.supplierPayout).toBe(8_500)
  })
})

describe('Quantité > 1', () => {
  it('MARGIN × 3', () => {
    const l = lineFinancials({ unitPriceHt: 18_000, quantity: 3, mode: 'MARGIN', unitSupplierPrice: 12_000, commissionRate: null, vatRatePct: VAT })
    expect(l).toMatchObject({ supplierPayout: 36_000, margin: 18_000, vatAmount: 9_720, unitSellingPriceHt: 18_000, quantity: 3 })
  })

  it('COMMISSION × 2', () => {
    const l = lineFinancials({ unitPriceHt: 10_000, quantity: 2, mode: 'COMMISSION', unitSupplierPrice: null, commissionRate: 15, vatRatePct: VAT })
    expect(l).toMatchObject({ commissionAmount: 3_000, supplierPayout: 17_000, margin: 3_000 })
  })
})

describe('Commande complète — ventilation remise et TVA', () => {
  const order = { taxRate: VAT, taxAmount: 8_280 + 1_800, promoDiscount: 4_600 }
  const { lines, costKnown } = orderLines(order, [
    { unitPriceHt: 18_000, quantity: 2, mode: 'MARGIN', unitSupplierPrice: 12_000, commissionRate: null },
    { unitPriceHt: 10_000, quantity: 1, mode: 'COMMISSION', unitSupplierPrice: null, commissionRate: 15, assistanceHt: 10_000 },
  ])

  it('les quotes-parts redonnent exactement la remise et la TVA de la facture', () => {
    expect(lines.reduce((s, l) => s + l.discountAmount, 0)).toBe(4_600)
    expect(lines.reduce((s, l) => s + l.vatAmount, 0)).toBe(10_080)
    expect(costKnown).toBe(true)
  })

  it('la remise réduit la marge de la plateforme, pas le reversé fournisseur', () => {
    expect(lines[0]).toMatchObject({ discountAmount: 3_600, supplierPayout: 24_000, margin: 36_000 - 3_600 - 24_000 })
    expect(lines[1]).toMatchObject({ discountAmount: 1_000, supplierPayout: 8_500, commissionAmount: 1_500, margin: 500 })
  })

  it('marge brute = marges produits + assistance', () => {
    expect(orderGrossMargin(lines)).toBe(8_400 + 500 + 10_000)
  })
})

describe('Commande remboursée', () => {
  it('remboursement total : la commande sort du CA et des marges', () => {
    expect(isRevenueOrder({ paymentStatus: 'paid', status: 'refunded', deletedAt: null })).toBe(false)
    expect(isRevenueOrder({ paymentStatus: 'refunded', status: 'refunded', deletedAt: null })).toBe(false)
    expect(isRevenueOrder({ paymentStatus: 'paid', status: 'cancelled', deletedAt: null })).toBe(false)
    expect(isRevenueOrder({ paymentStatus: 'pending', status: 'pending', deletedAt: null })).toBe(false)
    expect(isRevenueOrder({ paymentStatus: 'paid', status: 'delivered', deletedAt: null })).toBe(true)
    expect(isRevenueOrder({ paymentStatus: 'paid', status: 'delivered', deletedAt: new Date() })).toBe(false)
  })

  it('remboursement partiel d\'une ligne : retiré de la vente et de la marge au prorata', () => {
    const l = lineFinancials({ unitPriceHt: 18_000, quantity: 3, mode: 'MARGIN', unitSupplierPrice: 12_000, commissionRate: null, vatRatePct: VAT, assistanceHt: 10_000 })
    expect(keptRatio(3, 1)).toBeCloseTo(2 / 3)
    expect(effectiveLine(l, 1)).toEqual({ revenueHt: 36_000 + 10_000, commissionAmount: 0, supplierPayout: 24_000, margin: 12_000, services: 10_000 })
    expect(effectiveLine(l, 3)).toMatchObject({ revenueHt: 10_000, supplierPayout: 0, margin: 0 }) // l'assistance n'est pas remboursable
    expect(keptRatio(3, 5)).toBe(0)
  })

  it('volume de la commande après remboursement partiel (TTC remboursé scindé en HT + TVA)', () => {
    const o = { total: 63_720, subtotal: 54_000, assistanceTotal: 0, promoDiscount: 0, taxRate: VAT, taxAmount: 9_720 }
    expect(orderVolume(o)).toEqual({ ttc: 63_720, ht: 54_000, vat: 9_720 })
    expect(orderVolume(o, 21_240)).toEqual({ ttc: 42_480, ht: 36_000, vat: 6_480 })
  })
})

describe('Commande ancienne sans coût fournisseur', () => {
  it('prix d\'achat inconnu : pas de marge inventée, commande exclue des marges', () => {
    const { lines, costKnown } = orderLines({ taxRate: VAT, taxAmount: 5_040, promoDiscount: 0 }, [
      { unitPriceHt: 18_000, quantity: 1, mode: 'MARGIN', unitSupplierPrice: 12_000, commissionRate: null },
      { unitPriceHt: 10_000, quantity: 1, mode: 'MARGIN', unitSupplierPrice: null, commissionRate: null },
    ])
    expect(lines[1]).toMatchObject({ supplierPayout: null, margin: null, costKnown: false })
    expect(costKnown).toBe(false)
    expect(orderGrossMargin(lines)).toBeNull()
  })

  it('taux de commission inconnu (merchantgo injoignable) : coût inconnu aussi', () => {
    const l = lineFinancials({ unitPriceHt: 10_000, quantity: 1, mode: 'COMMISSION', unitSupplierPrice: null, commissionRate: null, vatRatePct: VAT })
    expect(l).toMatchObject({ supplierPayout: null, margin: null, commissionAmount: 0, costKnown: false })
  })

  it('le CA reste calculable (niveau commande, sans coût)', () => {
    expect(orderVolume({ total: 11_800, subtotal: 10_000, assistanceTotal: 0, promoDiscount: 0, taxRate: VAT, taxAmount: 1_800 }))
      .toEqual({ ttc: 11_800, ht: 10_000, vat: 1_800 })
  })

  it('commande sans ligne : jamais « coût connu »', () => {
    expect(orderLines({ taxRate: VAT, taxAmount: 0, promoDiscount: 0 }, []).costKnown).toBe(false)
  })
})

describe('Arrondis — F CFA entiers, au plus proche', () => {
  it('HT depuis TTC sans erreur de virgule flottante', () => {
    expect(htFromTtc(1_000, VAT)).toBe(847)        // 847,457…
    expect(htFromTtc(1_180, VAT)).toBe(1_000)
    expect(ttcFromHt(847, VAT)).toBe(999)          // 999,46
    expect(ttcFromHt(18_000, VAT)).toBe(21_240)
  })

  it('HT + TVA redonne toujours exactement le TTC', () => {
    for (const ttc of [1, 99, 1_000, 20_239, 123_457]) {
      const { ht, vat } = splitTtc(ttc, VAT)
      expect(ht + vat).toBe(ttc)
      expect(Number.isInteger(ht) && Number.isInteger(vat)).toBe(true)
    }
  })

  it('demi-unité arrondie loin de zéro (comme ROUND() Postgres)', () => {
    expect(roundXof(2.5)).toBe(3)
    expect(roundXof(2.4)).toBe(2)
    expect(roundXof(-2.5)).toBe(-3)
    expect(Object.is(roundXof(-0.2), 0)).toBe(true)
  })

  it('commission arrondie au F CFA', () => {
    const l = lineFinancials({ unitPriceHt: 3_333, quantity: 1, mode: 'COMMISSION', unitSupplierPrice: null, commissionRate: 15, vatRatePct: VAT })
    expect(l.commissionAmount).toBe(500)           // 499,95
    expect(l.supplierPayout).toBe(2_833)
    expect(l.vatAmount).toBe(600)                  // 599,94
  })

  it('ventilation entière dont la somme est exacte (plus fort reste)', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33])
    expect(allocate(10, [1, 2])).toEqual([3, 7])
    expect(allocate(0, [5, 5])).toEqual([0, 0])
    expect(allocate(7, [0, 0])).toEqual([7, 0])
    expect(allocate(5, [])).toEqual([])
  })

  it('taux et variations à une décimale, jamais de division par zéro', () => {
    expect(marginRate(1, 3)).toBe(33.3)
    expect(marginRate(100, 0)).toBeNull()
    expect(percentChange(110, 100)).toBe(10)
    expect(percentChange(90, 100)).toBe(-10)
    expect(percentChange(50, 0)).toBeNull()
  })
})

describe('Livraison', () => {
  it('résultat = frais facturés − coût réel, inconnu si le coût réel manque', () => {
    expect(shippingResult(1_500, 2_000)).toBe(-500)
    expect(shippingResult(3_500, 2_000)).toBe(1_500)
    expect(shippingResult(0, null)).toBeNull()
  })
})

describe('TVA désactivée (aucun taux actif)', () => {
  it('HT = TTC et TVA nulle', () => {
    expect(productPricing({ priceHt: 18_000, supplierPrice: 12_000, vatRatePct: 0 })).toMatchObject({ sellingPrice: 18_000, vat: 0, margin: 6_000 })
  })
})
