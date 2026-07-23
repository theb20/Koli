export interface FilterOption<T extends string> {
  value: T
  label: string
  count?: number
}

interface FilterPillsProps<T extends string> {
  options: FilterOption<T>[]
  value: T
  onChange: (value: T) => void
}

export function FilterPills<T extends string>({ options, value, onChange }: FilterPillsProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par statut">
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-[#1E90FF] text-white'
                : 'bg-white text-[#6b6b68] border border-[#e8e8e4] hover:border-[#1E90FF]/40'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={isActive ? 'text-white/80' : 'text-[#a3a3a1]'}>{opt.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
