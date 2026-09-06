import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { X, Trash2 } from 'lucide-react'
import CurvedInput from '../ui/CurvedInput'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { API_BASE } from '../../lib/api'
import { registerPurgeHandler } from '../../lib/sessionPurge'
import { type Message, type ChatAction, type ChatProduct, newMessageId, now } from './chatbox/types'
import { getQuickReplies } from './chatbox/quickReplies'
import { ChatProductCard } from './chatbox/ChatProductCard'
import { ChatActions } from './chatbox/ChatActions'

/* ─────────────────────────────────────────────────────────────
   Assistant e-commerce Skignas — style Modernist : zéro rayon, filets 2px,
   Archivo, rouge #ec3013 en accent, libellés flush left.

   Branché sur un vrai assistant IA (POST /api/chat/message, Groq — voir
   backend/src/routes/chat.ts) : statut de commande, disponibilité produit
   et coordonnées de contact toujours vérifiés en base côté serveur, jamais
   inventés. La clé du fournisseur IA ne quitte jamais le backend.

   Historique : persistant en localStorage pour un invité uniquement (clé
   dédiée, plafonnée, jamais de donnée sensible) ; un utilisateur connecté
   repart d'une conversation neuve à chaque session — pas de stockage
   backend des conversations aujourd'hui, donc pas de risque qu'un compte
   voie la conversation d'un autre. Purgé au logout comme le panier (voir
   lib/sessionPurge.ts).
───────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'skignas_chat_history'
const MAX_STORED_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 500
const REQUEST_TIMEOUT_MS = 25_000
const NEAR_BOTTOM_THRESHOLD = 80

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  from: 'team',
  text: "Bonjour 👋 Je suis l'assistant Skignas. Je peux vous aider à trouver un produit, suivre une commande ou répondre à vos questions.",
  time: now(),
}

function loadGuestHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [WELCOME_MESSAGE]
    const parsed = JSON.parse(raw) as Message[]
    if (!Array.isArray(parsed) || parsed.length === 0) return [WELCOME_MESSAGE]
    return parsed
  } catch {
    return [WELCOME_MESSAGE]
  }
}

function saveGuestHistory(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)))
  } catch {
    // quota localStorage plein ou indisponible (navigation privée) — l'historique
    // reste simplement non persistant pour cette session, rien de bloquant.
  }
}

/** Traduit une erreur réseau/HTTP en message humain — jamais de détail
 * technique visible dans le chat. */
function errorReplyFor(status: number | null, aborted: boolean): string {
  if (aborted) return "La réponse prend plus de temps que prévu. Réessayez dans un instant."
  if (status === 401) return "Votre session a expiré. Veuillez vous reconnecter."
  if (status === 429) return "Vous envoyez beaucoup de demandes. Patientez quelques secondes puis réessayez."
  if (status !== null && status >= 500) return "L'assistant est momentanément indisponible. Réessayez dans quelques instants."
  return "Votre connexion semble instable. Vérifiez votre connexion puis réessayez."
}

export function Chatbox() {
  const { token, isAuthenticated } = useAuth()
  const { totalItems } = useCart()
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => (isAuthenticated ? [WELCOME_MESSAGE] : loadGuestHistory()))
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending'>('idle')
  const [confirmClear, setConfirmClear] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const prevTokenRef = useRef<string | null>(null)

  /* Persistance locale — invité uniquement. Un utilisateur connecté ne
     stocke rien : pas de backend de conversations aujourd'hui, donc rien
     à isoler par compte au-delà de repartir à zéro. */
  useEffect(() => {
    if (isAuthenticated) return
    saveGuestHistory(messages)
  }, [messages, isAuthenticated])

  /* Connexion / déconnexion — la conversation d'un invité ne doit jamais
     se retrouver "sous" un compte, et un compte ne doit jamais hériter de
     la conversation du compte précédent sur le même appareil. */
  useEffect(() => {
    const prev = prevTokenRef.current
    prevTokenRef.current = token
    if (token !== prev) {
      setMessages([WELCOME_MESSAGE])
      try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    }
  }, [token])

  /* Purge au logout — même registre que le panier (voir lib/sessionPurge.ts,
     CartContext.tsx) : AuthContext.logout() n'a pas besoin de connaître ce
     composant pour le vider. */
  useEffect(() => registerPurgeHandler(() => {
    setMessages([WELCOME_MESSAGE])
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }), [])

  /* Auto-scroll uniquement si le client était déjà proche du bas — ne le
     ramène jamais de force s'il relit l'historique. */
  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_THRESHOLD
  }
  useEffect(() => {
    if (!stickToBottomRef.current) return
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: prefersReducedMotion ? 'auto' : 'smooth' })
  }, [messages, status, prefersReducedMotion])

  async function send(text: string) {
    const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH)
    if (!trimmed || status === 'sending') return

    const priorHistory = messages
      .filter(m => m.id !== WELCOME_MESSAGE.id)
      .map(m => ({ role: (m.from === 'me' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.text }))

    stickToBottomRef.current = true
    setMessages(m => [...m, { id: newMessageId(), from: 'me', text: trimmed, time: now() }])
    setInput('')
    setStatus('sending')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const res = await fetch(`${API_BASE}/api/chat/message`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          message: trimmed,
          history: priorHistory,
          context: { page: location.pathname, isAuthenticated, cartCount: totalItems },
        }),
      })

      if (!res.ok) {
        setMessages(m => [...m, { id: newMessageId(), from: 'team', text: errorReplyFor(res.status, false), time: now() }])
        return
      }

      const json = await res.json().catch(() => null)
      const reply: string = json?.data?.reply || errorReplyFor(null, false)
      const actions: ChatAction[] = json?.data?.actions ?? []
      const products: ChatProduct[] = json?.data?.products ?? []
      setMessages(m => [...m, { id: newMessageId(), from: 'team', text: reply, time: now(), actions, products }])
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError'
      setMessages(m => [...m, { id: newMessageId(), from: 'team', text: errorReplyFor(null, aborted), time: now() }])
    } finally {
      clearTimeout(timeout)
      setStatus('idle')
    }
  }

  function handleClearConversation() {
    setMessages([WELCOME_MESSAGE])
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    setConfirmClear(false)
  }

  const isSending = status === 'sending'
  const quickReplies = getQuickReplies(location.pathname)
  const showQuickReplies = messages.length === 1 && !isSending
  const charsLeft = MAX_MESSAGE_LENGTH - input.length

  return (
    <div className="font-[Archivo,system-ui,sans-serif]">
      {/* Lanceur */}
      <motion.button
        onClick={() => setIsOpen(v => !v)}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 rounded-full right-5 z-[70] w-[60px] h-[60px] bg-[#201e1d] text-[#f3f2f2] shadow-[0_3px_10px_rgba(45,43,43,0.16)] flex items-center justify-center text-[12px] font-extrabold tracking-[0.06em] hover:bg-[#ec3013] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec3013] transition-colors"
        aria-label={isOpen ? "Fermer l'assistant Skignas" : "Ouvrir l'assistant Skignas"}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isOpen ? 'close' : 'open'}
            initial={prefersReducedMotion ? false : { rotate: -45, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={prefersReducedMotion ? undefined : { rotate: 45, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {isOpen ? <X size={22} strokeWidth={2.5} /> : 'AIDE'}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Panneau — plein écran sur mobile, fenêtre compacte à partir de sm */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            role="dialog"
            aria-label="Assistant Skignas"
            className="fixed inset-0 sm:inset-auto sm:bottom-[92px] sm:right-5 z-[70] w-full sm:w-[390px] sm:max-w-[calc(100vw-2.5rem)] h-[100dvh] sm:h-[560px] sm:max-h-[72vh] bg-[#f3f2f2] shadow-[0_12px_32px_rgba(45,43,43,0.22)] flex flex-col overflow-hidden"
          >
            {/* En-tête */}
            <div className="shrink-0 flex items-center gap-3 p-4 border-b-2 border-[#201e1d]">
              <div className="w-9 h-9 shrink-0 bg-[#ec3013] text-white flex items-center justify-center text-[15px] font-extrabold rounded-full">S</div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold text-[#201e1d] leading-tight tracking-[-0.01em]">Assistant Skignas</p>
                <p className="text-[11px] font-semibold text-[#605d5d] leading-tight mt-0.5 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSending ? 'bg-[#ec3013]' : 'bg-emerald-500'}`} />
                  {isSending ? 'Réponse en cours…' : 'En ligne'}
                </p>
              </div>
              <button
                onClick={() => setConfirmClear(true)}
                aria-label="Effacer la conversation"
                title="Effacer la conversation"
                className="w-10 h-10 rounded-full shrink-0 text-[#605d5d] flex items-center justify-center hover:bg-[#eae9e9] hover:text-[#201e1d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec3013] transition-colors"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fermer l'assistant"
                className="w-11 h-11 rounded-full shrink-0 text-[#201e1d] flex items-center justify-center hover:bg-[#ffe0d9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec3013] transition-colors"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Confirmation d'effacement */}
            {confirmClear && (
              <div className="shrink-0 p-4 bg-[#ffe0d9] border-b-2 border-[#201e1d] flex flex-col gap-3">
                <p className="text-[13px] text-[#201e1d]">
                  <strong className="font-bold">Effacer la conversation ?</strong><br />
                  Cette action supprimera l'historique actuel.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="flex-1 min-h-[40px] text-[13px] font-semibold border-2 border-[#201e1d] text-[#201e1d] hover:bg-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec3013]"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleClearConversation}
                    className="flex-1 min-h-[40px] text-[13px] font-semibold bg-[#201e1d] text-white hover:bg-[#ae1800] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec3013]"
                  >
                    Effacer
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              role="log"
              aria-live="polite"
              aria-label="Conversation avec l'assistant Skignas"
              className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4"
            >
              {messages.map(m => (
                <div key={m.id} className={`flex flex-col gap-1.5 ${m.from === 'me' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7d7979]">
                    {m.from === 'me' ? 'Vous' : 'Skignas'} · {m.time}
                  </span>
                  <div
                    className={`max-w-[80%] px-3.5 py-3 text-[15px] leading-[1.45] ${
                      m.from === 'me' ? 'bg-[#ec3013] text-white' : 'bg-[#eae9e9] text-[#201e1d]'
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.actions && m.actions.length > 0 && <ChatActions actions={m.actions} />}
                  {m.products && m.products.length > 0 && (
                    <div className="flex flex-col gap-2 mt-1 w-full">
                      {m.products.map(p => <ChatProductCard key={p.id} product={p} />)}
                    </div>
                  )}
                </div>
              ))}

              {/* Réponses rapides contextuelles — seulement au premier tour */}
              {showQuickReplies && (
                <div className="shrink-0 flex flex-wrap gap-2">
                  {quickReplies.map(label => (
                    <button
                      key={label}
                      onClick={() => send(label)}
                      className="min-h-[44px] px-3.5 border-2 border-[#201e1d] text-[14px] font-semibold text-[#201e1d] hover:bg-[#201e1d] hover:text-[#f3f2f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec3013] transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {isSending && (
                <div className="flex flex-col gap-1.5 items-start">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7d7979]">Skignas écrit</span>
                  <div className="bg-[#eae9e9] p-3.5 flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        className="w-2 h-2 bg-[#201e1d]"
                        animate={prefersReducedMotion ? undefined : { opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Saisie */}
            <div className="shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
              {charsLeft <= 100 && (
                <p className={`px-3 pt-1.5 text-[11px] ${charsLeft < 0 ? 'text-[#ae1800]' : 'text-[#7d7979]'}`}>
                  {charsLeft} caractère{Math.abs(charsLeft) > 1 ? 's' : ''} restant{Math.abs(charsLeft) > 1 ? 's' : ''}
                </p>
              )}
              <div className="flex px-3 py-2 items-stretch border-t-2 border-[#201e1d]">
                <CurvedInput
                  value={input}
                  onChange={v => setInput(v.slice(0, MAX_MESSAGE_LENGTH))}
                  onSubmit={send}
                  disabled={isSending}
                  showButton
                  showIcon={false}
                  placeholder="Écrivez votre message…"
                  buttonText={isSending ? 'Envoi…' : 'Envoyer'}
                  type="text"
                  bend={0}
                  cornerRadius={12}
                  borderWidth={0}
                  fontSize={13}
                  backgroundColor="#f3f2f2"
                  textColor="#201e1d"
                  placeholderColor="#7d7979"
                  borderColor="#201e1d"
                  buttonColor="#ec3013"
                  buttonTextColor="#f3f2f2"
                  shadowSize="sm"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
