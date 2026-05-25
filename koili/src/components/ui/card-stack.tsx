import { useEffect, useState } from 'react'
import { motion } from 'motion/react'

let interval: ReturnType<typeof setInterval>

export type CardStackItem = {
  id: number
  name: string
  designation: string
  content: React.ReactNode
}

export const CardStack = ({
  items,
  offset = 10,
  scaleFactor = 0.06,
}: {
  items: CardStackItem[]
  offset?: number
  scaleFactor?: number
}) => {
  const [cards, setCards] = useState<CardStackItem[]>(items)

  useEffect(() => {
    startFlipping()
    return () => clearInterval(interval)
  }, [])

  const startFlipping = () => {
    interval = setInterval(() => {
      setCards(prev => {
        const next = [...prev]
        next.unshift(next.pop()!)
        return next
      })
    }, 5000)
  }

  return (
    <div className="relative h-72 w-full md:w-[480px]">
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          className="absolute w-full h-72 bg-white rounded-3xl p-6 shadow-xl border border-gray-100 flex flex-col justify-between"
          style={{ transformOrigin: 'top center' }}
          animate={{
            top: index * -offset,
            scale: 1 - index * scaleFactor,
            zIndex: cards.length - index,
          }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Content */}
          <div className="text-neutral-700 text-sm leading-relaxed flex-1">
            {card.content}
          </div>

          {/* Author */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{card.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.designation}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

/* ── Highlight helper ── */
export const Highlight = ({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) => (
  <span className={`font-bold bg-emerald-100 text-emerald-700 px-1 py-0.5 rounded ${className}`}>
    {children}
  </span>
)
