import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { ShareBar } from './ShareBar'

export type BreadcrumbItem = { label: string; to?: string }

export function Breadcrumb({ items, shareUrl, shareTitle }: {
  items: BreadcrumbItem[]
  shareUrl: string
  shareTitle: string
}) {
  return (
    <nav className="flex items-center justify-between gap-4 flex-wrap">
      <ol className="flex items-center gap-1.5 text-xs text-muted flex-wrap min-w-0">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <ChevronRight size={12} className="shrink-0" />}
            {item.to ? (
              <Link to={item.to} className="hover:text-ink transition-colors shrink-0">
                {item.label}
              </Link>
            ) : (
              <span className="text-ink font-medium truncate max-w-[220px]">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
      <ShareBar url={shareUrl} title={shareTitle} />
    </nav>
  )
}
