import { Field } from '../../../components/AuthLayout'
import { FileInput, Select, StepHeader } from '../../../components/FormFields'
import { PAYS_OPTIONS, type StepProps } from '../types'

const LANGUES = [
  { value: 'fr', label: 'Français' },
]

const DEVISES = [
  { value: 'XOF', label: 'Franc CFA (XOF)' }
]

export function Step3Personal({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Informations personnelles" desc="Ces informations restent privées, elles ne sont pas publiées sur votre boutique." />

      <FileInput
        label="Photo de profil (facultatif)"
        value={data.photoProfil}
        onChange={f => update({ photoProfil: f, photoProfilUrl: '' })}
        accept="image/*"
      />
      <Field label="Date de naissance" type="date" value={data.dateNaissance} onChange={e => update({ dateNaissance: e.target.value })} />
      <div className="flex gap-3.5">
        <div className="flex-1">
          <Select label="Pays de résidence" options={PAYS_OPTIONS} value={data.paysResidence} onChange={e => update({ paysResidence: e.target.value })} required />
        </div>
        <div className="flex-1">
          <Field label="Ville" type="text" placeholder="Abidjan" value={data.villeResidence} onChange={e => update({ villeResidence: e.target.value })} required />
        </div>
      </div>
      <div className="flex gap-3.5">
        <div className="flex-1">
          <Select label="Langue" options={LANGUES} value={data.langue} onChange={e => update({ langue: e.target.value })} required />
        </div>
        <div className="flex-1">
          <Select label="Devise" options={DEVISES} value={data.devise} onChange={e => update({ devise: e.target.value })} required />
        </div>
      </div>
    </div>
  )
}
