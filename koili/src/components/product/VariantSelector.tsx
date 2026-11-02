/**
 * Sélecteur de variantes. Deux types supportés par le design :
 * - "visual" : vignettes couleur (seul type alimenté par l'API aujourd'hui —
 *   `product.colors`, une liste de couleurs décoratives sans impact sur le
 *   prix/stock/galerie).
 * - "text" : chips texte (ex. "Série : 5 L") — aucune donnée backend
 *   n'existe encore pour ce type ; le composant est prêt à la recevoir sans
 *   changement d'API le jour où un vrai modèle de variantes existe.
 */
export type TextVariantOption = { label: string; available: boolean }
export type TextVariant = { type: 'text'; name: string; selected: string; options: TextVariantOption[]; onSelect: (label: string) => void }
export type VisualVariant = { type: 'visual'; name: string; colors: string[]; selected: number; onSelect: (index: number) => void }

export function VariantSelector(props: TextVariant | VisualVariant) {
  if (props.type === 'visual') {
    if (props.colors.length === 0) return null
    return (
      <div className="mb-5">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">{props.name}</p>
        <div className="flex items-center gap-2">
          {props.colors.map((c, i) => (
            <button
              key={i}
              onClick={() => props.onSelect(i)}
              className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 ${
                i === props.selected ? 'border-ink scale-110' : 'border-border'
              }`}
              style={{ background: c }}
              title={c}
            />
          ))}
        </div>
      </div>
    )
  }

  if (props.options.length === 0) return null
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
        {props.name} : <span className="text-ink font-bold">{props.selected}</span>
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {props.options.map(opt => (
          <button
            key={opt.label}
            disabled={!opt.available}
            onClick={() => props.onSelect(opt.label)}
            className={`h-10 px-4 rounded-lg text-sm font-medium border transition-all ${
              !opt.available
                ? 'bg-base text-muted/50 line-through border-border cursor-not-allowed'
                : opt.label === props.selected
                  ? 'bg-base border-ink border-2 text-ink'
                  : 'bg-base border-border text-ink hover:border-muted'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
