import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '@/lib/api'

export interface SearchProduct {
  id: number
  name: string
  price: number
  image: string | null
}

export interface SearchOrder {
  id: string
  orderNumber: string
  status: string
  client: string
  total: number
}

export interface SearchCustomer {
  id: string
  name: string
  email: string
}

export interface GlobalSearchResult {
  products: SearchProduct[]
  orders: SearchOrder[]
  customers: SearchCustomer[]
}

/** Debounce 250ms — même délai que la recherche produit de koili. */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(t)
  }, [value, delayMs])
  return debounced
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ['seller-search', query],
    queryFn: async () => unwrap<GlobalSearchResult>(await api.get('/api/seller/search', { params: { q: query } })),
    enabled: query.trim().length >= 2,
    staleTime: 10_000,
  })
}
