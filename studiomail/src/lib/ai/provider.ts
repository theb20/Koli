/* ─────────────────────────────────────────────────────────────
   Création assistée — interface abstraite, pour pouvoir brancher un vrai
   fournisseur (OpenAI, Anthropic, etc.) plus tard SANS toucher à l'UI qui
   la consomme (components/panels/AIPanel.tsx). Aucune clé API dans ce
   frontend, jamais : un vrai fournisseur devrait passer par un backend
   proxy (hors périmètre de ce prototype local-first).

   Tant qu'aucun fournisseur n'est branché, `demoAIProvider` répond de
   façon déterministe (mêmes entrées → mêmes sorties) à partir de règles
   simples — jamais un résultat inventé présenté comme une vraie réponse
   d'IA (voir label "Mode démonstration" dans AIPanel.tsx).
───────────────────────────────────────────────────────────── */
import type { EmailDocument } from '@/types/document'
import { TEMPLATES } from '../templates'

export interface AIProvider {
  readonly isDemo: boolean
  suggestSubjectLines: (brief: string) => Promise<string[]>
  rewriteText: (text: string, tone: 'formel' | 'amical' | 'direct') => Promise<string>
  generateFromBrief: (brief: string) => Promise<EmailDocument>
  translateDocument: (doc: EmailDocument, targetLanguage: string) => Promise<EmailDocument>
}

function firstSentence(text: string): string {
  const m = /^[^.!?]*[.!?]/.exec(text.trim())
  return (m ? m[0] : text).trim()
}

function pickTemplateByKeywords(brief: string): EmailDocument {
  const b = brief.toLowerCase()
  const match = (...words: string[]) => words.some(w => b.includes(w))
  let key: string = 'newsletter'
  if (match('bienvenue', 'onboarding', 'inscription')) key = 'welcome'
  else if (match('promo', 'solde', 'réduction', 'reduction', 'vente flash')) key = 'promotion'
  else if (match('panier', 'abandon')) key = 'abandoned-cart'
  else if (match('facture', 'reçu', 'recu')) key = 'invoice'
  else if (match('événement', 'evenement', 'invitation', 'webinar')) key = 'event'
  else if (match('lancement', 'nouveau produit')) key = 'product-launch'
  const template = TEMPLATES.find(t => t.id === key) ?? TEMPLATES[0]!
  return JSON.parse(JSON.stringify(template.document))
}

export const demoAIProvider: AIProvider = {
  isDemo: true,

  async suggestSubjectLines(brief) {
    const topic = firstSentence(brief) || 'Votre actualité'
    const short = topic.length > 40 ? `${topic.slice(0, 37)}…` : topic
    return [
      `${short}`,
      `${short} — à découvrir dès maintenant`,
      `[Nouveau] ${short}`,
      `Ne manquez pas : ${short.charAt(0).toLowerCase()}${short.slice(1)}`,
    ]
  },

  async rewriteText(text, tone) {
    const clean = text.trim().replace(/\s+/g, ' ')
    if (!clean) return clean
    if (tone === 'direct') return firstSentence(clean)
    if (tone === 'formel') return `${clean.charAt(0).toUpperCase()}${clean.slice(1)}${/[.!?]$/.test(clean) ? '' : '.'}`
    return `${clean} 🙂`
  },

  async generateFromBrief(brief) {
    const doc = pickTemplateByKeywords(brief)
    if (!doc.subject) doc.subject = firstSentence(brief) || doc.subject
    return doc
  },

  // Démo : ne traduit pas réellement (aucun service de traduction branché) —
  // signale honnêtement la limite plutôt que de laisser croire à une
  // traduction qui n'a pas eu lieu.
  async translateDocument(doc) {
    return doc
  },
}
