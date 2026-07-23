import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  icon?: ReactNode
  isLoading?: boolean
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[#1E90FF] text-white hover:bg-[#1a7fe0]',
  secondary: 'bg-white text-[#0a0a0b] border border-[#e8e8e4] hover:border-[#1E90FF]/40',
  danger: 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100',
  ghost: 'text-[#0a0a0b] hover:bg-[#f0f0ed]',
}

export function Button({
  variant = 'primary',
  icon,
  isLoading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
