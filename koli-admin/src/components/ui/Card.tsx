import type { ReactNode } from 'react'
import { ArrowUpDown, ListFilter } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from './Button'
import { KebabMenu, type MenuItem } from './Menu'

type CardProps = { children: ReactNode; className?: string; onClick?: () => void; padded?: boolean }

/** Carte : fond blanc, rayon 18px, bordure 1px, pas d'ombre, padding 22px. */
export function Card({ children, className, onClick, padded = false }: CardProps) {
  return (
    <div onClick={onClick}
      className={cn(
        'bg-card border border-line rounded-card',
        padded && 'p-[22px]',
        onClick && 'cursor-pointer hover:border-muted transition-colors',
        className,
      )}>
      {children}
    </div>
  )
}

/** En-tête de carte : titre 20px, sous-titre (date) 13px, actions à droite. */
export function CardHeader({ title, subtitle, actions, className }: {
  title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-3 gap-y-2', className)}>
      <div className="min-w-0 flex-1 basis-[180px]">
        <h2 className="text-card-title font-medium text-ink leading-tight">{title}</h2>
        {subtitle && <p className="text-secondary text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5 shrink-0">{actions}</div>}
    </div>
  )
}

/** « ⇅ Trier », « ≡ Filtrer », ⋮ — chacun optionnel. */
export function CardHeaderActions({ onSort, onFilter, menu, sortLabel = 'Trier', filterLabel = 'Filtrer' }: {
  onSort?: () => void; onFilter?: () => void; menu?: MenuItem[]; sortLabel?: string; filterLabel?: string
}) {
  return (
    <>
      {onSort && <Button variant="subtle" size="xs" icon={<ArrowUpDown size={12} />} onClick={onSort}>{sortLabel}</Button>}
      {onFilter && <Button variant="subtle" size="xs" icon={<ListFilter size={12} />} onClick={onFilter}>{filterLabel}</Button>}
      {menu && menu.length > 0 && <KebabMenu items={menu} />}
    </>
  )
}

/* ── StatCard — conservé pour les pages existantes (avant refonte) ── */
type StatCardProps = { title: string; value: string | number; sub?: string; icon: ReactNode; trend?: number; color?: string }

export function StatCard({ title, value, sub, icon, trend }: StatCardProps) {
  return (
    <Card padded>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body text-ink-2">{title}</p>
          <p className="mt-1.5 text-kpi font-medium text-ink tabular leading-none">{value}</p>
          {sub && <p className="mt-1.5 text-caption text-muted">{sub}</p>}
          {trend !== undefined && (
            <p className={cn('mt-1.5 text-caption font-medium', trend >= 0 ? 'text-up' : 'text-down')}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs hier
            </p>
          )}
        </div>
        <div className="w-9 h-9 rounded-nav bg-muted-fill text-ink-2 flex items-center justify-center shrink-0">{icon}</div>
      </div>
    </Card>
  )
}
