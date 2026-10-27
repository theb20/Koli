/* ─────────────────────────────────────────────────────────────
   Recherche produit [ADMIN] — POST /api/admin/product-search { query }.
   À partir d'un nom : prix publics en ligne (SerpApi) + brouillon de fiche
   (Groq). Les deux sont indépendants : l'échec de l'un n'empêche pas l'autre.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { logAdminAction } from '../lib/auditLog'
import { logger } from '../lib/logger'
import { isPriceSearchConfigured, searchPricesCached } from '../lib/priceSearch'
import { isGroqConfigured } from '../lib/groq'
import { draftProduct } from '../lib/productResearch'

const router = Router()
router.use(requireAdmin)

const bodySchema = z.object({ query: z.string().trim().min(3).max(150), refresh: z.boolean().optional() })

router.post('/', validate(bodySchema), async (req, res) => {
  const { query, refresh } = req.body as z.infer<typeof bodySchema>
  if (!isPriceSearchConfigured() && !isGroqConfigured()) {
    res.status(503).json({ success: false, message: 'Recherche non configurée (SERPAPI_API_KEY et GROQ_API_KEY manquantes)' }); return
  }
  try {
    const categories = await prisma.category.findMany({ where: { isActive: true }, orderBy: { position: 'asc' }, select: { slug: true, name: true } })
    const prices = isPriceSearchConfigured()
      ? await searchPricesCached(query, refresh).then(r => ({ ok: true as const, ...r }), e => { logger.error('[productSearch] prix', e); return { ok: false as const, offers: [], cached: false } })
      : { ok: false as const, offers: [], cached: false }
    const draft = isGroqConfigured()
      ? await draftProduct(query, prices.offers.map(o => o.title), categories).catch(e => { logger.error('[productSearch] fiche', e); return null })
      : null
    logAdminAction(req, { action: 'productSearch.run', targetType: 'ProductSearch', targetId: query.slice(0, 60) })
    const images = [...new Set(prices.offers.map(o => o.thumbnail).filter((u): u is string => !!u))].slice(0, 8)
    res.json({ success: true, data: { query, offers: prices.offers, images, draft, cached: prices.cached, pricesAvailable: prices.ok, draftAvailable: draft !== null } })
  } catch (err) {
    logger.error('[productSearch]', err)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

export default router
