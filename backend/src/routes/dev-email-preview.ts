/* ─────────────────────────────────────────────────────────────
   FICHIER TEMPORAIRE — à supprimer une fois la relecture des
   templates email terminée. Ne pas déployer en production.

   Intercepte resend.emails.send() pour capturer le HTML généré
   par chaque template réel (sans envoyer d'email) et le renvoyer
   pour prévisualisation dans un <iframe>.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { resend } from '../lib/email/client'
import {
  sendWelcomeEmail, sendMagicLinkEmail, sendPasswordResetEmail, sendPasswordChangedEmail,
  sendOrderConfirmationEmail, sendOrderStatusEmail, sendContactReply, sendBroadcastEmail,
  sendNewOrderAdminEmail, sendNewProductRequestAdminEmail, sendProductRequestReplyEmail,
} from '../lib/email'
import { sendFlashDealEmail } from '../lib/email/templates/flash-deal'

const router = Router()

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

router.get('/', (_req, res) => {
  res.json({ success: true, data: { templates: Object.keys(TEMPLATES) } })
})

router.get('/:name', async (req, res) => {
  const name = req.params['name'] as string
  const fn = TEMPLATES[name]
  if (!fn) { res.status(404).send('Template inconnu: ' + name); return }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const original = resend.emails.send.bind(resend.emails)
  let captured = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(resend.emails as any).send = async (payload: { html?: string }) => {
    captured = payload.html ?? ''
    return { data: { id: 'preview' }, error: null }
  }

  try {
    await fn()
    // Helmet met X-Frame-Options: SAMEORIGIN + frame-ancestors 'self' par défaut sur
    // toutes les réponses — koli-admin (localhost:5174) et le backend (localhost:4000)
    // sont deux origines différentes, donc le navigateur refuse d'afficher l'iframe
    // sans ça. Sans risque : route temporaire, non montée en production.
    res.removeHeader('X-Frame-Options')
    res.removeHeader('Content-Security-Policy')
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(captured || '<p>Aucun HTML capturé.</p>')
  } catch (err) {
    res.status(500).send('<pre>' + String(err) + '</pre>')
  } finally {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(resend.emails as any).send = original
  }
})

/* ─────────────────────────────────────────────────────────────
   Sauvegarde du design commun (layout.ts) — CSS uniquement.
   Le HTML complet capturé par /:name ne peut pas être réinjecté tel
   quel dans les templates : il contient les données de la commande
   factice (nom, montants...) déjà substituées dans le texte. Le
   <style> partagé, lui, ne contient jamais de donnée par email —
   c'est la seule partie qu'on peut réécrire sans risque de figer
   des valeurs de démo dans les vrais emails envoyés en production.
───────────────────────────────────────────────────────────── */
const LAYOUT_PATH = path.resolve(__dirname, '../lib/email/layout.ts')

router.get('/design/current-css', (_req, res) => {
  const source = fs.readFileSync(LAYOUT_PATH, 'utf-8')
  const match = source.match(/<style>([\s\S]*?)<\/style>/)
  if (!match) { res.status(500).json({ success: false, message: '<style> introuvable dans layout.ts' }); return }
  res.json({ success: true, data: { css: match[1] } })
})

router.post('/design/save-css', (req, res) => {
  const css = req.body?.css
  if (typeof css !== 'string' || !css.trim()) {
    res.status(400).json({ success: false, message: 'CSS manquant' })
    return
  }
  // layout.ts est un template literal — ces caractères casseraient le fichier TS.
  if (css.includes('`') || css.includes('${')) {
    res.status(400).json({ success: false, message: 'Le CSS ne peut pas contenir ` ou ${ (syntaxe réservée au template)' })
    return
  }

  const source = fs.readFileSync(LAYOUT_PATH, 'utf-8')
  if (!/<style>[\s\S]*?<\/style>/.test(source)) {
    res.status(500).json({ success: false, message: '<style> introuvable dans layout.ts' })
    return
  }
  const updated = source.replace(/<style>[\s\S]*?<\/style>/, `<style>${css}</style>`)
  fs.writeFileSync(LAYOUT_PATH, updated, 'utf-8')
  res.json({ success: true, message: 'Design sauvegardé dans layout.ts' })
})

export default router
