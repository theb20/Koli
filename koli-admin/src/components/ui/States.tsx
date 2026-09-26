import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, RotateCw } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './Button'

/** Bloc gris animé — placeholder de chargement */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-input bg-muted-fill', className)} aria-hidden />
}

/** Squelette générique d'une carte (titre + contenu) */
export function CardSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('bg-card border border-line rounded-card p-[22px] space-y-3', className)} role="status" aria-label="Chargement">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-3 w-24" />
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
    </div>
  )
}

export function EmptyState({ icon, title, text, action, className }: {
  icon?: ReactNode; title: string; text?: string; action?: ReactNode; className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 px-6', className)}>
      <div className="w-12 h-12 rounded-cta bg-muted-fill text-muted flex items-center justify-center mb-4">{icon ?? <Inbox size={22} />}</div>
      <p className="text-body font-medium text-ink">{title}</p>
      {text && <p className="text-secondary text-muted mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ text = 'Impossible de charger ces données.', onRetry, className }: {
  text?: string; onRetry?: () => void; className?: string
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center text-center py-10 px-6', className)}>
      <div className="w-12 h-12 rounded-cta bg-down-bg text-down flex items-center justify-center mb-4"><AlertTriangle size={22} /></div>
      <p className="text-body font-medium text-ink">Une erreur est survenue</p>
      <p className="text-secondary text-muted mt-1 max-w-sm">{text}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" icon={<RotateCw size={13} />} onClick={onRetry}>Réessayer</Button>}
    </div>
  )
}
