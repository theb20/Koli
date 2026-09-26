export type Slice = { key: string; label: string; value: number; color: string }

/** Donut SVG (anneau), avec total au centre. */
export function DonutChart({ slices, size = 148, thickness = 18, center }: { slices: Slice[]; size?: number; thickness?: number; center?: React.ReactNode }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const r = (size - thickness) / 2, c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted-fill)" strokeWidth={thickness} />
        {total > 0 && slices.map(s => {
          const len = (s.value / total) * c
          const el = (
            <circle key={s.key} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          )
          offset += len
          return el
        })}
      </svg>
      {center && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  )
}
