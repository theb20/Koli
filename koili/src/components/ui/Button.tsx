import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'deal'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-md transition-all duration-200 cursor-pointer select-none tracking-wide',
        {
          'bg-brand text-white hover:bg-brand-dark shadow-sm hover:shadow-md': variant === 'primary',
          'border-2 border-ink text-ink hover:bg-ink hover:text-white': variant === 'outline',
          'text-brand hover:bg-brand-light': variant === 'ghost',
          'bg-deal text-white hover:bg-amber-700 shadow-sm': variant === 'deal',
          'px-3.5 py-1.5 text-xs gap-1.5': size === 'sm',
          'px-5 py-2.5 text-sm gap-2': size === 'md',
          'px-7 py-3 text-sm gap-2': size === 'lg',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
