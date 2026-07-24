import { useEffect } from 'react'
import { Field } from '../../../components/AuthLayout'
import { Select, StepHeader } from '../../../components/FormFields'
import { PAYS_OPTIONS, type StepProps } from '../types'

export function Step6Address({ data, update }: StepProps) {
  // Pas de système de code postal significatif en Côte d'Ivoire — champ
  // figé à "99" plutôt que laissé vide ou éditable sans valeur réelle à y
  // mettre.
  useEffect(() => {
    if (data.codePostal !== '99') update({ codePostal: '99' })
  }, [data.codePostal])

  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Adresse de la boutique" desc="Utilisée pour la facturation et la coordination des livraisons." />

      <div className="flex gap-3.5">
        <div className="flex-1">
          <Select label="Pays" options={PAYS_OPTIONS} value={data.paysAdresse} onChange={e => update({ paysAdresse: e.target.value })} required />
        </div>
        <div className="flex-1">
          <Field label="Région" type="text" placeholder="Lagunes" value={data.regionAdresse} onChange={e => update({ regionAdresse: e.target.value })} required />
        </div>
      </div>
      <div className="flex gap-3.5">
        <div className="flex-1">
          <Field label="Ville" type="text" placeholder="Abidjan" value={data.villeAdresse} onChange={e => update({ villeAdresse: e.target.value })} required />
        </div>
        <div className="flex-1">
          <Field label="Code postal" type="text" value="99" disabled className="opacity-60 cursor-not-allowed" />
        </div>
      </div>
      <Field label="Adresse complète" type="text" placeholder="Rue, quartier, repère…" value={data.adresseComplete} onChange={e => update({ adresseComplete: e.target.value })} required />
    </div>
  )
}
