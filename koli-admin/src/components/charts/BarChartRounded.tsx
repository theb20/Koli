import { useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '../../lib/cn'

export type Bar = { key: string; label: string; value: number; tooltip: React.ReactNode }

type Props = {
  bars: Bar[]
  selected: string
  onSelect: (key: string) => void
  current?: string            // libellé en gras (mois courant)
  average?: { value: number; label: string }
  height?: number
  ariaLabel: string
}

/**
 * Barres arrondies de la maquette : piste grise à hauteur proportionnelle
 * (% du maximum affiché en haut), barre sélectionnée en corail avec une
 * tranche basse plus sombre (relief), ligne de moyenne en pointillés et
 * fanion vert. Survol → corail + infobulle ; clic → sélection.
 */
export function BarChartRounded({ bars, selected, onSelect, current, average, height = 170, ariaLabel }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const max = Math.max(1, ...bars.map(b => b.value))
  const pct = (v: number) => Math.round((v / max) * 100)
  const avgPct = average ? Math.min(100, (average.value / max) * 100) : null

  return (
    <div role="group" aria-label={ariaLabel}>
      <div className="relative" style={{ height }}>
        {avgPct !== null && average && (
          <div className="absolute inset-x-0 z-10 pointer-events-none" style={{ bottom: `${avgPct}%` }} aria-hidden>
            <div className="border-t border-dashed" style={{ borderColor: 'var(--text-muted)', opacity: 0.6, borderTopWidth: 1 }} />
            <span className="absolute left-0 -translate-y-1/2 flex items-center">
              <span className="h-5 pl-1.5 pr-1 flex items-center bg-primary text-on-primary text-micro font-semibold whitespace-nowrap rounded-l-[3px]">{average.label}</span>
              <svg width="7" height="20" viewBox="0 0 7 20" className="text-primary"><path d="M0 0h1l6 10-6 10H0z" fill="currentColor" /></svg>
            </span>
          </div>
        )}
        <div className="absolute inset-0 grid gap-2" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
          {bars.map((b, i) => {
            const active = b.key === selected || b.key === hover
            const h = Math.max(pct(b.value), 8)
            return (
              <div key={b.key} className="relative flex items-end justify-center">
                <motion.button type="button"
                  onClick={() => onSelect(b.key)} onMouseEnter={() => setHover(b.key)} onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(b.key)} onBlur={() => setHover(null)}
                  aria-pressed={b.key === selected} aria-label={`${b.label} : ${pct(b.value)} % du meilleur mois`}
                  initial={{ height: 0 }} animate={{ height: `${h}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.04 }}
                  className={cn(
                    'relative w-full max-w-[56px] rounded-cta overflow-hidden transition-colors duration-150',
                    active ? 'bg-coral' : 'bg-muted-fill hover:bg-hover-fill',
                  )}>
                  {active && <span className="absolute inset-x-0 bottom-0 h-1.5 bg-coral-dark" aria-hidden />}
                  <span className={cn('absolute inset-x-0 top-2.5 text-center text-caption tabular', active ? 'text-white font-medium' : 'text-ink-2')}>
                    {pct(b.value)}%
                  </span>
                </motion.button>
                {hover === b.key && (
                  <div role="tooltip"
                    className={cn('absolute bottom-full mb-2 z-20 min-w-[168px] rounded-nav border border-line bg-card shadow-popover px-3 py-2.5 text-caption',
                      i < bars.length / 2 ? 'left-0' : 'right-0')}>
                    {b.tooltip}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}>
        {bars.map(b => (
          <span key={b.key} className={cn('text-center text-secondary', b.key === current ? 'text-ink font-semibold' : 'text-muted')}>{b.label}</span>
        ))}
      </div>
    </div>
  )
}
