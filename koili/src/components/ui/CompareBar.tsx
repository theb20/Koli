import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { X, GitCompareArrows, Trash2 } from 'lucide-react'
import { useCompare } from '../../contexts/CompareContext'

const fmt = (n: number) => Math.round(n / 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' FCFA'

export function CompareBar() {
  const { list, remove, clear } = useCompare()

  return (
    <AnimatePresence>
      {list.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 shadow-2xl"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <GitCompareArrows size={18} className="text-blue-600" />
              <span className="text-sm font-bold text-gray-900 hidden sm:block">Comparer ({list.length}/4)</span>
            </div>

            <div className="flex items-center gap-3 flex-1 overflow-x-auto">
              {list.map(p => (
                <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 shrink-0">
                  <img src={p.image} alt={p.name} className="w-10 h-10 object-cover rounded-lg" />
                  <div className="min-w-0 hidden sm:block">
                    <p className="text-xs font-semibold text-gray-800 truncate max-w-[100px]">{p.name}</p>
                    <p className="text-xs text-blue-600">{fmt(p.price)}</p>
                  </div>
                  <button onClick={() => remove(p.id)} className="text-gray-400 hover:text-red-500 transition-colors ml-1">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {Array.from({ length: 4 - list.length }).map((_, i) => (
                <div key={i} className="w-16 h-14 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center shrink-0">
                  <span className="text-gray-300 text-xs">+</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={clear} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 size={15} />
              </button>
              <Link
                to={`/comparer?ids=${list.map(p => p.id).join(',')}`}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  list.length < 2
                    ? 'bg-gray-200 text-gray-400 pointer-events-none'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Comparer
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
