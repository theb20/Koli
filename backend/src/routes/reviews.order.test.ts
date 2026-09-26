import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { prismaMock } from '../test/prismaMock'

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))
const sendReviewRequestEmailMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../lib/mailer', () => ({ sendReviewRequestEmail: (...a: unknown[]) => sendReviewRequestEmailMock(...a) }))
const sendSmsMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../lib/sms/zavu', () => ({ sendSms: (...a: unknown[]) => sendSmsMock(...a) }))
vi.mock('../lib/stockgo', () => ({ uploadToStockgo: vi.fn() }))
vi.mock('../lib/virusScan', () => ({ scanFiles: vi.fn() }))
vi.mock('../lib/imageProcessing', () => ({ toWebp: vi.fn() }))
vi.mock('../lib/auditLog', () => ({ logAdminAction: vi.fn() }))

import reviewsRouter from './reviews'
import { requestOrderReview } from '../lib/orderReview'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/reviews', reviewsRouter)
  return app
}

const TOKEN = 'b'.repeat(48)
const ORDER = {
  id: 'ord1', orderNumber: 'KLI-1', userId: null, clientPrenom: 'Awa', clientNom: 'Koné',
  deliveredAt: new Date(), status: 'delivered',
  items: [
    { productId: 10, name: 'Caméra', image: 'x.webp', product: { isActive: true } },
    { productId: 99, name: 'Sourcing', image: '', product: { isActive: false } },
  ],
}

describe('Demande d\'avis à la livraison', () => {
  beforeEach(() => vi.clearAllMocks())

  it('n\'envoie rien si la demande a déjà été faite (une seule fois par commande)', async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 } as never)
    await requestOrderReview('ord1')
    expect(sendReviewRequestEmailMock).not.toHaveBeenCalled()
    expect(sendSmsMock).not.toHaveBeenCalled()
  })

  it('première livraison : e-mail + SMS avec le lien /avis/:token', async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 } as never)
    prismaMock.order.findUnique.mockResolvedValue({
      orderNumber: 'KLI-1', clientPrenom: 'Awa', clientEmail: 'awa@example.com', clientTelephone: '0700000000', userId: null,
    } as never)

    await requestOrderReview('ord1')

    const claim = prismaMock.order.updateMany.mock.calls[0]![0]
    expect(claim.where).toMatchObject({ id: 'ord1', reviewRequestedAt: null, status: 'delivered' })
    expect(sendReviewRequestEmailMock).toHaveBeenCalledWith('awa@example.com', 'Awa', 'KLI-1', expect.stringMatching(/\/avis\/[a-f0-9]{48}$/))
    expect(sendSmsMock).toHaveBeenCalled()
  })
})

describe('Avis via le lien de commande', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ne propose que les produits encore en catalogue', async () => {
    prismaMock.order.findUnique.mockResolvedValue(ORDER as never)
    prismaMock.review.findMany.mockResolvedValue([] as never)
    prismaMock.siteReview.findUnique.mockResolvedValue(null as never)

    const res = await request(buildApp()).get(`/api/reviews/order/${TOKEN}`)

    expect(res.status).toBe(200)
    expect(res.body.data.items.map((i: { productId: number }) => i.productId)).toEqual([10])
  })

  it('refuse un produit qui ne fait pas partie de la commande', async () => {
    prismaMock.order.findUnique.mockResolvedValue(ORDER as never)

    const res = await request(buildApp()).post(`/api/reviews/order/${TOKEN}`)
      .send({ products: [{ productId: 55, rating: 5, body: 'Très bon produit, merci' }] })

    expect(res.status).toBe(400)
    expect(prismaMock.review.upsert).not.toHaveBeenCalled()
  })

  it('invité : avis produit (achat vérifié) + avis commande publiés sous « Awa K. »', async () => {
    prismaMock.order.findUnique.mockResolvedValue(ORDER as never)
    prismaMock.review.aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { rating: 1 } } as never)

    const res = await request(buildApp()).post(`/api/reviews/order/${TOKEN}`).send({
      products: [{ productId: 10, rating: 5, body: 'Très bonne caméra, image nette' }],
      order:    { rating: 4, body: 'Livraison rapide, livreur aimable' },
    })

    expect(res.status).toBe(200)
    const productUpsert = prismaMock.review.upsert.mock.calls[0]![0]
    expect(productUpsert.where).toEqual({ orderId_productId: { orderId: 'ord1', productId: 10 } })
    expect(productUpsert.create).toMatchObject({ userId: null, authorName: 'Awa K.', verified: true, rating: 5 })
    expect(prismaMock.product.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { rating: 5, reviews: 1 } })
    expect(prismaMock.siteReview.upsert.mock.calls[0]![0].create).toMatchObject({ orderId: 'ord1', authorName: 'Awa K.', rating: 4 })
  })

  it('lien inconnu → 404', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null as never)
    const res = await request(buildApp()).get(`/api/reviews/order/${TOKEN}`)
    expect(res.status).toBe(404)
  })
})
