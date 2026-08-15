import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { prismaMock } from '../test/prismaMock'

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))

const confirmInvoiceMock = vi.fn()
vi.mock('../lib/paydunya', () => ({ confirmInvoice: (...args: unknown[]) => confirmInvoiceMock(...args) }))

const notifyMerchantsOrderPaidMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../lib/merchantWallet', () => ({ notifyMerchantsOrderPaid: (...args: unknown[]) => notifyMerchantsOrderPaidMock(...args) }))

// Import après les vi.mock (hoistés par vitest, donc l'ordre texte importe peu,
// mais c'est plus lisible ainsi).
import paymentsRouter from './payments'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/payments', paymentsRouter)
  return app
}

const FAKE_ORDER = {
  id: 'order_cuid_123',
  orderNumber: 'CMD-0001',
  paymentStatus: 'pending',
  status: 'pending',
}

describe('POST /api/payments/paydunya/ipn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('IGNORE un payload forgé prétendant un paiement complété si PayDunya ne le confirme pas — la seule source de vérité est confirmInvoice()', async () => {
    // Payload "IPN" fabriqué par un attaquant, avec un statut auto-déclaré
    // "completed" — jamais lu directement par la route.
    confirmInvoiceMock.mockResolvedValue({ status: 'pending', token: 'tok_1', customData: { order_id: FAKE_ORDER.id } })

    const res = await request(buildApp())
      .post('/api/payments/paydunya/ipn')
      .send({ token: 'tok_1', status: 'completed', data: { invoice: { status: 'completed' } } })

    expect(res.status).toBe(200)
    expect(confirmInvoiceMock).toHaveBeenCalledWith('tok_1')
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })

  it('marque la commande payée seulement quand confirmInvoice confirme "completed"', async () => {
    confirmInvoiceMock.mockResolvedValue({ status: 'completed', token: 'tok_2', customData: { order_id: FAKE_ORDER.id } })
    prismaMock.order.findUnique.mockResolvedValue(FAKE_ORDER as never)
    prismaMock.order.update.mockResolvedValue({ ...FAKE_ORDER, paymentStatus: 'paid' } as never)

    const res = await request(buildApp())
      .post('/api/payments/paydunya/ipn')
      .send({ token: 'tok_2' })

    expect(res.status).toBe(200)
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: FAKE_ORDER.id },
      data: {
        paymentStatus: 'paid',
        paydunyaToken: 'tok_2',
        status: 'confirmed', // pending -> confirmed
      },
    })
    expect(notifyMerchantsOrderPaidMock).toHaveBeenCalledWith(FAKE_ORDER.id, FAKE_ORDER.orderNumber)
  })

  it('est idempotent — une commande déjà payée n\'est pas ré-écrite ni re-notifiée', async () => {
    confirmInvoiceMock.mockResolvedValue({ status: 'completed', token: 'tok_3', customData: { order_id: FAKE_ORDER.id } })
    prismaMock.order.findUnique.mockResolvedValue({ ...FAKE_ORDER, paymentStatus: 'paid' } as never)

    const res = await request(buildApp())
      .post('/api/payments/paydunya/ipn')
      .send({ token: 'tok_3' })

    expect(res.status).toBe(200)
    expect(prismaMock.order.update).not.toHaveBeenCalled()
    expect(notifyMerchantsOrderPaidMock).not.toHaveBeenCalled()
  })

  it('répond 200 sans appeler confirmInvoice si aucun token n\'est trouvé dans le payload', async () => {
    const res = await request(buildApp())
      .post('/api/payments/paydunya/ipn')
      .send({ nimportequoi: true })

    expect(res.status).toBe(200)
    expect(confirmInvoiceMock).not.toHaveBeenCalled()
  })

  it('répond 200 sans toucher la commande si order_id est absent de custom_data', async () => {
    confirmInvoiceMock.mockResolvedValue({ status: 'completed', token: 'tok_4', customData: {} })

    const res = await request(buildApp())
      .post('/api/payments/paydunya/ipn')
      .send({ token: 'tok_4' })

    expect(res.status).toBe(200)
    expect(prismaMock.order.findUnique).not.toHaveBeenCalled()
  })

  it('répond 200 si la commande référencée n\'existe pas', async () => {
    confirmInvoiceMock.mockResolvedValue({ status: 'completed', token: 'tok_5', customData: { order_id: 'unknown' } })
    prismaMock.order.findUnique.mockResolvedValue(null)

    const res = await request(buildApp())
      .post('/api/payments/paydunya/ipn')
      .send({ token: 'tok_5' })

    expect(res.status).toBe(200)
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })

  it('répond 200 même si confirmInvoice explose — une panne locale ne doit pas déclencher de réessais PayDunya', async () => {
    confirmInvoiceMock.mockRejectedValue(new Error('PayDunya indisponible'))

    const res = await request(buildApp())
      .post('/api/payments/paydunya/ipn')
      .send({ token: 'tok_6' })

    expect(res.status).toBe(200)
  })

  it('ne fait jamais confiance à un statut "completed" dans le payload brut sans passer par confirmInvoice', async () => {
    // Le payload contient déjà un statut "completed" — si la route lisait ça
    // directement, elle marquerait payé sans jamais appeler confirmInvoice.
    confirmInvoiceMock.mockResolvedValue({ status: 'pending', token: 'tok_7', customData: { order_id: FAKE_ORDER.id } })

    await request(buildApp())
      .post('/api/payments/paydunya/ipn')
      .send({ token: 'tok_7', status: 'completed' })

    expect(confirmInvoiceMock).toHaveBeenCalled()
    expect(prismaMock.order.update).not.toHaveBeenCalled()
  })
})
