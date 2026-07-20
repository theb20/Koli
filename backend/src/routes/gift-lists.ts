import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth } from '../middleware/auth'
import { validateParams, zSlugParam, zCuidIdParam } from '../middleware/validate'

const zListItemParams = z.object({
  id:        z.string().min(1).max(40),
  productId: z.coerce.number().int().positive('ID produit invalide'),
})

const router = Router()

function generateSlug(userId: string) {
  return `liste-${userId.slice(-8)}-${Date.now().toString(36)}`
}

/* GET /api/gift-lists — mes listes */
router.get('/', requireAuth, async (req, res) => {
  try {
    const lists = await prisma.giftList.findMany({
      where:   { userId: req.user!.userId },
      include: {
        items: {
          include: { product: { include: { images: { take: 1, orderBy: { position: 'asc' } } } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    res.json({ success: true, data: { lists } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* GET /api/gift-lists/:slug — liste publique */
router.get('/:slug', validateParams(zSlugParam), async (req, res) => {
  try {
    const list = await prisma.giftList.findUnique({
      where: { slug: req.params['slug'] },
      include: {
        user:  { select: { prenom: true, nom: true, avatar: true } },
        items: {
          include: {
            product: {
              include: { images: { take: 1, orderBy: { position: 'asc' } } },
            },
          },
        },
      },
    })
    if (!list || (!list.isPublic)) {
      res.status(404).json({ success: false, message: 'Liste introuvable.' })
      return
    }
    res.json({ success: true, data: { list } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* POST /api/gift-lists — créer une liste */
router.post('/', requireAuth, async (req, res) => {
  try {
    const body = z.object({
      title:    z.string().min(2).max(80),
      occasion: z.string().optional(),
      date:     z.string().optional(),
      isPublic: z.boolean().default(true),
    }).parse(req.body)

    const list = await prisma.giftList.create({
      data: {
        userId:   req.user!.userId,
        title:    body.title,
        slug:     generateSlug(req.user!.userId),
        occasion: body.occasion,
        date:     body.date ? new Date(body.date) : undefined,
        isPublic: body.isPublic,
      },
    })
    res.status(201).json({ success: true, data: { list } })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* POST /api/gift-lists/:id/items — ajouter un produit */
router.post('/:id/items', requireAuth, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const { productId } = z.object({ productId: z.number().int().positive() }).parse(req.body)
    const list = await prisma.giftList.findFirst({
      where: { id: req.params['id'], userId: req.user!.userId },
    })
    if (!list) {
      res.status(404).json({ success: false, message: 'Liste introuvable.' })
      return
    }
    await prisma.giftListItem.upsert({
      where:  { listId_productId: { listId: list.id, productId } },
      update: {},
      create: { listId: list.id, productId },
    })
    res.json({ success: true, message: 'Produit ajouté à la liste.' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* DELETE /api/gift-lists/:id/items/:productId */
router.delete('/:id/items/:productId', requireAuth, validateParams(zListItemParams), async (req, res) => {
  try {
    const productId = Number(req.params['productId'])
    const list = await prisma.giftList.findFirst({
      where: { id: req.params['id'], userId: req.user!.userId },
    })
    if (!list) {
      res.status(404).json({ success: false, message: 'Liste introuvable.' })
      return
    }
    await prisma.giftListItem.deleteMany({
      where: { listId: list.id, productId },
    })
    res.json({ success: true, message: 'Produit retiré.' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* DELETE /api/gift-lists/:id */
router.delete('/:id', requireAuth, validateParams(zCuidIdParam), async (req, res) => {
  try {
    await prisma.giftList.deleteMany({
      where: { id: req.params['id'], userId: req.user!.userId },
    })
    res.json({ success: true, message: 'Liste supprimée.' })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

/* PATCH /api/gift-lists/:id/items/:productId/purchased — accessible sans
   compte (un proche marque un cadeau comme acheté depuis le lien partagé),
   mais uniquement sur une liste explicitement publique. */
router.patch('/:id/items/:productId/purchased', validateParams(zListItemParams), async (req, res) => {
  try {
    const productId = Number(req.params['productId'])
    const { isPurchased } = z.object({ isPurchased: z.boolean() }).parse(req.body)
    const list = await prisma.giftList.findFirst({
      where: { id: req.params['id'], isPublic: true },
    })
    if (!list) {
      res.status(404).json({ success: false, message: 'Liste introuvable.' })
      return
    }
    await prisma.giftListItem.updateMany({
      where: { listId: list.id, productId },
      data:  { isPurchased },
    })
    res.json({ success: true })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
