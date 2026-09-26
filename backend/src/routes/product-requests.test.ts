import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { prismaMock } from '../test/prismaMock'

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))

const createPaymentMock  = vi.fn()
const refreshPaymentMock = vi.fn()
vi.mock('../lib/merchantgo', () => ({
  isMerchantgoConfigured:  () => true,
  createWinipayerPayment:  (...a: unknown[]) => createPaymentMock(...a),
  refreshWinipayerPayment: (...a: unknown[]) => refreshPaymentMock(...a),
}))

const applyOrderStatusChangeMock = vi.fn().mockResolvedValue(null)
vi.mock('./orders', () => ({ applyOrderStatusChange: (...a: unknown[]) => applyOrderStatusChangeMock(...a) }))

vi.mock('../lib/mailer', () => ({
  sendNewProductRequestAdminEmail: vi.fn().mockResolvedValue(undefined),
  sendProductRequestReplyEmail:    vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../lib/sms/zavu', () => ({ sendSms: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../lib/stockgo', () => ({ uploadToStockgo: vi.fn() }))
vi.mock('../lib/virusScan', () => ({ scanFiles: vi.fn() }))
vi.mock('../lib/imageProcessing', () => ({ toWebp: vi.fn() }))

// Admin simulé pour les routes [ADMIN] — l'authentification réelle est testée ailleurs.
vi.mock('../middleware/auth', () => ({
  requireAdmin: (req: { user?: unknown }, _res: unknown, next: () => void) => { req.user = { userId: 'admin1', role: 'admin' }; next() },
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

import productRequestsRouter from './product-requests'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/product-requests', productRequestsRouter)
  return app
}

const TOKEN = 'a'.repeat(48)
const DAY   = 24 * 3600 * 1000

function quote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ckreq000000000000000001', userId: 'u1',
    clientPrenom: 'Awa', clientNom: 'Kone', clientEmail: 'awa@example.com', clientTelephone: null,
    productName: 'Caméra IP', description: 'Caméra extérieure', images: null,
    quantity: 2, budget: null, deliveryAddress: 'Abidjan', desiredDate: null,
    status: 'quoted', adminReply: 'Trouvée', quotedPrice: 25_000, repliedAt: new Date(),
    quoteToken: TOKEN, quoteExpiresAt: new Date(Date.now() + 3 * DAY),
    declineReason: null, decidedAt: null, orderId: null,
    createdAt: new Date(), updatedAt: new Date(),
    order: null,
    ...overrides,
  }
}

describe('Devis de sourcing — acceptation / paiement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.taxRate.findFirst.mockResolvedValue(null as never)
    prismaMock.user.findMany.mockResolvedValue([] as never)
  })

  it('refuse un token au mauvais format sans toucher la base', async () => {
    const res = await request(buildApp()).post('/api/product-requests/quote/not-a-token/accept')
    expect(res.status).toBe(400)
    expect(prismaMock.productRequest.findUnique).not.toHaveBeenCalled()
  })

  it('refuse un devis expiré — aucune commande ni paiement créé', async () => {
    prismaMock.productRequest.findUnique.mockResolvedValue(quote({ quoteExpiresAt: new Date(Date.now() - DAY) }) as never)

    const res = await request(buildApp()).post(`/api/product-requests/quote/${TOKEN}/accept`)

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/expiré/)
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
    expect(createPaymentMock).not.toHaveBeenCalled()
  })

  it('première acceptation : commande EN ATTENTE (jamais payée) + lien WiniPayer du montant TTC', async () => {
    prismaMock.productRequest.findUnique.mockResolvedValue(quote() as never)
    const txOrderCreate = vi.fn().mockResolvedValue({ id: 'ord1', orderNumber: 'KLI-1', total: 50_000 })
    const txRequestUpdate = vi.fn().mockResolvedValue({})
    prismaMock.$transaction.mockImplementation((async (fn: (tx: unknown) => unknown) => fn({
      product: { create: vi.fn().mockResolvedValue({ id: 999 }) },
      order: { create: txOrderCreate },
      productRequest: { update: txRequestUpdate },
    })) as never)
    createPaymentMock.mockResolvedValue({ data: { checkoutUrl: 'https://pay.example/x', providerRef: 'ref1' } })

    const res = await request(buildApp()).post(`/api/product-requests/quote/${TOKEN}/accept`)

    expect(res.status).toBe(200)
    expect(res.body.data.paymentUrl).toBe('https://pay.example/x')
    const orderData = txOrderCreate.mock.calls[0]![0].data
    expect(orderData).toMatchObject({ paymentStatus: 'pending', status: 'pending', paymentMethod: 'online', subtotal: 50_000, total: 50_000 })
    expect(txRequestUpdate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'accepted', orderId: 'ord1' }) }))
    expect(createPaymentMock).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'ord1', amount: 50_000 }))
    expect(prismaMock.order.update).toHaveBeenCalledWith({ where: { id: 'ord1' }, data: { winipayerRef: 'ref1' } })
  })

  it('devis déjà payé → 409, aucun nouveau lien de paiement', async () => {
    prismaMock.productRequest.findUnique.mockResolvedValue(quote({
      status: 'paid', orderId: 'ord1',
      order: { id: 'ord1', orderNumber: 'KLI-1', status: 'pending', paymentStatus: 'paid', total: 50_000, winipayerRef: 'ref1' },
    }) as never)

    const res = await request(buildApp()).post(`/api/product-requests/quote/${TOKEN}/accept`)

    expect(res.status).toBe(409)
    expect(createPaymentMock).not.toHaveBeenCalled()
  })

  it('relance de paiement : revérifie l\'ancienne tentative AVANT d\'en créer une — pas de double paiement si elle avait abouti', async () => {
    const pendingOrder = { id: 'ord1', orderNumber: 'KLI-1', status: 'pending', paymentStatus: 'pending', total: 50_000, winipayerRef: 'ref1' }
    prismaMock.productRequest.findUnique
      .mockResolvedValueOnce(quote({ status: 'accepted', orderId: 'ord1', order: pendingOrder }) as never)
      // après revérification : le paiement avait en fait réussi
      .mockResolvedValueOnce(quote({ status: 'paid', orderId: 'ord1', order: { ...pendingOrder, paymentStatus: 'paid' } }) as never)
    refreshPaymentMock.mockResolvedValue({ data: { state: 'success' } })

    const res = await request(buildApp()).post(`/api/product-requests/quote/${TOKEN}/accept`)

    expect(refreshPaymentMock).toHaveBeenCalledWith('ref1')
    expect(res.status).toBe(409)
    expect(createPaymentMock).not.toHaveBeenCalled()
  })

  it('relance après paiement toujours en attente : nouveau lien pour la MÊME commande', async () => {
    const pendingOrder = { id: 'ord1', orderNumber: 'KLI-1', status: 'pending', paymentStatus: 'pending', total: 50_000, winipayerRef: 'ref1' }
    const accepted = quote({ status: 'accepted', orderId: 'ord1', order: pendingOrder, quoteExpiresAt: new Date(Date.now() - DAY) })
    prismaMock.productRequest.findUnique.mockResolvedValue(accepted as never)
    refreshPaymentMock.mockResolvedValue({ data: { state: 'pending' } })
    createPaymentMock.mockResolvedValue({ data: { checkoutUrl: 'https://pay.example/y', providerRef: 'ref2' } })

    const res = await request(buildApp()).post(`/api/product-requests/quote/${TOKEN}/accept`)

    expect(res.status).toBe(200)
    expect(prismaMock.$transaction).not.toHaveBeenCalled() // pas de 2e commande
    expect(createPaymentMock).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'ord1', amount: 50_000 }))
  })
})

describe('Devis de sourcing — refus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.taxRate.findFirst.mockResolvedValue(null as never)
    prismaMock.user.findMany.mockResolvedValue([] as never)
  })

  it('refus d\'un devis accepté mais impayé → la commande en attente est annulée', async () => {
    const pendingOrder = { id: 'ord1', orderNumber: 'KLI-1', status: 'pending', paymentStatus: 'pending', total: 50_000, winipayerRef: 'ref1' }
    prismaMock.productRequest.findUnique.mockResolvedValue(quote({ status: 'accepted', orderId: 'ord1', order: pendingOrder }) as never)

    const res = await request(buildApp())
      .post(`/api/product-requests/quote/${TOKEN}/decline`)
      .send({ reason: 'Trop cher' })

    expect(res.status).toBe(200)
    expect(applyOrderStatusChangeMock).toHaveBeenCalledWith('ord1', 'cancelled')
    expect(prismaMock.productRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'declined', declineReason: 'Trop cher' }),
    }))
  })

  it('impossible de refuser un devis déjà payé', async () => {
    prismaMock.productRequest.findUnique.mockResolvedValue(quote({
      status: 'paid', order: { id: 'ord1', orderNumber: 'KLI-1', status: 'pending', paymentStatus: 'paid', total: 50_000, winipayerRef: 'ref1' },
    }) as never)

    const res = await request(buildApp()).post(`/api/product-requests/quote/${TOKEN}/decline`).send({})

    expect(res.status).toBe(400)
    expect(prismaMock.productRequest.update).not.toHaveBeenCalled()
  })
})

describe('Admin — passage en "fulfilled"', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refusé tant que le client n\'a pas payé — plus aucune commande "payée" fabriquée', async () => {
    prismaMock.productRequest.findUnique.mockResolvedValue(quote({ status: 'accepted', orderId: 'ord1' }) as never)
    prismaMock.order.findUnique.mockResolvedValue({ id: 'ord1', paymentStatus: 'pending', status: 'pending' } as never)

    const res = await request(buildApp())
      .patch('/api/product-requests/ckreq000000000000000001/status')
      .send({ status: 'fulfilled' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/pas encore payé/)
    expect(prismaMock.order.create).not.toHaveBeenCalled()
    expect(prismaMock.productRequest.update).not.toHaveBeenCalled()
  })
})
