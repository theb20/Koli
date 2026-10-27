import { Drawer } from '@/components/ui/Drawer'
import type { MetricDefinition } from '@/types/dashboard'

/** Les fiches du dictionnaire des métriques, telles que le serveur les applique. */
export function DefinitionsDrawer({ metrics, onClose }: { metrics: MetricDefinition[]; onClose: () => void }) {
  return (
    <Drawer title="Définitions des indicateurs" onClose={onClose}>
      <p className="text-sm text-[#6b6b68] mb-4">
        Montants en F CFA, hors taxes. Périodes au fuseau d'Abidjan. Seules les commandes payées sont comptées, datées au jour du paiement.
      </p>
      <dl className="flex flex-col gap-4">
        {metrics.map(m => (
          <div key={m.id} className="rounded-xl border border-[#e8e8e4] p-3.5">
            <dt className="text-sm font-bold text-[#0a0a0b]">{m.name}</dt>
            <dd className="mt-1 text-sm text-[#3a3a38]">{m.definition}</dd>
            <dd className="mt-2 text-xs text-[#6b6b68]"><span className="font-semibold text-[#0a0a0b]">Calcul : </span>{m.formula}</dd>
            <dd className="mt-1 text-xs text-[#6b6b68]"><span className="font-semibold text-[#0a0a0b]">Exclu : </span>{m.excluded}</dd>
          </div>
        ))}
      </dl>
    </Drawer>
  )
}
