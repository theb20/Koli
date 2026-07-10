/* ─────────────────────────────────────────────────────────────
   Prévisualisation et personnalisation des templates email —
   feature admin permanente.

   Le HTML de prévisualisation est capturé via emailCaptureContext
   (AsyncLocalStorage, voir lib/email/client.ts) — un envoi réel
   concurrent ne peut jamais être intercepté par erreur.

   Le design (header, carte, footer) est piloté par des tokens
   (couleurs, rayon, logo, textes) validés par liste blanche et
   persistés en base (SiteSettings) — jamais sur disque, qui n'est
   pas garanti persistant en production (Railway). Voir lib/email/tokens.ts.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { emailCaptureContext } from '../lib/email/client'
import {
  getRawEmailTokens, sanitizeTokens, tokenPreviewContext,
  HEX_COLOR_RE, HTTPS_URL_RE, type EmailDesignTokens,
} from '../lib/email/tokens'
import {
  sendWelcomeEmail, sendMagicLinkEmail, sendPasswordResetEmail, sendPasswordChangedEmail,
  sendOrderConfirmationEmail, sendOrderStatusEmail, sendContactReply, sendBroadcastEmail,
  sendNewOrderAdminEmail, sendNewProductRequestAdminEmail, sendProductRequestReplyEmail,
  sendReturnStatusEmail, sendNewReturnAdminEmail,
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
  'return-requested': () => sendReturnStatusEmail('preview@example.com', 'Awa', 'SKG-00042', 'requested'),
  'return-approved':  () => sendReturnStatusEmail('preview@example.com', 'Awa', 'SKG-00042', 'approved'),
  'return-rejected':  () => sendReturnStatusEmail('preview@example.com', 'Awa', 'SKG-00042', 'rejected', 'Article reçu hors délai de 14 jours'),
  'return-received':  () => sendReturnStatusEmail('preview@example.com', 'Awa', 'SKG-00042', 'received'),
  'return-refunded':  () => sendReturnStatusEmail('preview@example.com', 'Awa', 'SKG-00042', 'refunded'),
  'return-cancelled': () => sendReturnStatusEmail('preview@example.com', 'Awa', 'SKG-00042', 'cancelled'),
  'new-return-admin': () => sendNewReturnAdminEmail('preview@example.com', {
    orderNumber: 'SKG-00042', clientNom: 'Awa Koné', clientEmail: 'awa@example.com',
    reason: 'defective', itemsLabel: 'Casque Bluetooth Pro X ×1', returnId: 'clxxxxxxxxxxxxxx',
  }),
}

/* ── GET /api/email-templates — liste des templates disponibles ── */
router.get('/', (_req, res) => {
  res.json({ success: true, data: { templates: Object.keys(TEMPLATES) } })
})

/* ─────────────────────────────────────────────────────────────
   GET /api/email-templates/:name — rendu HTML réel (aucun envoi)
   ?tokens=<json>  — optionnel, aperçu avec des tokens "brouillon"
   pas encore sauvegardés (validés par la même liste blanche, isolé
   par requête — n'affecte jamais un autre appel concurrent).
───────────────────────────────────────────────────────────── */
router.get('/:name', async (req, res) => {
  const name = req.params['name'] as string
  const fn = TEMPLATES[name]
  if (!fn) { res.status(404).json({ success: false, message: 'Template inconnu: ' + name }); return }

  let draftTokens: Partial<EmailDesignTokens> | undefined
  const rawTokens = req.query['tokens']
  if (typeof rawTokens === 'string') {
    try {
      const parsed: unknown = JSON.parse(rawTokens)
      if (parsed && typeof parsed === 'object') draftTokens = sanitizeTokens(parsed as Record<string, unknown>)
    } catch { /* JSON invalide → ignoré, on garde le design sauvegardé */ }
  }

  const capture = { html: '' }
  try {
    await emailCaptureContext.run(capture, async () => {
      if (draftTokens) {
        await tokenPreviewContext.run(draftTokens, () => fn())
      } else {
        await fn()
      }
    })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(capture.html || '<p>Aucun HTML capturé.</p>')
  } catch (err) {
    console.error('[EMAIL-TEMPLATES]', err)
    res.status(500).send('<pre>' + String(err) + '</pre>')
  }
})

/* ─────────────────────────────────────────────────────────────
   Design tokens partagés par tous les emails — persistés en base
   (SiteSettings), jamais sur disque (non garanti persistant en
   production). Validation stricte : toute valeur non conforme à
   la liste blanche est rejetée en 400, jamais silencieusement
   corrigée (contrairement à l'aperçu, où un repli discret est
   préférable pour ne jamais casser l'affichage).
───────────────────────────────────────────────────────────── */
router.get('/design/tokens', async (_req, res) => {
  const tokens = await getRawEmailTokens()
  res.json({ success: true, data: { tokens } })
})

const tokensSchema = z.object({
  primaryColor:       z.string().regex(HEX_COLOR_RE, 'Couleur hexadécimale invalide (ex: #1a73e8)'),
  headerGradientFrom: z.string().regex(HEX_COLOR_RE, 'Couleur hexadécimale invalide'),
  headerGradientTo:   z.string().regex(HEX_COLOR_RE, 'Couleur hexadécimale invalide'),
  cardRadius:         z.coerce.number().int().min(0).max(40),
  cardBg:             z.string().regex(HEX_COLOR_RE, 'Couleur hexadécimale invalide'),
  bodyBg:             z.string().regex(HEX_COLOR_RE, 'Couleur hexadécimale invalide'),
  footerText:         z.string().min(1).max(200),
  logoUrl:            z.string().regex(HTTPS_URL_RE, 'URL invalide (https uniquement)'),
  logoWidth:          z.coerce.number().int().min(10).max(600),
  logoHeight:         z.coerce.number().int().min(10).max(600),
  badgeText:          z.string().min(1).max(40),
}).partial()

router.put('/design/tokens', validate(tokensSchema), async (req, res) => {
  const tokens = req.body as z.infer<typeof tokensSchema>
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: {
      emailPrimaryColor: tokens.primaryColor, emailHeaderGradientFrom: tokens.headerGradientFrom,
      emailHeaderGradientTo: tokens.headerGradientTo, emailCardRadius: tokens.cardRadius,
      emailCardBg: tokens.cardBg, emailBodyBg: tokens.bodyBg, emailFooterText: tokens.footerText,
      emailLogoUrl: tokens.logoUrl, emailLogoWidth: tokens.logoWidth, emailLogoHeight: tokens.logoHeight,
      emailBadgeText: tokens.badgeText,
    },
    update: {
      ...(tokens.primaryColor       !== undefined && { emailPrimaryColor: tokens.primaryColor }),
      ...(tokens.headerGradientFrom !== undefined && { emailHeaderGradientFrom: tokens.headerGradientFrom }),
      ...(tokens.headerGradientTo   !== undefined && { emailHeaderGradientTo: tokens.headerGradientTo }),
      ...(tokens.cardRadius         !== undefined && { emailCardRadius: tokens.cardRadius }),
      ...(tokens.cardBg             !== undefined && { emailCardBg: tokens.cardBg }),
      ...(tokens.bodyBg             !== undefined && { emailBodyBg: tokens.bodyBg }),
      ...(tokens.footerText         !== undefined && { emailFooterText: tokens.footerText }),
      ...(tokens.logoUrl            !== undefined && { emailLogoUrl: tokens.logoUrl }),
      ...(tokens.logoWidth          !== undefined && { emailLogoWidth: tokens.logoWidth }),
      ...(tokens.logoHeight         !== undefined && { emailLogoHeight: tokens.logoHeight }),
      ...(tokens.badgeText          !== undefined && { emailBadgeText: tokens.badgeText }),
    },
  })
  res.json({ success: true, message: 'Design enregistré — appliqué à tous les emails à partir de maintenant.' })
})

router.delete('/design/tokens', async (_req, res) => {
  await prisma.siteSettings.upsert({
    where: { id: 1 },
    create: {},
    update: {
      emailPrimaryColor: null, emailHeaderGradientFrom: null, emailHeaderGradientTo: null,
      emailCardRadius: null, emailCardBg: null, emailBodyBg: null,
      emailFooterText: null, emailLogoUrl: null, emailLogoWidth: null, emailLogoHeight: null,
      emailBadgeText: null,
    },
  })
  res.json({ success: true, message: 'Design par défaut restauré.' })
})

export default router
