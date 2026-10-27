import { describe, it, expect } from 'vitest'
import { toOffer } from './priceSearch'

describe('toOffer', () => {
  it('convertit les euros en F CFA', () => {
    expect(toOffer({ title: 'X', source: 'Shop', price: '10,00 €', extracted_price: 10, link: 'https://a.b' })?.priceFcfa).toBe(6560)
  })
  it('garde les F CFA tels quels', () => {
    expect(toOffer({ title: 'X', price: '25 000 FCFA', extracted_price: 25000 })?.priceFcfa).toBe(25000)
  })
  it('garde le prix et la devise d\'origine', () => {
    const o = toOffer({ price: '$10', extracted_price: 10 })
    expect(o).toMatchObject({ originalAmount: 10, currency: 'USD', rate: 600, priceFcfa: 6000 })
  })
  it('écarte les devises inconnues et les prix invalides', () => {
    expect(toOffer({ price: '10 CHF', extracted_price: 10 })).toBeNull()
    expect(toOffer({ price: '0 €', extracted_price: 0 })).toBeNull()
  })
  it('refuse les liens non http(s)', () => {
    expect(toOffer({ price: '5 €', extracted_price: 5, link: 'javascript:alert(1)' })?.link).toBeNull()
  })
})
