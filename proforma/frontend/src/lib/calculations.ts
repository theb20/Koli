import type { Currency } from '../types'
import { toMinorUnits } from './money'

export interface CalcItemInput {
  quantity: number
  unitPrice: number // unité majeure (ex: 450000)
  discountPercent: number
  taxRate: number
}

export interface CalcLine extends CalcItemInput {
  grossAmount: number
  discountAmount: number
  lineTotal: number
}

export interface DocumentTotalsInput {
  items: CalcItemInput[]
  currency: Currency
  discountType: 'percent' | 'amount'
  discountValue: number
  shippingFee: number
  otherFees: number
  deposit: number
}

export interface DocumentTotals {
  lines: CalcLine[]
  subtotal: number
  discountAmount: number
  taxAmount: number
  shippingFee: number
  otherFees: number
  deposit: number
  total: number
  balanceDue: number
}

/**
 * Miroir exact de backend/src/lib/money.ts#computeDocumentTotals — permet un
 * aperçu temps réel côté client sans aller-retour serveur à chaque frappe.
 * Les montants finaux persistés viennent toujours du calcul serveur.
 */
export function computeDocumentTotals(input: DocumentTotalsInput): DocumentTotals {
  const { currency } = input
  const lines: CalcLine[] = input.items.map((it) => {
    const unitPriceMinor = toMinorUnits(it.unitPrice, currency)
    const grossAmount = Math.round(it.quantity * unitPriceMinor)
    const discountAmount = Math.round((grossAmount * it.discountPercent) / 100)
    const lineTotal = grossAmount - discountAmount
    // unitPrice ci-dessous écrase volontairement la valeur "unité majeure" de
    // l'input par sa version en unité mineure : le reste de l'app (aperçu,
    // formatMoney) consomme des CalcLine exclusivement en unité mineure.
    return { ...it, unitPrice: unitPriceMinor, grossAmount, discountAmount, lineTotal }
  })

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)
  const discountAmount =
    input.discountType === 'percent'
      ? Math.round((subtotal * input.discountValue) / 100)
      : toMinorUnits(input.discountValue, currency)

  const ratio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1
  const taxAmount = lines.reduce((sum, l) => {
    const taxableBase = Math.round(l.lineTotal * ratio)
    return sum + Math.round((taxableBase * l.taxRate) / 100)
  }, 0)

  const shippingFee = toMinorUnits(input.shippingFee, currency)
  const otherFees = toMinorUnits(input.otherFees, currency)
  const deposit = toMinorUnits(input.deposit, currency)

  const netHT = subtotal - discountAmount
  const total = netHT + taxAmount + shippingFee + otherFees
  const balanceDue = total - deposit

  return { lines, subtotal, discountAmount, taxAmount, shippingFee, otherFees, deposit, total, balanceDue }
}
