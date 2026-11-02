import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-110',
  secondary: 'bg-surface border border-border text-ink hover:border-border-strong',
  ghost: 'text-ink-dim hover:bg-black/5 hover:text-ink',
  danger: 'bg-danger-dim text-danger border border-danger/20 hover:bg-danger/15',
}
const sizes: Record<Size, string> = { sm: 'h-8 px-2.5 text-[13px] gap-1.5', md: 'h-9 px-3.5 text-sm gap-2' }

export function Button({ variant = 'primary', size = 'md', icon, loading, disabled, className, children, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.97]',
        variants[variant], sizes[size], className,
      )}
      {...rest}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({ className, active, title, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; title: string }) {
  return (
    <button
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150',
        active ? 'bg-accent-dim text-accent' : 'text-ink-dim hover:bg-black/5 hover:text-ink',
        className,
      )}
      {...rest}
    />
  )
}
