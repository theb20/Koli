import { Card } from '@/components/ui/Card'
import { fmtFcfa, fmtNumber } from '@/lib/format'
import type { BestSellingProduct } from '@/types'

interface BestSellersProps {
  products: BestSellingProduct[]
}

export function BestSellers({ products }: BestSellersProps) {
  return (
    <Card className="p-5">
      <h2 className="font-bold text-[#0a0a0b] mb-4">Meilleures ventes</h2>
      <ul className="space-y-3">
        {products.map((p, i) => (
          <li key={p.productId} className="flex items-center gap-3">
            <span className="w-5 text-xs font-bold text-[#a3a3a1] shrink-0">{i + 1}</span>
            <img
              src={p.thumbnail}
              alt=""
              className="w-10 h-10 rounded-lg object-cover shrink-0 bg-[#f5f5f3]"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#0a0a0b] truncate">{p.name}</p>
              <p className="text-xs text-[#6b6b68]">{fmtNumber(p.soldCount)} vendus</p>
            </div>
            <span className="text-sm font-bold text-[#0a0a0b] shrink-0">{fmtFcfa(p.revenue)}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
