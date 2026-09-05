import { useState, useRef, useEffect, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import CurvedInput from '../ui/CurvedInput'

/* ─────────────────────────────────────────────────────────────
   Widget de contact flottant — style Modernist : zéro rayon,
   filets 2px, Archivo, rouge #ec3013 en accent, libellés flush left.
   Toujours purement local (aucun backend) : une réponse générique
   s'affiche après un court délai. À brancher plus tard sans toucher
   à ce shell visuel.

   Prérequis : Archivo chargé (font-[Archivo] ci-dessous), tokens
   Modernist — bg #f3f2f2, surface #eae9e9, encre #201e1d,
   accent #ec3013 / pressé #dd2b0f, tinte #ffe0d9.
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
  text: 'Dites ce que vous cherchez — produit, commande ou livraison. Réponse immédiate.',
  time: now(),
}

const QUICK_REPLIES = ['Suivre ma commande', 'Retour ou échange', 'Un conseiller']

export function Chatbox() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  function send(text: string) {
    if (!text) return
    setMessages(m => [...m, { id: m.length, from: 'me', text, time: now() }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, {
        id: m.length,
        from: 'team',
        text: 'Message reçu. Notre équipe répond généralement sous quelques heures.',
        time: now(),
      }])
    }, 1100)
  }

  function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    send(input.trim())
  }

  return (
    <div className="font-[Archivo,system-ui,sans-serif]">
      {/* Lanceur — carré plein, libellé flush left */}
      <motion.button
        onClick={() => setIsOpen(v => !v)}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 rounded-full right-5 z-[70] w-[60px] h-[60px] bg-[#201e1d] text-[#f3f2f2] shadow-[0_3px_10px_rgba(45,43,43,0.16)] flex items-center justify-center text-[12px] font-extrabold tracking-[0.06em] hover:bg-[#ec3013] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec3013] transition-colors"
        aria-label={isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
      >
        {isOpen ? <X size={22} strokeWidth={2.5} /> : 'AIDE'}
      </motion.button>

      {/* Panneau */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="fixed bottom-[92px] right-5 z-[70] w-[390px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[72vh] bg-[#f3f2f2] shadow-[0_12px_32px_rgba(45,43,43,0.22)] flex flex-col overflow-hidden"
          >
            {/* En-tête */}
            <div className="shrink-0 flex items-center gap-3 p-4 ">
              <div className="w-9 h-9 shrink-0 bg-[#ec3013] text-white flex items-center justify-center text-[15px] font-extrabold rounded-full">S</div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold text-[#201e1d] leading-tight tracking-[-0.01em]">Skignas</p>
                <p className="text-[09px] font-semibold uppercase tracking-[0.1em] text-[#605d5d] leading-tight mt-0.5">Réponse immédiate</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Fermer"
                className="w-11 h-11 rounded-full shrink-0 text-[#201e1d] flex items-center justify-center hover:bg-[#ffe0d9] hover:border-[#ae1800] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec3013] transition-colors"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
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
                </div>
              ))}

              {/* Réponses rapides — seulement au premier tour */}
              {messages.length === 1 && !typing && (
                <div className="shrink-0 flex flex-wrap gap-2">
                  {QUICK_REPLIES.map(label => (
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

              {typing && (
                <div className="flex flex-col gap-1.5 items-start">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7d7979]">Skignas écrit</span>
                  <div className="bg-[#eae9e9] p-3.5 flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        className="w-2 h-2 bg-[#201e1d]"
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Saisie — une seule barre, divisée par des filets 2px */}
            <form onSubmit={handleSend} className="shrink-0 flex items-stretch border-t-1 border-gray-300/50">
                <CurvedInput
                value={input}
                onChange={setInput}
                onSubmit={send}
                showButton
                showIcon={true}
                placeholder="Écrivez votre message…"
                buttonText="Envoyer"
                type="text"
                bend={0}
                cornerRadius={0}
                borderWidth={2}
                fontSize={13}
                backgroundColor="#f3f2f2"
                textColor="#201e1d"
                placeholderColor="#7d7979"
                borderColor="#201e1d"
                buttonColor="#ec3013"
                buttonTextColor="#f3f2f2"
                shadowSize="sm"
                />
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
