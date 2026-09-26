import type { ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../ui/Button'

type Props = {
  title: string
  subtitle?: ReactNode
  /** CTA principal (vert forêt, icône +) */
  cta?: { label: string; onClick: () => void; icon?: ReactNode }
  /** Actions secondaires (boutons blancs bordés), à gauche du CTA */
  actions?: ReactNode
}

/** En-tête commun : titre 30px, sous-titre 14px, CTA à droite. */
export function PageHeader({ title, subtitle, cta, actions }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7">
      <div className="min-w-0">
        <h1 className="text-page-title font-medium text-ink leading-tight tracking-tight break-words">{title}</h1>
        {subtitle && <p className="text-body text-ink-2 mt-1">{subtitle}</p>}
      </div>
      {(actions || cta) && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 [&>*]:max-sm:flex-1">
          {actions}
          {cta && (
            <Button size="cta" onClick={cta.onClick} icon={cta.icon ?? <Plus size={16} />} className="max-sm:w-full">
              {cta.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
