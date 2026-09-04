import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from './Icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  loading?: boolean
  icon?: ReactNode
}

const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-dark disabled:bg-brand/50',
  secondary: 'bg-white text-ink border border-border hover:bg-gray-50 disabled:opacity-50',
  ghost: 'bg-transparent text-ink hover:bg-gray-100 disabled:opacity-50',
  danger: 'bg-white text-danger border border-red-200 hover:bg-red-50 disabled:opacity-50',
}
const SIZES = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2' }

export function Button({ variant = 'primary', size = 'md', loading, icon, className = '', children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-colors ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
