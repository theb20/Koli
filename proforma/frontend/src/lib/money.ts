import type { Currency } from '../types'

const DECIMALS: Record<Currency, number> = { XOF: 0, EUR: 2, USD: 2, GBP: 2 }
const LOCALE: Record<Currency, string> = { XOF: 'fr-FR', EUR: 'fr-FR', USD: 'en-US', GBP: 'en-GB' }

export function toMinorUnits(amount: number, currency: Currency): number {
  const factor = 10 ** DECIMALS[currency]
  return Math.round(amount * factor)
}

export function fromMinorUnits(minor: number, currency: Currency): number {
  return minor / 10 ** DECIMALS[currency]
}

export function formatMoney(minor: number, currency: Currency): string {
  const amount = fromMinorUnits(minor, currency)
  const decimals = DECIMALS[currency]
  return new Intl.NumberFormat(LOCALE[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)
}

export const CURRENCIES: Currency[] = ['XOF', 'EUR', 'USD', 'GBP']
