import { Field } from '../../../components/AuthLayout'
import type { StepProps } from '../types'

/*
 * Volontairement réduit au seul champ exigé pour la soumission du dossier
 * (voir merchantgo, missingRequiredFields) — logo, bannière, description,
 * catégorie et site web se complètent après coup depuis koli-marchand
 * ("Ma boutique"), pour ne pas allonger l'inscription de champs qui
 * n'empêchent pas l'approbation.
 */
export function Step4Business({ data, update }: StepProps) {
  return (
    <Field label="Nom de la boutique" type="text" placeholder="Ma Boutique" value={data.nomBoutique} onChange={e => update({ nomBoutique: e.target.value })} required />
  )
}
