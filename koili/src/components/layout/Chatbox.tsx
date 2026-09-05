import { useState, useRef, useEffect, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MessageCircle, X, Send, Headset } from 'lucide-react'

/* ─────────────────────────────────────────────────────────────
   Widget de contact flottant — pour l'instant purement local (aucun
   backend branché) : les messages envoyés ne partent nulle part, une
   réponse générique s'affiche après un court délai pour donner un aperçu
   fidèle de l'interaction finale. À brancher plus tard (WhatsApp, chat en
   direct, ou assistant IA) sans changer ce shell visuel.
───────────────────────────────────────────────────────────── */

type Message = {
  id: number
  from: 'me' | 'team'
  text: string
  time: string
}

const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

const INITIAL_MESSAGE: Message = {
  id: 0,
  from: 'team',
  text: 'Bonjour 👋 Une question sur un produit, une commande ou une livraison ? Écrivez-nous ici.',
  time: now(),
}

export function Chatbox() {
  const [isOpen, setIsOpen]   = useState(false)
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput]     = useState('')
  const [typing, setTyping]   = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    setMessages(m => [...m, { id: m.length, from: 'me', text, time: now() }])
    setInput('')
    setTyping(true)

    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, {
        id: m.length,
        from: 'team',
        text: 'Merci pour votre message — notre équipe vous répond généralement sous quelques heures.',
        time: now(),
      }])
    }, 1100)
  }

  return (
    <>
      {/* Bouton flottant */}
      <motion.button
        onClick={() => setIsOpen(v => !v)}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-5 right-5 z-[70] w-14 h-14 rounded-full bg-[#131921] text-white shadow-xl flex items-center justify-center hover:bg-[#1c2836] transition-colors"
        aria-label={isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isOpen ? 'close' : 'open'}
            initial={{ rotate: -45, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 45, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center"
          >
            {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Panneau */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed bottom-[92px] right-5 z-[70] w-[380px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          >
            {/* En-tête */}
            <div className="bg-[#131921] px-5 py-4 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
                <Headset size={18} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight">Skignas</p>
                <p className="text-[11px] text-gray-400 leading-tight mt-0.5">Répond généralement sous quelques heures</p>
              </div>
              <button onClick={() => setIsOpen(false)}
                className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50/60">
              {messages.map(m => (
                <div key={m.id} className={`flex flex-col ${m.from === 'me' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                      m.from === 'me'
                        ? 'bg-[#131921] text-white rounded-2xl rounded-br-sm'
                        : 'bg-white text-gray-700 border border-gray-100 rounded-2xl rounded-bl-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 px-1">{m.time}</span>
                </div>
              ))}

              {typing && (
                <div className="flex items-start">
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-gray-300"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Saisie */}
            <form onSubmit={handleSend} className="border-t border-gray-100 p-3 flex gap-2 shrink-0 bg-white">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Écrivez votre message…"
                className="flex-1 h-11 px-4 rounded-xl border border-gray-200 text-sm outline-none focus:border-gray-400 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="w-11 h-11 rounded-xl bg-[#131921] text-white flex items-center justify-center shrink-0 disabled:opacity-30 hover:bg-[#1c2836] transition-colors"
                aria-label="Envoyer"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
