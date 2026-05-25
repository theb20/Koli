import { cn } from '../../lib/utils'

interface BadgeProps {
  count: number
  className?: string
}

export function Badge({ count, className }: BadgeProps) {
  if (count === 0) return null
  return (
    <span
      className={cn(
        'absolute -top-2 -right-2 bg-brand text-white text-[9px] font-bold min-w-[16px] h-4 flex items-center justify-center rounded-full px-1 leading-none',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
