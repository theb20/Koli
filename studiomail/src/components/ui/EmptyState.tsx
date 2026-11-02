import type { LucideIcon } from 'lucide-react'

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-12 h-12 rounded-xl bg-accent-dim text-accent flex items-center justify-center mb-3.5">
        <Icon size={20} />
      </div>
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="text-[13px] text-ink-dim mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
