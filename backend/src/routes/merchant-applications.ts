import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../middleware/auth'
import {
  listMerchantApplications, getMerchantApplication,
  approveMerchantApplication, rejectMerchantApplication, MerchantgoError,
} from '../lib/merchantgo'
import { isStockgoUrl, fetchStockgoFile } from '../lib/stockgo'
import { logger } from '../lib/logger'

const router = Router()
router.use(requireAdmin)

/*
 * GET /api/admin/merchant-applications/document?url=...
 * Relaie un document KYC privé (pièce d'identité, selfie, justificatif de
 * domicile) depuis stockgo — koli-admin ne peut pas l'afficher directement
 * (visibility: 'private', et le navigateur n'a pas la clé stockgo).
 * Enregistrée AVANT /:id pour ne pas être avalée par ce paramètre générique.
 */
router.get('/document', async (req, res) => {
  try {
    const url = String(req.query.url ?? '')
    if (!isStockgoUrl(url)) {
      res.status(400).json({ success: false, message: 'URL invalide' })
      return
    }

    const upstream = await fetchStockgoFile(url)
    if (!upstream.ok) {
      res.status(upstream.status === 404 ? 404 : 502).json({ success: false, message: 'Document introuvable' })
      return
    }

    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=300')
    const buf = Buffer.from(await upstream.arrayBuffer())
    res.send(buf)
  } catch (err) {
    logger.error('[merchant-applications] échec proxy document', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

function forward(err: unknown, res: import('express').Response) {
  if (err instanceof MerchantgoError) {
    res.status(err.status).json({ success: false, message: err.message })
    return
  }
  res.status(500).json({ success: false, message: 'Erreur serveur' })
}

/* GET /api/admin/merchant-applications?status=&page=&limit= */
router.get('/', async (req, res) => {
  try {
    const q = new URLSearchParams()
    if (req.query.status) q.set('status', String(req.query.status))
    if (req.query.page) q.set('page', String(req.query.page))
    if (req.query.limit) q.set('limit', String(req.query.limit))
    const data = await listMerchantApplications(q.toString() ? `?${q}` : '')
    res.json({ success: true, data })
  } catch (err) {
    forward(err, res)
  }
})

/* GET /api/admin/merchant-applications/:id */
router.get('/:id', async (req, res) => {
  try {
    const data = await getMerchantApplication(req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    forward(err, res)
  }
})

/* POST /api/admin/merchant-applications/:id/approve */
router.post('/:id/approve', async (req, res) => {
  try {
    const { note } = z.object({ note: z.string().max(1000).optional() }).parse(req.body ?? {})
    const data = await approveMerchantApplication(req.params.id, req.user!.userId, note)
    res.json({ success: true, data })
  } catch (err) {
    forward(err, res)
  }
})

/* POST /api/admin/merchant-applications/:id/reject */
router.post('/:id/reject', async (req, res) => {
  try {
    const { reason } = z.object({ reason: z.string().min(1).max(1000) }).parse(req.body)
    const data = await rejectMerchantApplication(req.params.id, req.user!.userId, reason)
    res.json({ success: true, data })
  } catch (err) {
    forward(err, res)
  }
})

export default router
