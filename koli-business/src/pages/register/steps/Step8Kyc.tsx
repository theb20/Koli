import { ShieldCheck } from 'lucide-react'
import { FileInput, RadioGroup, StepHeader } from '../../../components/FormFields'
import type { IdDocType, StepProps } from '../types'

export function Step8Kyc({ data, update }: StepProps) {
  const docLabel = data.typeDocument === 'passeport' ? 'Passeport' : data.typeDocument === 'permis' ? 'Permis de conduire' : "Carte d'identité"

  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Vérification d'identité" desc="Obligatoire pour activer les versements — vos documents restent confidentiels." />

      <div className="flex items-start gap-3 bg-[#f7f7f5] rounded-lg px-4 py-3.5">
        <ShieldCheck size={18} className="text-[#111] shrink-0 mt-0.5" />
        <span className="text-[13px] text-[#4a4a52] leading-relaxed">
          Ces documents servent uniquement à vérifier votre identité (KYC), comme l'exige la réglementation sur les paiements en ligne.
        </span>
      </div>

      <RadioGroup
        label="Type de document"
        name="typeDocument"
        options={[
          { value: 'cni', label: "Carte nationale d'identité" },
          { value: 'passeport', label: 'Passeport' },
          { value: 'permis', label: 'Permis de conduire' },
        ]}
        value={data.typeDocument}
        onChange={v => update({ typeDocument: v as IdDocType })}
      />

      <FileInput label={docLabel} value={data.documentIdentite} onChange={f => update({ documentIdentite: f })} accept="image/*,.pdf" />
      <FileInput label="Selfie (visage bien visible)" value={data.selfie} onChange={f => update({ selfie: f })} accept="image/*" />
      <FileInput label="Justificatif de domicile" hint="Facture récente, attestation…" value={data.justificatifDomicile} onChange={f => update({ justificatifDomicile: f })} accept="image/*,.pdf" />
    </div>
  )
}
