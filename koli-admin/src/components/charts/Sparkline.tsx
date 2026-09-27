/** Mini-courbe de tendance (SVG), sans axes ni grille. */
/** tone="trend" : vert/rouge selon début → fin ; "neutral" : couleur principale. */
export function Sparkline({ values, width = 72, height = 24, className, tone = 'trend' }: { values: number[]; width?: number; height?: number; className?: string; tone?: 'trend' | 'neutral' }) {
  if (values.length < 2) return null
  const max = Math.max(1, ...values), min = Math.min(0, ...values)
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * (width - 2) + 1,
    height - 1 - ((v - min) / (max - min || 1)) * (height - 2),
  ])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x!.toFixed(1)} ${y!.toFixed(1)}`).join(' ')
  const up = values[values.length - 1]! >= values[0]!
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <path d={d} fill="none" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        stroke={tone === 'neutral' ? 'var(--primary)' : up ? 'var(--up-text)' : 'var(--down-text)'} />
    </svg>
  )
}
