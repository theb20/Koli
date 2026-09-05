import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

interface TrueFocusProps {
  sentence?: string
  manualMode?: boolean
  blurAmount?: number
  borderColor?: string
  glowColor?: string
  animationDuration?: number
  pauseBetweenAnimations?: number
  className?: string
}

interface FocusRect {
  x: number
  y: number
  width: number
  height: number
}

const TrueFocus = ({
  sentence = 'True Focus',
  manualMode = false,
  blurAmount = 5,
  borderColor = 'green',
  glowColor = 'rgba(0, 255, 0, 0.6)',
  animationDuration = 0.5,
  pauseBetweenAnimations = 1,
  className = '',
}: TrueFocusProps) => {
  const words = sentence.split(' ')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [lastActiveIndex, setLastActiveIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [focusRect, setFocusRect] = useState<FocusRect>({ x: 0, y: 0, width: 0, height: 0 })

  useEffect(() => {
    if (manualMode) return
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % words.length)
    }, (animationDuration + pauseBetweenAnimations) * 1000)
    return () => clearInterval(interval)
  }, [manualMode, animationDuration, pauseBetweenAnimations, words.length])

  useEffect(() => {
    const activeEl = wordRefs.current[currentIndex]
    if (!activeEl || !containerRef.current) return
    const parentRect = containerRef.current.getBoundingClientRect()
    const activeRect = activeEl.getBoundingClientRect()
    setFocusRect({
      x: activeRect.left - parentRect.left,
      y: activeRect.top - parentRect.top,
      width: activeRect.width,
      height: activeRect.height,
    })
  }, [currentIndex, words.length])

  const handleMouseEnter = (index: number) => {
    if (!manualMode) return
    setLastActiveIndex(index)
    setCurrentIndex(index)
  }

  const handleMouseLeave = () => {
    if (!manualMode) return
    setCurrentIndex(lastActiveIndex ?? 0)
  }

  return (
    <div ref={containerRef} className={`relative flex flex-wrap items-center gap-x-[0.3em] gap-y-1 ${className}`}>
      {words.map((word, index) => {
        const isActive = index === currentIndex
        return (
          <span
            key={index}
            ref={el => { wordRefs.current[index] = el }}
            className="relative inline-block cursor-pointer"
            style={{
              filter: isActive ? 'blur(0px)' : `blur(${blurAmount}px)`,
              transition: `filter ${animationDuration}s ease`,
            }}
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            {word}
          </span>
        )
      })}

      <motion.div
        className="absolute top-0 left-0 pointer-events-none box-border"
        animate={{
          x: focusRect.x,
          y: focusRect.y,
          width: focusRect.width,
          height: focusRect.height,
          opacity: focusRect.width > 0 ? 1 : 0,
        }}
        transition={{ duration: animationDuration }}
      >
        <span
          className="absolute -top-2.5 -left-2.5 w-4 h-4 border-r-0 border-b-0 rounded-[3px]"
          style={{ borderStyle: 'solid', borderWidth: 3, borderColor, filter: `drop-shadow(0 0 4px ${glowColor})` }}
        />
        <span
          className="absolute -top-2.5 -right-2.5 w-4 h-4 border-l-0 border-b-0 rounded-[3px]"
          style={{ borderStyle: 'solid', borderWidth: 3, borderColor, filter: `drop-shadow(0 0 4px ${glowColor})` }}
        />
        <span
          className="absolute -bottom-2.5 -left-2.5 w-4 h-4 border-r-0 border-t-0 rounded-[3px]"
          style={{ borderStyle: 'solid', borderWidth: 3, borderColor, filter: `drop-shadow(0 0 4px ${glowColor})` }}
        />
        <span
          className="absolute -bottom-2.5 -right-2.5 w-4 h-4 border-l-0 border-t-0 rounded-[3px]"
          style={{ borderStyle: 'solid', borderWidth: 3, borderColor, filter: `drop-shadow(0 0 4px ${glowColor})` }}
        />
      </motion.div>
    </div>
  )
}

export default TrueFocus
