import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Search, X, TrendingUp, ArrowRight } from 'lucide-react'

const TRENDING = ['Airpods', 'Montres', 'LED', 'Skincare', 'Gaming setup']

const MOCK_PRODUCTS = [
  { name: 'AirPods Pro',       category: 'High-Tech',  price: '29 990 FCFA' },
  { name: 'Smart Watch Ultra', category: 'High-Tech',  price: '19 990 FCFA' },
  { name: 'LED Strip RGB',     category: 'Maison',     price: '9 990 FCFA'  },
  { name: 'Mini Caméra 4K',    category: 'High-Tech',  price: '24 990 FCFA' },
]

/* ─────────────────────────────────────────
   SEARCH BAR — responsive (desktop + mobile drawer)
───────────────────────────────────────── */
export default function UltraSearchBar() {
  const [focused, setFocused]   = useState(false)
  const [value, setValue]       = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef  = useRef<HTMLInputElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)

  const isOpen = focused || value.length > 0

  const filtered = value.length > 0
    ? MOCK_PRODUCTS.filter(p => p.name.toLowerCase().includes(value.toLowerCase()))
    : []

  /* Ferme quand on clique en dehors */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* Keyboard nav */
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape')     { setFocused(false); setValue(''); setActiveIndex(-1) }
    if (e.key === 'ArrowDown')  setActiveIndex(v => Math.min(v + 1, filtered.length - 1))
    if (e.key === 'ArrowUp')    setActiveIndex(v => Math.max(v - 1, 0))
  }

  return (
    <div ref={wrapRef} className="relative w-full">

      {/* ───── Input row ───── */}
      <div
        className={`
          flex items-center gap-2 h-11 px-3
          bg-white border rounded-xl
          transition-all duration-200
          ${isOpen
            ? 'border-gray-300 shadow-md ring-2 ring-gray-100'
            : 'border-gray-200 shadow-sm'
          }
        `}
      >
        {/* Icon */}
        <Search size={17} className="text-gray-400 shrink-0" />

        {/* Input — toujours visible, full width */}
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

        {/* Clear */}
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              onClick={() => { setValue(''); inputRef.current?.focus() }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
            >
              <X size={12} className="text-gray-500" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ───── Dropdown ───── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="
              absolute left-0 right-0 top-full mt-2
              bg-white border border-gray-100
              rounded-2xl shadow-xl overflow-hidden z-[60]
            "
          >

            {/* Tendances (quand input vide) */}
            {!value && (
              <div className="p-4 border-b border-gray-50">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  <TrendingUp size={12} />
                  Tendances
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {TRENDING.map(item => (
                    <button
                      key={item}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => { setValue(item); inputRef.current?.focus() }}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-50 border border-gray-100 rounded-full hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Résultats */}
            {value && (
              <div className="p-2">
                {filtered.length > 0 ? (
                  <>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">
                      Résultats
                    </p>
                    {filtered.map((p, i) => (
                      <div
                        key={p.name}
                        className={`
                          flex items-center justify-between
                          px-3 py-2.5 rounded-xl cursor-pointer transition-colors
                          ${activeIndex === i ? 'bg-gray-100' : 'hover:bg-gray-50'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
                            <Search size={13} className="text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{p.name}</p>
                            <p className="text-[11px] text-gray-400">{p.category}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0 ml-2">
                          {p.price}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-gray-400">Aucun résultat pour &laquo; {value} &raquo;</p>
                    <p className="text-xs text-gray-300 mt-1">Essayez un terme plus général</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                {filtered.length > 0
                  ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`
                  : 'Appuyez sur ↵ pour chercher'
                }
              </span>
              <button className="flex items-center gap-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                Voir tout le catalogue <ArrowRight size={11} />
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
