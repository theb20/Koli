import { cn } from '../../lib/cn'

/** Avatar rond (photo ou initiales) avec pastille de statut optionnelle. */
export function Avatar({ name, src, size = 32, online, className }: {
  name: string; src?: string | null; size?: number; online?: boolean; className?: string
}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('')
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      {src
        ? <img src={src} alt="" className="w-full h-full rounded-full object-cover" />
        : (
          <span className="w-full h-full rounded-full bg-lime text-on-lime flex items-center justify-center font-semibold"
            style={{ fontSize: Math.round(size * 0.38) }} aria-hidden>
            {initials || '?'}
          </span>
        )}
      {online && <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-online ring-2 ring-card" aria-label="En ligne" />}
    </span>
  )
}
