export function QuantitySelector({ qty, max, onChange }: {
  qty: number
  max: number
  onChange: (qty: number) => void
}) {
  return (
    <div className="flex items-center border border-border rounded-lg overflow-hidden h-9">
      <button
        onClick={() => onChange(Math.max(1, qty - 1))}
        aria-label="Diminuer la quantité"
        className="w-9 h-9 flex items-center justify-center text-ink hover:bg-base transition text-lg font-light"
      >
        −
      </button>
      <span className="w-9 text-center text-sm font-semibold text-ink" aria-live="polite">{qty}</span>
      <button
        onClick={() => onChange(Math.min(max, qty + 1))}
        aria-label="Augmenter la quantité"
        className="w-9 h-9 flex items-center justify-center text-ink hover:bg-base transition text-lg font-light"
      >
        +
      </button>
    </div>
  )
}
