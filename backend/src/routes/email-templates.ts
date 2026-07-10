/* ─────────────────────────────────────────────────────────────
   Prévisualisation et personnalisation des templates email —
   feature admin permanente. Intercepte resend.emails.send() pour
   capturer le HTML généré par chaque template réel (sans jamais
   envoyer d'email) et le renvoie pour prévisualisation.

   Le design (CSS partagé par tous les emails) est éditable et
   enregistré en base (SiteSettings.emailDesignCss) — pas sur le
   disque, qui n'est pas persistant en production (Railway). Voir
   src/lib/email/layout.ts pour l'utilisation de cette valeur.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { resend } from '../lib/email/client'
import { getEmailDesignCss } from '../lib/email/settings'
import {
  sendWelcomeEmail, sendMagicLinkEmail, sendPasswordResetEmail, sendPasswordChangedEmail,
  sendOrderConfirmationEmail, sendOrderStatusEmail, sendContactReply, sendBroadcastEmail,
  sendNewOrderAdminEmail, sendNewProductRequestAdminEmail, sendProductRequestReplyEmail,
} from '../lib/email'
import { sendFlashDealEmail } from '../lib/email/templates/flash-deal'

const router = Router()
router.use(requireAdmin)

const DUMMY_ORDER_ITEMS = [
  { name: 'Casque Bluetooth Pro X', qty: 1, price: 25000 },
  { name: 'Coque de protection', qty: 2, price: 3000 },
]

const TEMPLATES: Record<string, () => Promise<void>> = {
  welcome: () => sendWelcomeEmail('preview@example.com', 'Awa'),
  'magic-link': () => sendMagicLinkEmail('preview@example.com', 'Awa', 'https://skignas.com/auth/magic?token=preview'),
  'password-reset': () => sendPasswordResetEmail('preview@example.com', 'Awa', 'https://skignas.com/reinitialiser-mot-de-passe?token=preview'),
  'password-changed': () => sendPasswordChangedEmail('preview@example.com', 'Awa', '102.23.45.67'),
  'order-confirmation': () => sendOrderConfirmationEmail('preview@example.com', {
    orderNumber: 'SKG-00042', prenom: 'Awa', items: DUMMY_ORDER_ITEMS,
    total: 34500, shippingCost: 1500, subtotal: 33000,
    paymentMethod: 'orange', deliveryMethod: 'standard',
  }),
  'order-status-confirmed': () => sendOrderStatusEmail('preview@example.com', 'Awa', 'SKG-00042', 'confirmed'),
  'order-status-shipped':   () => sendOrderStatusEmail('preview@example.com', 'Awa', 'SKG-00042', 'shipped'),
  'order-status-delivered': () => sendOrderStatusEmail('preview@example.com', 'Awa', 'SKG-00042', 'delivered'),
  'order-status-cancelled': () => sendOrderStatusEmail('preview@example.com', 'Awa', 'SKG-00042', 'cancelled'),
  'contact-reply': () => sendContactReply('preview@example.com', 'Awa', 'Question sur ma commande'),
  broadcast: () => sendBroadcastEmail('preview@example.com', 'Awa', 'Nouvelle collection disponible', 'Découvrez nos derniers arrivages tech à prix imbattables cette semaine seulement.'),
  'new-order-admin': () => sendNewOrderAdminEmail('preview@example.com', {
    orderNumber: 'SKG-00042', clientNom: 'Awa Koné', clientTelephone: '+225 07 00 00 00 00',
    clientEmail: 'awa@example.com', items: DUMMY_ORDER_ITEMS, total: 34500,
    paymentMethod: 'orange', deliveryMethod: 'standard', orderId: 'clxxxxxxxxxxxxxx',
  }),
  'new-product-request-admin': () => sendNewProductRequestAdminEmail('preview@example.com', {
    id: 'clxxxxxxxxxxxxxx', productName: 'Console rétro portable', description: 'Je cherche une console de jeu rétro portable, neuve ou reconditionnée.',
    clientNom: 'Awa Koné', clientEmail: 'awa@example.com', clientTelephone: '+225 07 00 00 00 00',
    quantity: 1, budget: 40000, deliveryAddress: 'Cocody, Abidjan',
  }),
  'product-request-reply': () => sendProductRequestReplyEmail('preview@example.com', 'Awa', 'Console rétro portable', 'Bonjour, nous avons trouvé ce modèle disponible sous 5 jours.', 38000),
  'flash-deal': () => sendFlashDealEmail('preview@example.com', 'Awa', [
    { id: 1, name: 'Casque Bluetooth Pro X', image: 'https://m.media-amazon.com/images/I/61dB1oxSpUL._AC_SL1500_.jpg', price: 25000, salePrice: 18000 },
    { id: 2, name: 'Enceinte portable', image: 'https://m.media-amazon.com/images/I/71rP1hs8caL._AC_SL1500_.jpg', price: 15000, salePrice: 11000 },
  ], new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)),
}

/* ── GET /api/email-templates — liste des templates disponibles ── */
router.get('/', (_req, res) => {
  res.json({ success: true, data: { templates: Object.keys(TEMPLATES) } })
})

/* ── GET /api/email-templates/:name — rendu HTML réel (aucun envoi) ── */
router.get('/:name', async (req, res) => {
  const name = req.params['name'] as string
  const fn = TEMPLATES[name]
  if (!fn) { res.status(404).json({ success: false, message: 'Template inconnu: ' + name }); return }

  const original = resend.emails.send.bind(resend.emails)
  let captured = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(resend.emails as any).send = async (payload: { html?: string }) => {
    captured = payload.html ?? ''
    return { data: { id: 'preview' }, error: null }
  }

  try {
    await fn()
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(captured || '<p>Aucun HTML capturé.</p>')
  } catch (err) {
    console.error('[EMAIL-TEMPLATES]', err)
    res.status(500).send('<pre>' + String(err) + '</pre>')
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(resend.emails as any).send = original
  }
})

/* ─────────────────────────────────────────────────────────────
   Design commun (CSS partagé par tous les emails) — persisté en
   base (SiteSettings.emailDesignCss), pas sur disque : le disque
   d'un déploiement Railway n'est pas garanti persistant.
───────────────────────────────────────────────────────────── */
router.get('/design/css', async (_req, res) => {
  const css = await getEmailDesignCss()
  res.json({ success: true, data: { css } })
})

const saveCssSchema = z.object({ css: z.string().min(1).max(20_000) })

router.post('/design/css', validate(saveCssSchema), async (req, res) => {
  const { css } = req.body as z.infer<typeof saveCssSchema>
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { emailDesignCss: css },
    update: { emailDesignCss: css },
  })
  res.json({ success: true, message: 'Design enregistré — appliqué à tous les emails à partir de maintenant.' })
})

router.delete('/design/css', async (_req, res) => {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: {},
    update: { emailDesignCss: null },
  })
  res.json({ success: true, message: 'Design par défaut restauré.' })
})

export default router
