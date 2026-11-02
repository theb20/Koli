import { useState } from 'react'
import { Truck, ChevronDown } from 'lucide-react'

const CITIES = ['Abidjan', 'Bouaké', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Daloa'] as const

function nextCutoffLabel(): string {
  const now = new Date()
  const cutoff = new Date(now)
  cutoff.setHours(23, 0, 0, 0)
  if (now < cutoff) return "aujourd'hui avant 23:00"
  return 'demain avant 23:00'
}

export function DeliveryCard({ sellerName }: { sellerName?: string | null }) {
  const [city, setCity] = useState<string>('Abidjan')
  const [editing, setEditing] = useState(false)
  const cutoffLabel = nextCutoffLabel()
  const expressAvailable = city === 'Abidjan'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-base font-bold text-ink">Livraison et promesses</p>
        <a href="/livraison" className="text-xs underline underline-offset-2 text-muted hover:text-ink">
          En savoir plus
        </a>
      </div>
      <p className="text-xs text-muted mb-3">
        Vendu et expédié par <span className="font-medium text-ink">{sellerName || 'Koli'}</span>
      </p>

      <div className="rounded-xl bg-base p-4">
        <div className="flex items-center justify-between text-sm mb-3">
          <span className="text-ink">
            Livrer à : <span className="font-semibold">{city}</span>
          </span>
          <button
            onClick={() => setEditing(e => !e)}
            className="text-xs font-semibold underline underline-offset-2 text-ink flex items-center gap-1"
          >
            Modifier <ChevronDown size={12} className={editing ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        </div>

        {editing && (
          <div className="flex flex-wrap gap-1.5 mb-3 pb-3 border-b border-border">
            {CITIES.map(c => (
              <button
                key={c}
                onClick={() => { setCity(c); setEditing(false) }}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  c === city ? 'bg-ink text-white border-ink' : 'bg-surface border-border text-ink hover:border-muted'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="h-px bg-border mb-3" />

        <div className="flex items-start gap-3">
          <Truck size={18} className="text-ink mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="text-ink">
              {expressAvailable
                ? <>Livraison dès demain · Commandez {cutoffLabel}</>
                : <>Livraison en 2 à 5 jours ouvrés</>}
            </p>
            <p className="text-xs text-muted mt-0.5">
              À partir de {expressAvailable ? '3 500' : '1 500'} FCFA — frais exacts calculés à la commande
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
