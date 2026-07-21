import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'
import { confirmInvoice } from '../lib/paydunya'
import { optionalAuth } from '../middleware/auth'
import { validateParams, zCuidIdParam } from '../middleware/validate'

const router = Router()

/**
 * Extrait le token de facture depuis le payload IPN de PayDunya — le format
 * exact (form-urlencoded imbriqué vs JSON) varie selon les intégrations
 * PayDunya documentées, donc plusieurs chemins sont tentés plutôt que de
 * dépendre d'une forme précise. Peu importe ce qui est trouvé ici : la seule
 * source de vérité reste l'appel confirmInvoice() juste après, avec nos
 * propres clés.
 */
function extractToken(body: Record<string, unknown>): string | null {
  const data = body?.['data'] as Record<string, unknown> | undefined
  const candidates = [
    body?.['token'],
    data?.['token'],
    (data?.['invoice'] as Record<string, unknown> | undefined)?.['token'],
  ]
  const found = candidates.find(c => typeof c === 'string' && c.length > 0)
  return (found as string | undefined) ?? null
}

/* ─────────────────────────────────────────────────────────────
   POST /api/payments/paydunya/ipn — appelé par PayDunya (serveur à
   serveur) une fois que le client a confirmé le paiement. Le contenu
   du payload n'est JAMAIS utilisé pour décider quoi que ce soit — on
   n'en extrait que le token, puis on revérifie le statut réel auprès
   de PayDunya avant de toucher à la commande.
───────────────────────────────────────────────────────────── */
router.post('/paydunya/ipn', async (req, res) => {
  try {
    const token = extractToken(req.body as Record<string, unknown>)
    if (!token) {
      logger.error('[paydunya-ipn] token introuvable dans le payload', req.body)
      res.status(200).send('missing token') // 200 : éviter que PayDunya ne renvoie indéfiniment un payload qu'on ne saura jamais lire
      return
    }

    const confirmed = await confirmInvoice(token)
    if (confirmed.status !== 'completed') {
      res.status(200).send('ignored')
      return
    }

    const orderId = confirmed.customData['order_id']
    if (typeof orderId !== 'string') {
      logger.error('[paydunya-ipn] order_id absent de custom_data', confirmed)
      res.status(200).send('no order_id')
      return
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      logger.error('[paydunya-ipn] commande introuvable', orderId)
      res.status(200).send('order not found')
      return
    }

    if (order.paymentStatus !== 'paid') {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'paid',
          paydunyaToken: token,
          status:        order.status === 'pending' ? 'confirmed' : order.status,
        },
      })
      logger.info('[paydunya-ipn] commande marquée payée', order.orderNumber)
    }

    res.status(200).send('ok')
  } catch (err) {
    logger.error('[paydunya-ipn] erreur de traitement', err)
    res.status(200).send('error') // 200 quand même : une erreur transitoire de notre côté ne doit pas déclencher un flot de réessais PayDunya
  }
})

/* ─────────────────────────────────────────────────────────────
   GET /api/payments/paydunya/status/:orderId — utilisé par la page de
   retour koili après redirection PayDunya, pour afficher le statut réel
   sans attendre que l'IPN (asynchrone) ait forcément déjà été traité.
───────────────────────────────────────────────────────────── */
router.get('/paydunya/status/:id', optionalAuth, validateParams(zCuidIdParam), async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where:  { id: req.params['id'] },
      select: { id: true, orderNumber: true, paymentStatus: true, status: true, userId: true },
    })
    if (!order) {
      res.status(404).json({ success: false, message: 'Commande introuvable' })
      return
    }
    // Une commande sans compte (invité) reste consultable par ce endpoint ;
    // une commande liée à un compte n'est renvoyée qu'à son propriétaire.
    if (order.userId && order.userId !== req.user?.userId) {
      res.status(404).json({ success: false, message: 'Commande introuvable' })
      return
    }
    res.json({ success: true, data: order })
  } catch {
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
