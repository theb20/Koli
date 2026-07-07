import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Search, X, TrendingUp, ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchProducts } from '../../lib/api'

const TRENDING = ['Montre', 'Écouteurs', 'Skincare', 'Gaming', 'Sport']

type ApiResult = {
  id: number; name: string; brand: string; category: string
  price: number; images: { url: string }[]
}

const CATEGORY_LABELS: Record<string, string> = {
  hightech: 'High-Tech', maison: 'Maison', beaute: 'Beauté',
  sport: 'Sport', mode: 'Mode', jeux: 'Jeux',
}

function formatPrice(n: number) {
  return Math.round(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'
}

export default function UltraSearchBar() {
  const [focused,     setFocused]     = useState(false)
  const [value,       setValue]       = useState('')
  const [query,       setQuery]       = useState('')   // debounced
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const isOpen = focused || value.length > 0

  /* Debounce query 250ms */
  useEffect(() => {
    const t = setTimeout(() => setQuery(value), 250)
    return () => clearTimeout(t)
  }, [value])

  const { data, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn:  () => fetchProducts({ q: query, limit: 6 }),
    enabled:  query.length >= 2,
    staleTime: 30_000,
  })

  const results: ApiResult[] = query.length >= 2
    ? (data?.data?.products ?? []).map(p => ({
        id:       p.id,
        name:     p.name,
        brand:    p.brand,
        category: p.category,
        price:    p.price,
        images:   p.images ?? [],
      }))
    : []

  /* Close on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false); setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setFocused(false); setValue(''); setActiveIndex(-1) }
    if (e.key === 'ArrowDown')  setActiveIndex(v => Math.min(v + 1, results.length - 1))
    if (e.key === 'ArrowUp')    setActiveIndex(v => Math.max(v - 1, 0))
    if (e.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]) {
        navigate(`/catalogue/${results[activeIndex].id}`)
        setValue(''); setFocused(false)
      } else if (value.trim()) {
        navigate(`/catalogue?q=${encodeURIComponent(value.trim())}`)
        setValue(''); setFocused(false)
      }
    }
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <div className={`flex items-center gap-2 h-11 px-3 bg-white border rounded-xl transition-all duration-200 ${
        isOpen ? 'border-gray-300 shadow-md ring-2 ring-gray-100' : 'border-gray-200 shadow-sm'
      }`}>
        {isFetching
          ? <Loader2 size={17} className="text-gray-400 shrink-0 animate-spin" />
          : <Search size={17} className="text-gray-400 shrink-0" />}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => { setValue(e.target.value); setActiveIndex(-1) }}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          placeholder="Rechercher un produit..."
          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400 min-w-0"
        />

        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              onClick={() => { setValue(''); setQuery(''); inputRef.current?.focus() }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors shrink-0">
              <X size={12} className="text-gray-500" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-[60]">

            {/* Tendances */}
            {!value && (
              <div className="p-4 border-b border-gray-50">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  <TrendingUp size={12} /> Tendances
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TRENDING.map(item => (
                    <button key={item}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setValue(item); inputRef.current?.focus() }}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-100 rounded-full hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all">
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Résultats API */}
            {value && (
              <div className="p-2">
                {isFetching && query.length >= 2 ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 size={20} className="animate-spin text-gray-300" />
                  </div>
                ) : results.length > 0 ? (
                  <>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">Résultats</p>
                    {results.map((p, i) => (
                      <button key={p.id}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => { navigate(`/catalogue/${p.id}`); setValue(''); setFocused(false) }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-left ${
                          activeIndex === i ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                            {p.images[0]?.url
                              ? <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                              : <Search size={13} className="text-gray-400 m-auto mt-2" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.name}</p>
                            <p className="text-[11px] text-gray-400">{CATEGORY_LABELS[p.category] ?? p.category}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0 ml-2">
                          {formatPrice(p.price)}
                        </span>
                      </button>
                    ))}
                  </>
                ) : query.length >= 2 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-gray-400">Aucun résultat pour &laquo; {value} &raquo;</p>
                    <p className="text-xs text-gray-300 mt-1">Essayez un terme plus général</p>
                  </div>
                ) : null}
              </div>
            )}

            <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                {results.length > 0
                  ? `${results.length} résultat${results.length > 1 ? 's' : ''}`
                  : value.length >= 2 ? 'Aucun résultat' : 'Tapez pour chercher'}
              </span>
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => { navigate(`/catalogue?q=${encodeURIComponent(value)}`); setValue(''); setFocused(false) }}
                className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                Voir tout le catalogue <ArrowRight size={11} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
