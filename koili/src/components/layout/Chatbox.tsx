import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  X,
  Trash2,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  PackageSearch,
  HelpCircle,
} from 'lucide-react'

import CurvedInput from '../ui/CurvedInput'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { API_BASE } from '../../lib/api'
import { registerPurgeHandler } from '../../lib/sessionPurge'

import {
  type Message,
  type ChatAction,
  type ChatProduct,
  newMessageId,
  now,
} from './chatbox/types'

import { getQuickReplies } from './chatbox/quickReplies'
import { ChatProductCard } from './chatbox/ChatProductCard'
import { ChatActions } from './chatbox/ChatActions'

const STORAGE_KEY = 'skignas_chat_history'
const MAX_STORED_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 500
const REQUEST_TIMEOUT_MS = 25_000
const NEAR_BOTTOM_THRESHOLD = 80

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  from: 'team',
  text:
    "Bonjour, Je suis l'assistant Skignas. Je peux vous aider à trouver un produit, suivre une commande ou répondre à vos questions.",
  time: now(),
}

function loadGuestHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) return [WELCOME_MESSAGE]

    const parsed = JSON.parse(raw) as Message[]

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [WELCOME_MESSAGE]
    }

    return parsed
  } catch {
    return [WELCOME_MESSAGE]
  }
}

function saveGuestHistory(messages: Message[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)),
    )
  } catch {
    // localStorage indisponible
  }
}

function errorReplyFor(
  status: number | null,
  aborted: boolean,
): string {
  if (aborted) {
    return "La réponse prend plus de temps que prévu. Réessayez dans un instant."
  }

  if (status === 401) {
    return "Votre session a expiré. Veuillez vous reconnecter."
  }

  if (status === 429) {
    return "Vous envoyez beaucoup de demandes. Patientez quelques secondes puis réessayez."
  }

  if (status !== null && status >= 500) {
    return "L'assistant est momentanément indisponible. Réessayez dans quelques instants."
  }

  return "Votre connexion semble instable. Vérifiez votre connexion puis réessayez."
}

export function Chatbox() {
  const { token, isAuthenticated } = useAuth()
  const { totalItems } = useCart()
  const location = useLocation()
  const prefersReducedMotion = useReducedMotion()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() =>
    isAuthenticated ? [WELCOME_MESSAGE] : loadGuestHistory(),
  )
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending'>('idle')
  const [confirmClear, setConfirmClear] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const prevTokenRef = useRef<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) return
    saveGuestHistory(messages)
  }, [messages, isAuthenticated])

  useEffect(() => {
    const prev = prevTokenRef.current
    prevTokenRef.current = token

    if (token !== prev) {
      setMessages([WELCOME_MESSAGE])

      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    }
  }, [token])

  useEffect(
    () =>
      registerPurgeHandler(() => {
        setMessages([WELCOME_MESSAGE])

        try {
          localStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }
      }),
    [],
  )

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return

    stickToBottomRef.current =
      el.scrollHeight -
        el.scrollTop -
        el.clientHeight <
      NEAR_BOTTOM_THRESHOLD
  }

  useEffect(() => {
    if (!stickToBottomRef.current) return

    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }, [messages, status, prefersReducedMotion])

  async function send(text: string) {
    const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH)

    if (!trimmed || status === 'sending') return

    const priorHistory = messages
      .filter(m => m.id !== WELCOME_MESSAGE.id)
      .map(m => ({
        role: (m.from === 'me'
          ? 'user'
          : 'assistant') as 'user' | 'assistant',
        content: m.text,
      }))

    stickToBottomRef.current = true

    setMessages(m => [
      ...m,
      {
        id: newMessageId(),
        from: 'me',
        text: trimmed,
        time: now(),
      },
    ])

    setInput('')
    setStatus('sending')

    const controller = new AbortController()

    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS,
    )

    try {
      const res = await fetch(`${API_BASE}/api/chat/message`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          history: priorHistory,
          context: {
            page: location.pathname,
            isAuthenticated,
            cartCount: totalItems,
          },
        }),
      })

      if (!res.ok) {
        setMessages(m => [
          ...m,
          {
            id: newMessageId(),
            from: 'team',
            text: errorReplyFor(res.status, false),
            time: now(),
          },
        ])

        return
      }

      const json = await res.json().catch(() => null)

      const reply: string =
        json?.data?.reply ||
        errorReplyFor(null, false)

      const actions: ChatAction[] =
        json?.data?.actions ?? []

      const products: ChatProduct[] =
        json?.data?.products ?? []

      setMessages(m => [
        ...m,
        {
          id: newMessageId(),
          from: 'team',
          text: reply,
          time: now(),
          actions,
          products,
        },
      ])
    } catch (err) {
      const aborted =
        err instanceof DOMException &&
        err.name === 'AbortError'

      setMessages(m => [
        ...m,
        {
          id: newMessageId(),
          from: 'team',
          text: errorReplyFor(null, aborted),
          time: now(),
        },
      ])
    } finally {
      clearTimeout(timeout)
      setStatus('idle')
    }
  }

  function handleClearConversation() {
    setMessages([WELCOME_MESSAGE])

    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }

    setConfirmClear(false)
  }

  const isSending = status === 'sending'
  const quickReplies = getQuickReplies(location.pathname)
  const showQuickReplies =
    messages.length === 1 && !isSending
  const charsLeft = MAX_MESSAGE_LENGTH - input.length

  return (
    <div className="font-[Archivo,system-ui,sans-serif]">
      {/* =====================================================
          FLOATING BUTTON
      ====================================================== */}

      <motion.button
        onClick={() => setIsOpen(v => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label={
          isOpen
            ? "Fermer l'assistant Skignas"
            : "Ouvrir l'assistant Skignas"
        }
        className="
          fixed bottom-5 right-5 z-[70]
          flex h-[60px] w-[60px]
          items-center justify-center
          rounded-[20px]
          bg-[#111111]
          text-white
          shadow-[0_18px_45px_rgba(0,0,0,0.16)]
          transition-all
          hover:bg-[#ec3013]
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-[#ec3013]
          focus-visible:ring-offset-4
          focus-visible:ring-offset-white
        "
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={isOpen ? 'close' : 'open'}
            initial={
              prefersReducedMotion
                ? false
                : {
                    opacity: 0,
                    scale: 0.6,
                    rotate: -25,
                  }
            }
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
            }}
            exit={
              prefersReducedMotion
                ? undefined
                : {
                    opacity: 0,
                    scale: 0.6,
                    rotate: 25,
                  }
            }
          >
            {isOpen ? (
              <X size={21} />
            ) : (
              <img 
                src="/icons/ax.png" 
                className="w-10 h-10" 
                alt="Chat" />
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* =====================================================
          CHAT
      ====================================================== */}

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="
                fixed inset-0 z-[69]
                bg-black/10
                backdrop-blur-[3px]
                sm:hidden
              "
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={
                prefersReducedMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 24,
                      scale: 0.96,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={
                prefersReducedMotion
                  ? undefined
                  : {
                      opacity: 0,
                      y: 24,
                      scale: 0.96,
                    }
              }
              transition={{
                type: 'spring',
                stiffness: 360,
                damping: 30,
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Assistant Skignas"
              className="
                fixed inset-0 z-[70]
                flex flex-col
                overflow-hidden
                bg-white

                sm:inset-auto
                sm:bottom-5
                sm:right-5
                sm:h-[min(720px,calc(100vh-110px))]
                sm:w-[430px]
                sm:rounded-[30px]
                sm:border
                sm:border-[#eeeeec]
                sm:shadow-[0_30px_100px_rgba(0,0,0,0.15)]
              "
            >
              {/* =================================================
                  HEADER
              ================================================== */}

              <header
                className="
                  relative shrink-0
                  overflow-hidden
                  border-b border-[#eeeeec]
                  bg-white
                "
              >
                {/* Decorative background */}
                <div
                  className="
                    pointer-events-none
                    absolute -right-20 -top-32
                    h-64 w-64
                    rounded-full
                    bg-[#ec3013]/[0.06]
                    blur-3xl
                  "
                />

                <div className="relative px-5 pb-5 pt-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* AI logo */}
                      <div className="relative">
                        <motion.div
                          animate={
                            prefersReducedMotion
                              ? undefined
                              : {
                                  boxShadow: [
                                    '0 0 0 0 rgba(236,48,19,0.12)',
                                    '0 0 0 8px rgba(236,48,19,0.04)',
                                    '0 0 0 0 rgba(236,48,19,0.12)',
                                  ],
                                }
                          }
                          transition={{
                            duration: 2.4,
                            repeat: Infinity,
                          }}
                          className="
                            flex h-7 w-7
                            items-center justify-center
                            rounded-[15px]
                            bg-[#111111]
                            text-white
                          "
                        >
                          <img 
                src="/icons/ax.png" 
                className="w-5 h-5" 
                alt="Chat" />
                        </motion.div>

                        
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h2
                            className="
                              text-[15px]
                              font-bold
                              tracking-[-0.025em]
                              text-[#111111]
                            "
                          >
                            Assistant Skignas
                          </h2>
                        </div>

                        <p
                          className="
                            mt-0.5
                            text-[11px]
                            font-medium
                            text-[#96928e]
                          "
                        >
                          {isSending
                            ? 'Analyse de votre demande…'
                            : 'Votre concierge shopping'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setConfirmClear(true)}
                        aria-label="Effacer la conversation"
                        className="
                          flex h-9 w-9
                          items-center justify-center
                          rounded-xl
                          text-[#aaa6a2]
                          transition
                          hover:bg-[#f5f5f4]
                          hover:text-[#111111]
                        "
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        onClick={() => setIsOpen(false)}
                        aria-label="Fermer"
                        className="
                          flex h-9 w-9
                          items-center justify-center
                          rounded-xl
                          text-[#77736f]
                          transition
                          hover:bg-[#fff0ec]
                          hover:text-[#ec3013]
                        "
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  {/* =================================================
                      HERO ORB
                  ================================================== */}

                  {messages.length === 1 && (
                    <div
                      className="
                        relative mt-5
                        overflow-hidden
                        rounded-[24px]
                        border border-[#eeeeec]
                        bg-[#fafafa]
                        px-5 py-6
                      "
                    >
                      {/* Grid */}
                      <div
                        className="
                          pointer-events-none
                          absolute inset-0
                          opacity-[0.35]
                          [background-image:linear-gradient(rgba(0,0,0,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.035)_1px,transparent_1px)]
                          [background-size:24px_24px]
                        "
                      />

                      <div className="relative flex flex-col items-center">
                        {/* Orb */}
                        <div className="relative flex h-[100px] w-[100px] items-center justify-center">
                          

                          <motion.div
                            animate={
                              prefersReducedMotion
                                ? undefined
                                : {
                                    rotate: -360,
                                  }
                            }
                            
                            className="
                              absolute
                              h-[72px] w-[72px]
                              rounded-full
                              border
                              border-[#111111]/10
                              border-b-[#111111]/30
                            "
                          />

                          <motion.div
                            animate={
                              prefersReducedMotion
                                ? undefined
                                : {
                                    scale: [1, 1.08, 1],
                                  }
                            }
                            transition={{
                              duration: 2.8,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                            className="
                              relative
                              flex h-14 w-14
                              items-center justify-center
                              rounded-full
                              bg-[#111111]
                              text-white
                              shadow-[0_10px_35px_rgba(236,48,19,0.20)]
                            "
                          >
                            <img 
                            src="/icons/ax.png" 
                            className="w-10 h-10" 
                            alt="Chat" />

                           
                          </motion.div>
                        </div>

                        <h3
                          className="
                            mt-3
                            text-center
                            text-[21px]
                            font-bold
                            leading-tight
                            tracking-[-0.045em]
                            text-[#111111]
                          "
                        >
                          Comment puis-je
                          <br />
                          vous aider ?
                        </h3>

                        <p
                          className="
                            mt-2
                            max-w-[290px]
                            text-center
                            text-[11px]
                            leading-relaxed
                            text-[#96928e]
                          "
                        >
                          Produits, commandes, livraison ou questions :
                          je suis là pour vous accompagner.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </header>

              {/* =================================================
                  CLEAR CONFIRMATION
              ================================================== */}

              <AnimatePresence>
                {confirmClear && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      height: 0,
                    }}
                    animate={{
                      opacity: 1,
                      height: 'auto',
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                    className="
                      shrink-0
                      overflow-hidden
                      border-b border-[#eeeeec]
                      bg-[#fff8f6]
                    "
                  >
                    <div className="px-5 py-4">
                      <p
                        className="
                          text-[13px]
                          font-semibold
                          text-[#111111]
                        "
                      >
                        Effacer la conversation ?
                      </p>

                      <p
                        className="
                          mt-1
                          text-[11px]
                          leading-relaxed
                          text-[#8f8985]
                        "
                      >
                        L'historique actuel sera supprimé.
                      </p>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() =>
                            setConfirmClear(false)
                          }
                          className="
                            flex-1
                            rounded-xl
                            border border-[#e6e1de]
                            bg-white
                            px-3 py-2.5
                            text-[11px]
                            font-bold
                            text-[#55514e]
                            transition
                            hover:bg-[#f8f8f7]
                          "
                        >
                          Annuler
                        </button>

                        <button
                          onClick={handleClearConversation}
                          className="
                            flex-1
                            rounded-xl
                            bg-[#111111]
                            px-3 py-2.5
                            text-[11px]
                            font-bold
                            text-white
                            transition
                            hover:bg-[#ec3013]
                          "
                        >
                          Effacer
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* =================================================
                  MESSAGES
              ================================================== */}

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                role="log"
                aria-live="polite"
                className="
                  flex min-h-0
                  flex-1
                  flex-col
                  gap-5
                  overflow-y-auto
                  bg-[#fcfcfb]
                  px-5 py-5
                  scrollbar-thin
                  scrollbar-thumb-[#dedbd8]
                  scrollbar-track-transparent
                "
              >
                {messages.map(message => (
                  <motion.div
                    key={message.id}
                    initial={
                      prefersReducedMotion
                        ? false
                        : {
                            opacity: 0,
                            y: 10,
                          }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.25,
                    }}
                    className={`
                      flex flex-col gap-1.5
                      ${
                        message.from === 'me'
                          ? 'items-end'
                          : 'items-start'
                      }
                    `}
                  >
                    <span
                      className="
                        px-1
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-[0.08em]
                        text-[#aaa5a1]
                      "
                    >
                      {message.from === 'me'
                        ? 'Vous'
                        : 'Skignas'}{' '}
                      · {message.time}
                    </span>

                    <div
                      className={`
                        max-w-[88%]
                        text-[13px]
                        leading-[1.6]
                        tracking-[-0.005em]

                        ${
                          message.from === 'me'
                            ? `
                              rounded-[20px]
                              rounded-br-[5px]
                              bg-[#111111]
                              px-4 py-3
                              text-white
                              shadow-[0_8px_22px_rgba(0,0,0,0.10)]
                            `
                            : `
                              rounded-[20px]
                              rounded-bl-[5px]
                              border border-[#eeeeec]
                              bg-white
                              px-4 py-3
                              text-[#252321]
                              shadow-[0_6px_20px_rgba(0,0,0,0.035)]
                            `
                        }
                      `}
                    >
                      {message.text}
                    </div>

                    {message.actions &&
                      message.actions.length > 0 && (
                        <div className="mt-1 w-full">
                          <ChatActions
                            actions={message.actions}
                          />
                        </div>
                      )}

                    {message.products &&
                      message.products.length > 0 && (
                        <div className="mt-1 flex w-full flex-col gap-3">
                          {message.products.map(product => (
                            <ChatProductCard
                              key={product.id}
                              product={product}
                            />
                          ))}
                        </div>
                      )}
                  </motion.div>
                ))}

                {/* =================================================
                    QUICK ACTIONS
                ================================================== */}

                {showQuickReplies && (
                  <motion.div
                    initial={
                      prefersReducedMotion
                        ? false
                        : {
                            opacity: 0,
                            y: 10,
                          }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className="mt-1"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="
                          h-px
                          flex-1
                          bg-[#eeeeec]
                        "
                      />

                      <span
                        className="
                          text-[9px]
                          font-bold
                          uppercase
                          tracking-[0.12em]
                          text-[#aaa5a1]
                        "
                      >
                        Actions rapides
                      </span>

                      <span
                        className="
                          h-px
                          flex-1
                          bg-[#eeeeec]
                        "
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {quickReplies.map(
                        (label, index) => {
                          const icons = [
                            ShoppingBag,
                            PackageSearch,
                            HelpCircle,
                            ArrowUpRight,
                          ]

                          const Icon =
                            icons[index % icons.length]

                          return (
                            <motion.button
                              key={label}
                              whileHover={
                                prefersReducedMotion
                                  ? undefined
                                  : {
                                      y: -2,
                                    }
                              }
                              whileTap={{
                                scale: 0.98,
                              }}
                              onClick={() =>
                                send(label)
                              }
                              className="
                                group
                                flex min-h-[72px]
                                flex-col
                                justify-between
                                rounded-[18px]
                                border border-[#eeeeec]
                                bg-white
                                p-3.5
                                text-left
                                shadow-[0_5px_18px_rgba(0,0,0,0.025)]
                                transition
                                hover:border-[#ffcfc5]
                                hover:bg-[#fffaf8]
                              "
                            >
                              <span
                                className="
                                  flex h-7 w-7
                                  items-center
                                  justify-center
                                  rounded-lg
                                  bg-[#f5f4f2]
                                  text-[#77736f]
                                  transition
                                  group-hover:bg-[#fff0ec]
                                  group-hover:text-[#ec3013]
                                "
                              >
                                <Icon size={14} />
                              </span>

                              <span
                                className="
                                  mt-2
                                  flex items-center
                                  justify-between
                                  gap-2
                                  text-[11px]
                                  font-bold
                                  leading-tight
                                  text-[#403d3a]
                                "
                              >
                                <span>{label}</span>

                                <ArrowUpRight
                                  size={12}
                                  className="
                                    shrink-0
                                    text-[#b4afab]
                                    transition
                                    group-hover:text-[#ec3013]
                                  "
                                />
                              </span>
                            </motion.button>
                          )
                        },
                      )}
                    </div>
                  </motion.div>
                )}

                {/* =================================================
                    TYPING
                ================================================== */}

                {isSending && (
                  <motion.div
                    initial={
                      prefersReducedMotion
                        ? false
                        : {
                            opacity: 0,
                            y: 8,
                          }
                    }
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    className="flex items-start gap-2"
                  >
                    <div
                      className="
                        flex h-8 w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-[11px]
                        bg-[#111111]
                        text-white
                      "
                    >
                      <Sparkles size={13} />
                    </div>

                    <div>
                      <p
                        className="
                          mb-1.5
                          text-[9px]
                          font-semibold
                          uppercase
                          tracking-[0.08em]
                          text-[#aaa5a1]
                        "
                      >
                        Skignas réfléchit
                      </p>

                      <div
                        className="
                          flex items-center gap-1.5
                          rounded-[18px]
                          rounded-bl-[5px]
                          border border-[#eeeeec]
                          bg-white
                          px-4 py-3.5
                          shadow-[0_5px_18px_rgba(0,0,0,0.035)]
                        "
                      >
                        {[0, 1, 2].map(i => (
                          <motion.span
                            key={i}
                            className="
                              h-1.5 w-1.5
                              rounded-full
                              bg-[#ec3013]
                            "
                            animate={
                              prefersReducedMotion
                                ? undefined
                                : {
                                    y: [0, -3, 0],
                                    opacity: [
                                      0.3,
                                      1,
                                      0.3,
                                    ],
                                  }
                            }
                            transition={{
                              duration: 0.9,
                              repeat: Infinity,
                              delay: i * 0.15,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* =================================================
                  INPUT
              ================================================== */}

              <div
                className="
                  shrink-0
                  border-t border-[#eeeeec]
                  bg-white
                  px-4 pb-4 pt-3
                "
                style={{
                  paddingBottom:
                    'max(16px, env(safe-area-inset-bottom))',
                }}
              >
                {charsLeft <= 100 && (
                  <p
                    className={`
                      mb-1.5
                      px-1
                      text-[9px]
                      font-medium
                      ${
                        charsLeft < 0
                          ? 'text-red-600'
                          : 'text-[#aaa5a1]'
                      }
                    `}
                  >
                    {charsLeft} caractère
                    {Math.abs(charsLeft) > 1 ? 's' : ''}{' '}
                    restant
                    {Math.abs(charsLeft) > 1 ? 's' : ''}
                  </p>
                )}

                <div
                  className="
                    
                  "
                >
                  <CurvedInput
                    value={input}
                    onChange={value =>
                      setInput(
                        value.slice(
                          0,
                          MAX_MESSAGE_LENGTH,
                        ),
                      )
                    }
                    onSubmit={send}
                    disabled={isSending}
                    showButton
                    showIcon={false}
                    placeholder="Posez votre question…"
                    buttonText={
                      isSending ? 'Envoi…' : 'Envoyer'
                    }
                    type="text"
                    bend={0}
                    cornerRadius={10}
                    borderWidth={0}
                    fontSize={13}
                    backgroundColor="#ffffff"
                    textColor="#111111"
                    placeholderColor="#aaa5a1"
                    borderColor="#ffffff"
                    buttonColor="#fcb94fff"
                    buttonTextColor="#202020ff"
                    shadowSize="none"
                  />
                </div>

                <div className="mt-2 flex items-center justify-center gap-1.5">

                  <p
                    className="
                      text-[9px]
                      font-medium
                      text-[#aaa5a1]
                    "
                  >
                    Assistant Skignas · Produits & commandes
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}