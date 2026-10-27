import { createElement, useEffect, useRef, useSyncExternalStore } from 'react'

/* ─────────────────────────────────────────────────────────────
   Texte qui « se vaporise » en particules puis laisse place à la phrase
   suivante, en boucle. Adapté du composant VaporizeTextCycle (21st.dev) :
   même effet de particules, réécrit pour ce projet —
   - taille de police calculée pour que la phrase la plus longue tienne
     dans la largeur disponible (le canvas ne passe pas à la ligne) ;
   - attend le chargement de la police avant de dessiner ;
   - boucle d'animation hors React (aucun setState à chaque image), en
     pause quand le texte est hors écran ;
   - « réduire les animations » : texte normal, sans canvas ;
   - balise sémantique réelle (h1…) lisible par les moteurs et les
     lecteurs d'écran, le canvas étant purement décoratif.
───────────────────────────────────────────────────────────── */

type Tag = 'h1' | 'h2' | 'h3' | 'p'

type Props = {
  texts: string[]
  font?: {
    fontFamily?: string
    fontWeight?: number
    /** Taille maximale (px) ; réduite si la phrase la plus longue ne tient pas. */
    maxFontSize?: number
    minFontSize?: number
  }
  /** rgb(r, g, b) */
  color?: string
  /** Distance de dispersion des particules (1 à 10). */
  spread?: number
  /** Part des particules animées (0 à 10) ; les autres s'éteignent vite. */
  density?: number
  animation?: {
    vaporizeDuration?: number
    fadeInDuration?: number
    /** Temps d'affichage d'une phrase avant qu'elle se vaporise (s). */
    waitDuration?: number
  }
  direction?: 'left-to-right' | 'right-to-left'
  alignment?: 'left' | 'center' | 'right'
  lineHeight?: number
  tag?: Tag
  /** Classes de la balise texte affichée quand l'animation est désactivée. */
  fallbackClassName?: string
}

type Particle = {
  x: number
  y: number
  originalX: number
  originalY: number
  opacity: number
  originalAlpha: number
  velocityX: number
  velocityY: number
  speed: number
  shouldFadeQuickly: boolean
}

type Bounds = { left: number; right: number; width: number }

const REDUCED = '(prefers-reduced-motion: reduce)'
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    cb => { const m = window.matchMedia(REDUCED); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  )
}

export default function VaporizeTextCycle({
  texts,
  font = {},
  color = 'rgb(255, 255, 255)',
  spread = 5,
  density = 5,
  animation = {},
  direction = 'left-to-right',
  alignment = 'center',
  lineHeight = 1.25,
  tag = 'p',
  fallbackClassName = '',
}: Props) {
  const reduced = useReducedMotion()
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Configuration sérialisée : l'animation ne redémarre que si elle change vraiment
  // (les props objets/tableaux sont recréées à chaque rendu du parent).
  const config = JSON.stringify({ texts, font, color, spread, density, animation, direction, alignment, lineHeight })

  useEffect(() => {
    if (reduced) return
    const wrapper = wrapperRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })
    if (!wrapper || !canvas || !ctx) return

    const cfg = JSON.parse(config) as Required<Pick<Props, 'texts' | 'color' | 'spread' | 'density' | 'direction' | 'alignment' | 'lineHeight'>> & {
      font: NonNullable<Props['font']>; animation: NonNullable<Props['animation']>
    }
    const family = cfg.font.fontFamily ?? 'sans-serif'
    const weight = cfg.font.fontWeight ?? 400
    const maxSize = cfg.font.maxFontSize ?? 72
    const minSize = cfg.font.minFontSize ?? 28
    const VAPORIZE_MS = (cfg.animation.vaporizeDuration ?? 2) * 1000
    const FADE_IN_MS = (cfg.animation.fadeInDuration ?? 1) * 1000
    const WAIT_MS = (cfg.animation.waitDuration ?? 0.5) * 1000
    const densityRatio = transformValue(cfg.density, [0, 10], [0.3, 1], true)
    const baseColor = parseColor(cfg.color)
    // Suréchantillonnage (comme l'original : DPR × 1,5), plafonné pour les écrans très denses.
    const dpr = Math.min(window.devicePixelRatio || 1, 2) * 1.5

    let index = 0
    let phase: 'waiting' | 'vaporizing' | 'fadingIn' = 'waiting'
    let phaseTime = 0
    let progress = 0
    let particles: Particle[] = []
    let bounds: Bounds = { left: 0, right: 0, width: 0 }
    let fontPx = maxSize
    let spreadPx = 0
    let visible = true
    let alive = true
    let raf = 0
    let last = 0
    let width = 0

    /** Taille qui fait tenir la phrase la plus longue, puis hauteur du bloc. */
    function layout() {
      width = wrapper!.clientWidth
      if (!width) return
      ctx!.font = `${weight} 100px ${family}`
      const widest = Math.max(...cfg.texts.map(t => ctx!.measureText(t).width), 1)
      fontPx = Math.max(minSize, Math.min(maxSize, (width * 0.97) / widest * 100))
      spreadPx = calculateVaporizeSpread(fontPx) * cfg.spread
      const height = Math.ceil(fontPx * cfg.lineHeight)
      wrapper!.style.height = `${height}px`
      canvas!.style.width = `${width}px`
      canvas!.style.height = `${height}px`
      canvas!.width = Math.floor(width * dpr)
      canvas!.height = Math.floor(height * dpr)
      build()
    }

    /** Dessine la phrase courante, l'échantillonne en particules, puis efface. */
    function build() {
      const text = cfg.texts[index] ?? ''
      const c = canvas!
      ctx!.clearRect(0, 0, c.width, c.height)
      ctx!.fillStyle = baseColor
      ctx!.font = `${weight} ${fontPx * dpr}px ${family}`
      ctx!.textAlign = cfg.alignment
      ctx!.textBaseline = 'middle'
      const x = cfg.alignment === 'center' ? c.width / 2 : cfg.alignment === 'left' ? 0 : c.width
      const w = ctx!.measureText(text).width
      const left = cfg.alignment === 'center' ? x - w / 2 : cfg.alignment === 'left' ? x : x - w
      bounds = { left, right: left + w, width: w }
      ctx!.fillText(text, x, c.height / 2)

      const data = ctx!.getImageData(0, 0, c.width, c.height).data
      const sampleRate = Math.max(1, Math.round(dpr / 3))
      const next: Particle[] = []
      for (let y = 0; y < c.height; y += sampleRate) {
        for (let px = 0; px < c.width; px += sampleRate) {
          const alpha = data[(y * c.width + px) * 4 + 3]!
          if (alpha === 0) continue
          const originalAlpha = (alpha / 255) * (sampleRate / dpr)
          next.push({ x: px, y, originalX: px, originalY: y, opacity: originalAlpha, originalAlpha, velocityX: 0, velocityY: 0, speed: 0, shouldFadeQuickly: false })
        }
      }
      particles = next
      ctx!.clearRect(0, 0, c.width, c.height)
    }

    /** Une seule couleur : fillStyle fixé une fois, seule l'opacité varie (bien plus rapide). */
    function draw(fade = 1) {
      const c = canvas!
      ctx!.clearRect(0, 0, c.width, c.height)
      ctx!.save()
      ctx!.scale(dpr, dpr)
      ctx!.fillStyle = baseColor
      for (const p of particles) {
        const o = p.opacity * fade
        if (o <= 0) continue
        ctx!.globalAlpha = Math.min(1, o)
        ctx!.fillRect(p.x / dpr, p.y / dpr, 1, 1)
      }
      ctx!.restore()
    }

    function tick(now: number) {
      if (!alive) return
      raf = requestAnimationFrame(tick)
      if (!visible || !particles.length) { last = now; return }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      last = now
      phaseTime += dt * 1000

      if (phase === 'waiting') {
        draw()
        if (phaseTime >= WAIT_MS) { phase = 'vaporizing'; phaseTime = 0; progress = 0 }
      } else if (phase === 'vaporizing') {
        progress = Math.min(100, progress + (dt * 100) / (VAPORIZE_MS / 1000))
        const vx = cfg.direction === 'left-to-right'
          ? bounds.left + (bounds.width * progress) / 100
          : bounds.right - (bounds.width * progress) / 100
        const done = updateParticles(particles, vx, dt, spreadPx, VAPORIZE_MS, cfg.direction, densityRatio)
        draw()
        if (progress >= 100 && done) {
          index = (index + 1) % cfg.texts.length
          build()
          phase = 'fadingIn'; phaseTime = 0
        }
      } else {
        const f = Math.min(1, phaseTime / FADE_IN_MS)
        draw(f)
        if (f >= 1) { phase = 'waiting'; phaseTime = 0 }
      }
    }

    // La police doit être chargée avant l'échantillonnage, sinon les
    // particules prennent la forme de la police de secours.
    const fontReady = document.fonts?.load(`${weight} ${maxSize}px ${family}`).catch(() => undefined) ?? Promise.resolve()
    fontReady.then(() => {
      if (!alive) return
      layout()
      raf = requestAnimationFrame(tick)
    })

    const ro = new ResizeObserver(() => {
      if (wrapper.clientWidth !== width) layout()
    })
    ro.observe(wrapper)
    const io = new IntersectionObserver(([e]) => { visible = e?.isIntersecting ?? true }, { rootMargin: '50px' })
    io.observe(wrapper)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [config, reduced])

  const label = texts.join(' ')

  if (reduced) return createElement(tag, { className: fallbackClassName }, label)

  return (
    <div ref={wrapperRef} className="relative w-full" style={{ pointerEvents: 'none' }}>
      <canvas ref={canvasRef} aria-hidden="true" className="block" />
      {createElement(tag, { className: 'sr-only' }, label)}
    </div>
  )
}

/* ── Physique des particules (inchangée par rapport à l'original) ── */

function updateParticles(particles: Particle[], vaporizeX: number, dt: number, spread: number, duration: number, direction: string, density: number): boolean {
  let allGone = true
  for (const p of particles) {
    const reached = direction === 'left-to-right' ? p.originalX <= vaporizeX : p.originalX >= vaporizeX
    if (!reached) { allGone = false; continue }

    if (p.speed === 0) {
      const angle = Math.random() * Math.PI * 2
      p.speed = (Math.random() + 0.5) * spread
      p.velocityX = Math.cos(angle) * p.speed
      p.velocityY = Math.sin(angle) * p.speed
      p.shouldFadeQuickly = Math.random() > density
    }

    if (p.shouldFadeQuickly) {
      p.opacity = Math.max(0, p.opacity - dt)
    } else {
      const dx = p.originalX - p.x
      const dy = p.originalY - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const damping = Math.max(0.95, 1 - dist / (100 * spread))
      const jitter = spread * 3
      p.velocityX = (p.velocityX + (Math.random() - 0.5) * jitter + dx * 0.002) * damping
      p.velocityY = (p.velocityY + (Math.random() - 0.5) * jitter + dy * 0.002) * damping
      const maxV = spread * 2
      const v = Math.sqrt(p.velocityX * p.velocityX + p.velocityY * p.velocityY)
      if (v > maxV) { p.velocityX *= maxV / v; p.velocityY *= maxV / v }
      p.x += p.velocityX * dt * 20
      p.y += p.velocityY * dt * 10
      p.opacity = Math.max(0, p.opacity - dt * 0.25 * (2000 / duration))
    }
    if (p.opacity > 0.01) allGone = false
  }
  return allGone
}

function calculateVaporizeSpread(fontSize: number): number {
  const points = [{ size: 20, spread: 0.2 }, { size: 50, spread: 0.5 }, { size: 100, spread: 1.5 }]
  if (fontSize <= points[0]!.size) return points[0]!.spread
  if (fontSize >= points[2]!.size) return points[2]!.spread
  const i = fontSize < points[1]!.size ? 0 : 1
  const a = points[i]!, b = points[i + 1]!
  return a.spread + ((fontSize - a.size) * (b.spread - a.spread)) / (b.size - a.size)
}

function parseColor(color: string): string {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return m ? `rgb(${m[1]}, ${m[2]}, ${m[3]})` : 'rgb(255, 255, 255)'
}

function transformValue(input: number, [inMin, inMax]: number[], [outMin, outMax]: number[], clamp = false): number {
  const r = outMin! + ((input - inMin!) / (inMax! - inMin!)) * (outMax! - outMin!)
  return clamp ? Math.min(Math.max(r, Math.min(outMin!, outMax!)), Math.max(outMin!, outMax!)) : r
}
