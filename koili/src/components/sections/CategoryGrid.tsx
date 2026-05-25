import { Link } from 'react-router-dom'
import { CATEGORIES } from '../../constants/categories'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'
import type { CategoryCard } from '../../types'

function CategoryCard({ card }: { card: CategoryCard }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-sm flex flex-col justify-between p-5',
        card.colSpan === 2 ? 'col-span-2' : 'col-span-1'
      )}
      style={{ backgroundColor: card.bg, height: '210px' }}
    >
      <span
        className={cn(
          'absolute bottom-0 left-0 font-black select-none pointer-events-none leading-[0.8] tracking-tight',
          card.textLight ? 'text-white/20' : 'text-black/10'
        )}
        style={{ fontSize: '90px' }}
      >
        {card.bigText}
      </span>

      <span
        className="absolute right-4 bottom-3 select-none pointer-events-none"
        style={{ fontSize: '72px', lineHeight: 1 }}
      >
        {card.emoji}
      </span>

      <div className="relative z-10">
        <p className={cn('text-xs font-medium', card.textLight ? 'text-white/70' : 'text-gray-500')}>
          {card.label}
        </p>
        {card.title && (
          <h3 className={cn('text-lg font-bold mt-0.5', card.textLight ? 'text-white' : 'text-gray-900')}>
            {card.title}
          </h3>
        )}
      </div>

      <div className="relative z-10">
        <Link to={`/shop?category=${card.id}`}>
          <Button size="sm" variant={card.buttonVariant}>
            Browse
          </Button>
        </Link>
      </div>
    </div>
  )
}

export function CategoryGrid() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-4 gap-3">
        {CATEGORIES.map((card) => (
          <CategoryCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  )
}
