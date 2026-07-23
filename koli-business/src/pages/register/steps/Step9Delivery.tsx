import { Field } from '../../../components/AuthLayout'
import { StepHeader, Textarea } from '../../../components/FormFields'
import type { StepProps } from '../types'

export function Step9Delivery({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Livraison" desc="Définissez comment vos commandes seront livrées à vos clients." />

      <Textarea
        label="Zones de livraison"
        placeholder="Ex : Abidjan et communes environnantes, national sous 5 jours…"
        value={data.zonesLivraison}
        onChange={e => update({ zonesLivraison: e.target.value })}
      />
      <Field label="Modes de livraison" type="text" placeholder="Coursier, transporteur partenaire…" value={data.modesLivraison} onChange={e => update({ modesLivraison: e.target.value })} />
      <div className="flex gap-3.5">
        <div className="flex-1">
          <Field label="Délais" type="text" placeholder="48 à 72h" value={data.delaisLivraison} onChange={e => update({ delaisLivraison: e.target.value })} />
        </div>
        <div className="flex-1">
          <Field label="Frais de livraison" type="text" placeholder="Gratuit dès 25 000 F" value={data.fraisLivraison} onChange={e => update({ fraisLivraison: e.target.value })} />
        </div>
      </div>

      <label className="flex items-center gap-2.5 pt-1">
        <input
          type="checkbox"
          checked={data.retraitMagasin}
          onChange={e => update({ retraitMagasin: e.target.checked })}
          className="w-4 h-4 accent-[#111]"
        />
        <span className="text-[14px] text-[#111]">Je propose aussi le retrait en boutique</span>
      </label>
    </div>
  )
}
