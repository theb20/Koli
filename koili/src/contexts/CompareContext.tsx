import { createContext, useContext, useState, useCallback } from 'react'

export type CompareProduct = {
  id: number
  name: string
  brand: string
  price: number
  image: string
  category: string
  rating: number
  specs?: { label: string; value: string }[]
}

type CompareCtx = {
  list: CompareProduct[]
  add:    (p: CompareProduct) => void
  remove: (id: number) => void
  toggle: (p: CompareProduct) => void
  has:    (id: number) => boolean
  clear:  () => void
}

const Ctx = createContext<CompareCtx | null>(null)

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<CompareProduct[]>([])

  const add    = useCallback((p: CompareProduct) => setList(l => l.length < 4 && !l.find(x => x.id === p.id) ? [...l, p] : l), [])
  const remove = useCallback((id: number) => setList(l => l.filter(x => x.id !== id)), [])
  const toggle = useCallback((p: CompareProduct) => setList(l => l.find(x => x.id === p.id) ? l.filter(x => x.id !== p.id) : l.length < 4 ? [...l, p] : l), [])
  const has    = useCallback((id: number) => list.some(x => x.id === id), [list])
  const clear  = useCallback(() => setList([]), [])

  return <Ctx.Provider value={{ list, add, remove, toggle, has, clear }}>{children}</Ctx.Provider>
}

export function useCompare() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCompare must be inside CompareProvider')
  return ctx
}
