import { badgeToneClasses, type BadgeTone } from '@/lib/statusMaps'

interface StatusBadgeProps {
  label: string
  tone: BadgeTone
}

export function StatusBadge({ label, tone }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${badgeToneClasses[tone]}`}
    >
      {label}
    </span>
  )
}
