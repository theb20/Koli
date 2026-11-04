import { RadioGroup } from '../../../components/FormFields'
import type { PaymentMethod, StepProps } from '../types'

/*
 * Volontairement réduit au CHOIX du moyen de paiement — pas requis côté
 * serveur pour l'approbation (voir merchantgo, missingRequiredFields) ; les
 * coordonnées précises (IBAN, numéro Mobile Money…) se renseignent depuis
 * koli-marchand avant le premier versement, une fois le dossier approuvé.
 */
export function Step7Payment({ data, update }: StepProps) {
  return (
    <RadioGroup
      label="Moyen de paiement préféré"
      name="moyenPaiement"
      options={[
        { value: 'mobile_money', label: 'Mobile Money', desc: 'Orange Money, MTN, Wave, Moov…' },
        { value: 'virement_bancaire', label: 'Virement bancaire', desc: 'IBAN / RIB' },
      ]}
      value={data.moyenPaiementPrefere}
      onChange={v => update({ moyenPaiementPrefere: v as PaymentMethod })}
    />
  )
}
