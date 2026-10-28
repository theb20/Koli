/* ─────────────────────────────────────────────────────────────
   Demandes de suppression de produit marchand — un marchand ne peut
   jamais supprimer directement un de ses produits (voir POST
   /api/seller/products/:id/deletion-request dans seller.ts), il ne peut
   que le demander ; cette route traite la décision de l'admin Skignas.

   requested → approved (deleteProductAtomic réellement appelé — voir
                          lib/productDeletion.ts : suppression définitive
                          si jamais commandé, sinon désactivation)
       ↓
   rejected
   (cancelled posé par le marchand lui-même, voir seller.ts)
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate, validateParams, zCuidIdParam } from '../middleware/validate'
import { deleteProductAtomic } from '../lib/productDeletion'
import { logAdminAction } from '../lib/auditLog'
import { logger } from '../lib/logger'

const router = Router()

const REQUEST_INCLUDE = {
  product: {
    select: {
      id: true, name: true, price: true, stock: true, isActive: true,
      images: { take: 1, orderBy: { position: 'asc' as const } },
    },
  },
  store:       { select: { id: true, name: true } },
  requestedBy: { select: { id: true, prenom: true, nom: true, email: true } },
}

/* ─────────────────────────────────────────────────────────────
   GET /api/admin/product-deletion-requests
   ?status=requested|approved|rejected|cancelled
───────────────────────────────────────────────────────────── */
router.get('/', requireAdmin, async (req, res) => {
  const status = req.query['status']
  const where = typeof status === 'string' && status ? { status } : {}
  const requests = await prisma.productDeletionRequest.findMany({
    where,
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: 'desc' },
    // Pas de pagination consommée côté frontend (retourne un tableau brut) —
    // un plafond dur évite qu'une table qui grossit ne finisse par renvoyer
    // un nombre de lignes non borné en une seule réponse (même pattern que
    // GET /api/returns/admin/all).
    take: 500,
  })
  res.json({ success: true, data: requests })
})

const statusSchema = z.object({
  status:          z.enum(['approved', 'rejected']),
  rejectionReason: z.string().min(1).max(500).optional(),
  adminNotes:      z.string().max(1000).optional(),
})

/* ─────────────────────────────────────────────────────────────
   PUT /api/admin/product-deletion-requests/:id/status
───────────────────────────────────────────────────────────── */
router.put('/:id/status', requireAdmin, validateParams(zCuidIdParam), validate(statusSchema), async (req, res) => {
  const id = req.params['id'] ?? ''
  const body = req.body as z.infer<typeof statusSchema>

  const request = await prisma.productDeletionRequest.findUnique({ where: { id }, include: REQUEST_INCLUDE })
  if (!request) { res.status(404).json({ success: false, message: 'Demande introuvable' }); return }
  if (request.status !== 'requested') {
    res.status(409).json({ success: false, message: `Cette demande a déjà été traitée (statut : ${request.status})` })
    return
  }
  if (body.status === 'rejected' && !body.rejectionReason) {
    res.status(400).json({ success: false, message: 'Un motif de refus est requis' })
    return
  }

  // Jamais deviné : c'est deleteProductAtomic qui décide réellement entre
  // suppression définitive et simple désactivation (produit déjà commandé),
  // l'admin approuve la DEMANDE, pas directement l'issue technique.
  const deletionResult = body.status === 'approved' ? await deleteProductAtomic(request.productId) : null

  const updated = await prisma.productDeletionRequest.update({
    where: { id },
    data: {
      status:          body.status,
      resolvedAt:      new Date(),
      resolvedById:    req.user!.userId,
      adminNotes:      body.adminNotes,
      rejectionReason: body.status === 'rejected' ? body.rejectionReason : undefined,
    },
  })

  logAdminAction(req, {
    action:     body.status === 'approved' ? 'product.deletion_request.approve' : 'product.deletion_request.reject',
    targetType: 'ProductDeletionRequest',
    targetId:   id,
    ...(deletionResult ? { metadata: { deletionResult } } : {}),
  })

  prisma.notification.create({
    data: {
      userId: request.requestedById,
      type:   'product_deletion',
      title:  body.status === 'approved' ? 'Demande de suppression approuvée' : 'Demande de suppression refusée',
      body:   body.status === 'approved'
        ? (deletionResult === 'hard'
            ? `« ${request.product.name} » a été supprimé définitivement.`
            : `« ${request.product.name} » a déjà été commandé : il a été désactivé (historique conservé), jamais vraiment supprimable.`)
        : `Demande de suppression de « ${request.product.name} » refusée — motif : ${body.rejectionReason}`,
      link: '/produits',
    },
  }).catch(err => logger.error('[admin-product-deletion-requests] échec notification marchand', err))

  res.json({ success: true, data: updated, deletionResult })
})

export default router
