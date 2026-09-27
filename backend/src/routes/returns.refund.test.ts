import { describe, it, expect, vi } from 'vitest'
vi.mock('../lib/prisma', () => ({ prisma: {} }))
vi.mock('../lib/stockgo', () => ({ uploadToStockgo: vi.fn(), isStockgoUrl: vi.fn() }))
vi.mock('../lib/mailer', () => ({ sendReturnStatusEmail: vi.fn(), sendNewReturnAdminEmail: vi.fn() }))
vi.mock('../lib/imageProcessing', () => ({ toWebp: vi.fn() }))
vi.mock('../lib/virusScan', () => ({ scanFiles: vi.fn() }))
vi.mock('../lib/auditLog', () => ({ logAdminAction: vi.fn() }))
import { refundableAmount } from './returns'

// Commande : 2 articles à 50 000 HT, TVA 18 %, livraison 0, pas d'assistance → total 118 000
const order = { subtotal: 100_000, taxRate: 18, total: 118_000, shippingCost: 0, assistanceTotal: 0 }

describe('Plafond de remboursement', () => {
  it('inclut la TVA payée sur les articles retournés', () => {
    expect(refundableAmount([{ price: 50_000, quantity: 1 }], order)).toBe(59_000)
  })
  it('exclut livraison et assistance technique', () => {
    const o = { subtotal: 100_000, taxRate: 18, total: 118_000 + 3_500 + 11_800, shippingCost: 3_500, assistanceTotal: 10_000 }
    expect(refundableAmount([{ price: 100_000, quantity: 1 }], o)).toBe(118_000)
  })
  it('applique le code promo au prorata : jamais plus que payé', () => {
    const o = { ...order, total: 118_000 - 11_800 }  // 10 % de remise sur le TTC produits
    expect(refundableAmount([{ price: 50_000, quantity: 1 }], o)).toBe(53_100)
  })
  it('sans TVA configurée : prix HT', () => {
    expect(refundableAmount([{ price: 20_000, quantity: 2 }], { subtotal: 40_000, taxRate: 0, total: 40_000, shippingCost: 0, assistanceTotal: 0 })).toBe(40_000)
  })
})
