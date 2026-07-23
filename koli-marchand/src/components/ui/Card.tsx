import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-[#e8e8e4] rounded-2xl ${onClick ? 'cursor-pointer hover:border-[#1E90FF]/40 transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
