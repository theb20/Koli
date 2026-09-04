/**
 * Tous les montants circulent en entiers (unité mineure de la devise) pour
 * éviter toute dérive d'arrondi liée aux flottants. XOF/FCFA n'a pas de
 * sous-unité utilisée en pratique (0 décimale) ; EUR/USD/GBP en ont 2.
 */

export const CURRENCIES = ['XOF', 'EUR', 'USD', 'GBP'] as const
export type Currency = (typeof CURRENCIES)[number]

const DECIMALS: Record<Currency, number> = { XOF: 0, EUR: 2, USD: 2, GBP: 2 }

export function toMinorUnits(amount: number, currency: Currency): number {
  const factor = 10 ** DECIMALS[currency]
  return Math.round(amount * factor)
}

export function fromMinorUnits(minor: number, currency: Currency): number {
  const factor = 10 ** DECIMALS[currency]
  return minor / factor
}

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  XOF: 'fr-FR',
  EUR: 'fr-FR',
  USD: 'en-US',
  GBP: 'en-GB',
}

export function formatMoney(minor: number, currency: Currency): string {
  const amount = fromMinorUnits(minor, currency)
  const decimals = DECIMALS[currency]
  const formatted = new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
  return formatted
}

export interface CalcItemInput {
  quantity: number
  unitPrice: number // centimes
  discountPercent: number // 0-100
  taxRate: number // 0-100
}

export interface CalcItemResult extends CalcItemInput {
  grossAmount: number // quantity * unitPrice, avant remise ligne
  discountAmount: number
  lineTotal: number // après remise ligne, avant taxe
}

export function computeLine(item: CalcItemInput): CalcItemResult {
  const grossAmount = Math.round(item.quantity * item.unitPrice)
  const discountAmount = Math.round((grossAmount * item.discountPercent) / 100)
  const lineTotal = grossAmount - discountAmount
  return { ...item, grossAmount, discountAmount, lineTotal }
}

export interface CalcDocumentInput {
  items: CalcItemInput[]
  discountType: 'percent' | 'amount'
  discountValue: number
  shippingFee: number // centimes
  otherFees: number // centimes
  deposit: number // centimes
}

export interface CalcDocumentResult {
  lines: CalcItemResult[]
  subtotal: number // somme des lineTotal (après remise ligne, avant remise globale et taxes)
  discountAmount: number // remise globale, en centimes
  taxAmount: number
  shippingFee: number
  otherFees: number
  deposit: number
  total: number
  balanceDue: number
}

/**
 * Calcule les totaux d'un document (proforma/facture).
 * La remise globale est répartie proportionnellement sur chaque ligne avant
 * calcul de la taxe, afin que (netHT + taxes + frais - acompte) == total,
 * sans dérive d'arrondi cumulée.
 */
export function computeDocumentTotals(input: CalcDocumentInput): CalcDocumentResult {
  const lines = input.items.map(computeLine)
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0)

  const discountAmount =
    input.discountType === 'percent'
      ? Math.round((subtotal * input.discountValue) / 100)
      : Math.round(input.discountValue)

  const ratio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1

  const taxAmount = lines.reduce((sum, l) => {
    const taxableBase = Math.round(l.lineTotal * ratio)
    return sum + Math.round((taxableBase * l.taxRate) / 100)
  }, 0)

  const netHT = subtotal - discountAmount
  const total = netHT + taxAmount + input.shippingFee + input.otherFees
  const balanceDue = total - input.deposit

  return {
    lines,
    subtotal,
    discountAmount,
    taxAmount,
    shippingFee: input.shippingFee,
    otherFees: input.otherFees,
    deposit: input.deposit,
    total,
    balanceDue,
  }
}
