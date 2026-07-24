import { Field } from '../../../components/AuthLayout'
import { FileInput, Select, StepHeader, Textarea } from '../../../components/FormFields'
import type { StepProps } from '../types'

const CATEGORIES = [
  { value: 'high-tech', label: 'High-tech & informatique' },
  { value: 'maison-connectee', label: 'Maison connectée' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'securite', label: 'Sécurité & caméras' },
  { value: 'audio-tv', label: 'Audio & TV' },
  { value: 'mode', label: 'Mode & accessoires' },
  { value: 'autre', label: 'Autre' },
]

export function Step4Business({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Votre boutique" desc="Ces informations seront visibles par vos futurs clients." />

      <Field label="Nom de la boutique" type="text" placeholder="Ma Boutique" value={data.nomBoutique} onChange={e => update({ nomBoutique: e.target.value })} required />

      <div className="flex gap-3.5">
        <div className="flex-1">
          <FileInput label="Logo de la boutique" value={data.logoBoutique} onChange={f => update({ logoBoutique: f, logoBoutiqueUrl: '' })} accept="image/*" />
        </div>
        <div className="flex-1">
          <FileInput label="Bannière" value={data.banniereBoutique} onChange={f => update({ banniereBoutique: f, banniereBoutiqueUrl: '' })} accept="image/*" />
        </div>
      </div>

      <Textarea
        label="Description"
        placeholder="Présentez votre boutique en quelques phrases…"
        value={data.descriptionBoutique}
        onChange={e => update({ descriptionBoutique: e.target.value })}
      />

      <Select label="Catégorie d'activité" options={CATEGORIES} value={data.categorieActivite} onChange={e => update({ categorieActivite: e.target.value })} required />
      <Field label="Site web (facultatif)" type="url" placeholder="https://" value={data.siteWeb} onChange={e => update({ siteWeb: e.target.value })} />
    </div>
  )
}
