import { Field } from '../../../components/AuthLayout'
import { RadioGroup, Select, StepHeader } from '../../../components/FormFields'
import type { PaymentMethod, StepProps } from '../types'

const OPERATEURS = [
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'mtn_money', label: 'MTN Mobile Money' },
  { value: 'wave', label: 'Wave' },
  { value: 'moov_money', label: 'Moov Money' },
]

export function Step7Payment({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Comment vous payer" desc="Vos gains seront versés sur le moyen de votre choix, sous 48h." />

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

      <div className="border-t border-[#ebebeb] pt-5 flex flex-col gap-4">
        <span className="text-[13px] font-bold text-[#111] uppercase tracking-wide">Mobile Money</span>
        <Select label="Opérateur" options={OPERATEURS} value={data.mobileMoneyOperateur} onChange={e => update({ mobileMoneyOperateur: e.target.value })} />
        <Field label="Numéro Mobile Money" type="tel" placeholder="+225 07 00 00 00 00" value={data.mobileMoneyNumero} onChange={e => update({ mobileMoneyNumero: e.target.value })} />
      </div>

      <div className="border-t border-[#ebebeb] pt-5 flex flex-col gap-4">
        <span className="text-[13px] font-bold text-[#111] uppercase tracking-wide">Virement bancaire (optionnel)</span>
        <Field label="Nom du titulaire" type="text" value={data.titulaireCompte} onChange={e => update({ titulaireCompte: e.target.value })} />
        <Field label="Banque" type="text" value={data.banque} onChange={e => update({ banque: e.target.value })} />
        <div className="flex gap-3.5">
          <div className="flex-1">
            <Field label="IBAN / RIB" type="text" value={data.iban} onChange={e => update({ iban: e.target.value })} />
          </div>
          <div className="flex-1">
            <Field label="SWIFT / BIC" type="text" value={data.swift} onChange={e => update({ swift: e.target.value })} />
          </div>
        </div>
      </div>
    </div>
  )
}
