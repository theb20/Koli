import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'

interface QuantitySelectorProps {
  min?: number
  defaultValue?: number
  onChange?: (value: number) => void
}

export function QuantitySelector({ min = 1, defaultValue = 1, onChange }: QuantitySelectorProps) {
  const [qty, setQty] = useState(defaultValue)

  const update = (n: number) => {
    const next = Math.max(min, n)
    setQty(next)
    onChange?.(next)
  }

  return (
    <div className="flex items-center border border-gray-200 rounded-sm h-9 w-28">
      <button
        onClick={() => update(qty - 1)}
        className="w-9 h-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Minus size={13} />
      </button>
      <span className="flex-1 text-center text-sm font-semibold text-gray-800 select-none">
        {qty}
      </span>
      <button
        onClick={() => update(qty + 1)}
        className="w-9 h-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <Plus size={13} />
      </button>
    </div>
  )
}
