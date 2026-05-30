import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
type Size    = 'xs' | 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const variants: Record<Variant, string> = {
  primary:   'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300',
  danger:    'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200',
  ghost:     'hover:bg-slate-100 text-slate-600 hover:text-slate-900',
  success:   'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200',
}

const sizes: Record<Size, string> = {
  xs: 'px-2.5 py-1 text-xs gap-1.5',
  sm: 'px-3 py-1.5 text-sm gap-2',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2.5',
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className = '', disabled, ...props }: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
