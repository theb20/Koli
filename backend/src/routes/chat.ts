/* ─────────────────────────────────────────────────────────────
   Assistant du chatbox — Groq (Llama 3.3 70B), périmètre strict : commandes,
   produits, livraison Skignas uniquement. Statut de commande et disponibilité
   produit toujours vérifiés en base via des outils (tool use), jamais
   inventés par le modèle — même doctrine que le reste du projet ("ne jamais
   faire confiance à une donnée non revérifiée").

   Route publique (optionalAuth) : un visiteur non connecté peut discuter
   avec l'assistant, mais ne peut consulter que les commandes invité
   (userId null) — mêmes règles d'accès que GET /api/orders/:id, via
   orderOwnershipWhere réutilisé tel quel.
───────────────────────────────────────────────────────────── */
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { optionalAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { logger } from '../lib/logger'
import { isGroqConfigured, chatCompletion, type ChatMessage, type ToolDefinition } from '../lib/groq'
import { orderOwnershipWhere } from './orders'

const router = Router()

const FALLBACK_REPLY = "Je ne peux pas répondre en direct pour le moment, mais votre message est bien noté — notre équipe vous répond généralement sous quelques heures."

/* ── Protection du quota Groq gratuit (partagé par tous les visiteurs) ──
   1000 req/jour au moment de l'intégration — un compteur en mémoire, remis
   à zéro chaque jour, laisse une marge de sécurité plutôt que d'attendre
   que Groq renvoie lui-même une erreur de quota en pleine journée. */
const DAILY_QUOTA_CAP = 900
let quotaDay = new Date().toDateString()
let quotaCount = 0

function consumeDailyQuota(): boolean {
  const today = new Date().toDateString()
  if (today !== quotaDay) {
    quotaDay = today
    quotaCount = 0
  }
  if (quotaCount >= DAILY_QUOTA_CAP) return false
  quotaCount++
  return true
}

const SYSTEM_PROMPT = `Tu es l'assistant support de Skignas, une marketplace tech basée à Abidjan, Côte d'Ivoire.

Périmètre strict : tu réponds UNIQUEMENT aux questions sur les commandes, produits, livraison et retours Skignas. Si la question sort de ce périmètre, dis poliment que tu ne peux aider que sur ces sujets et propose de contacter un conseiller.

Règles impératives :
- N'invente JAMAIS un statut de commande, un prix ou une disponibilité — utilise toujours les outils fournis pour vérifier l'information réelle avant de répondre.
- Si un client demande le statut d'une commande, demande-lui son numéro de commande (format KLI-XXXXXXXX-XXXX) s'il ne l'a pas donné, puis utilise l'outil lookup_order.
- Réponds en français, de façon concise (2-4 phrases), chaleureuse et professionnelle.
- Ne révèle jamais d'informations techniques internes (base de données, API, code).`

const TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'lookup_order',
      description: "Récupère le statut réel d'une commande Skignas à partir de son numéro (ex: KLI-20260904-1234).",
      parameters: {
        type: 'object',
        properties: {
          orderNumber: { type: 'string', description: 'Numéro de commande, ex: KLI-20260904-1234' },
        },
        required: ['orderNumber'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Recherche des produits réels dans le catalogue Skignas par nom, marque ou catégorie.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Terme de recherche, ex: "casque bluetooth"' },
        },
        required: ['query'],
      },
    },
  },
]

async function runLookupOrder(orderNumber: string, req: import('express').Request): Promise<string> {
  const order = await prisma.order.findFirst({
    where: orderOwnershipWhere(req, orderNumber.trim()),
    select: { orderNumber: true, status: true, paymentStatus: true, total: true, createdAt: true, deliveryMethod: true },
  })
  if (!order) return JSON.stringify({ found: false, message: 'Commande introuvable avec ce numéro.' })
  return JSON.stringify({
    found: true,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    createdAt: order.createdAt,
    deliveryMethod: order.deliveryMethod,
  })
}

async function runSearchProducts(query: string): Promise<string> {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, brand: true, price: true, stock: true },
    take: 5,
  })
  return JSON.stringify({ count: products.length, products })
}

const bodySchema = z.object({
  message: z.string().min(1).max(1000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional(),
})

router.post('/message', optionalAuth, validate(bodySchema), async (req, res) => {
  const { message, history = [] } = req.body as z.infer<typeof bodySchema>

  if (!isGroqConfigured()) {
    res.json({ success: true, data: { reply: FALLBACK_REPLY } })
    return
  }
  if (!consumeDailyQuota()) {
    logger.warn('[chat] quota Groq quotidien atteint')
    res.json({ success: true, data: { reply: FALLBACK_REPLY } })
    return
  }

  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(h => ({ role: h.role, content: h.content }) as ChatMessage),
      { role: 'user', content: message },
    ]

    // Boucle d'appel d'outils bornée — un aller-retour de tool use normal
    // tient en 1-2 itérations, la borne évite une boucle infinie en cas de
    // comportement inattendu du modèle.
    let reply: string | null = null
    for (let round = 0; round < 3 && reply === null; round++) {
      const res1 = await chatCompletion(messages, TOOLS)
      const choice = res1.choices[0]?.message
      if (!choice) break

      if (!choice.tool_calls?.length) {
        reply = choice.content ?? FALLBACK_REPLY
        break
      }

      messages.push({ role: 'assistant', content: choice.content, tool_calls: choice.tool_calls })

      for (const call of choice.tool_calls) {
        let result = '{}'
        try {
          const args = JSON.parse(call.function.arguments) as Record<string, string>
          if (call.function.name === 'lookup_order') {
            result = await runLookupOrder(args.orderNumber ?? '', req)
          } else if (call.function.name === 'search_products') {
            result = await runSearchProducts(args.query ?? '')
          }
        } catch (err) {
          logger.error('[chat] échec exécution outil', call.function.name, err)
          result = JSON.stringify({ error: 'Outil indisponible' })
        }
        messages.push({ role: 'tool', tool_call_id: call.id, content: result })
      }
    }

    res.json({ success: true, data: { reply: reply ?? FALLBACK_REPLY } })
  } catch (err) {
    logger.error('[chat] échec assistant', err)
    res.json({ success: true, data: { reply: FALLBACK_REPLY } })
  }
})

export default router
