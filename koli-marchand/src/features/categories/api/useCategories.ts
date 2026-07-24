import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

export interface Category {
  id: number
  slug: string
  name: string
}

// Catalogue de catégories réel (partagé avec koili/koli-admin) — un produit
// marchand doit être rattaché à une vraie catégorie pour apparaître dans la
// navigation par catégorie du site client, pas à un libellé inventé.
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => unwrap<Category[]>(await api.get('/api/categories')),
    staleTime: 5 * 60_000,
  })
}
