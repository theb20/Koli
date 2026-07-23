import { Info } from 'lucide-react'
import { Field } from '../../../components/AuthLayout'
import { RadioGroup, Select, StepHeader } from '../../../components/FormFields'
import type { BusinessType, StepProps } from '../types'

const TYPES: { value: BusinessType; label: string; desc: string }[] = [
  { value: 'individuel', label: 'Particulier', desc: 'Vente occasionnelle, sans structure déclarée — votre CNI suffit.' },
  { value: 'auto-entrepreneur', label: 'Auto-entrepreneur / Entreprise individuelle', desc: 'Activité de commerçant déclarée en votre nom propre (régime simplifié CEPICI).' },
  { value: 'societe', label: 'Société', desc: 'SARL, SA, SUARL ou autre société enregistrée.' },
]

const FORMES_JURIDIQUES = [
  { value: 'sarl', label: 'SARL' },
  { value: 'sarlu', label: 'SARLU' },
  { value: 'sa', label: 'SA' },
  { value: 'suarl', label: 'SUARL' },
  { value: 'gie', label: 'GIE' },
  { value: 'autre', label: 'Autre' },
]

export function Step5Legal({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Statut de votre activité" desc="Les pièces demandées dépendent de votre statut — conformément à la réglementation en vigueur en Côte d'Ivoire." />

      <RadioGroup
        label="Type d'entreprise"
        name="typeEntreprise"
        options={TYPES}
        value={data.typeEntreprise}
        onChange={v => update({ typeEntreprise: v as BusinessType })}
      />

      {data.typeEntreprise === 'individuel' && (
        <div className="flex items-start gap-3 bg-[#f7f7f5] rounded-lg px-4 py-3.5">
          <Info size={18} className="text-[#111] shrink-0 mt-0.5" />
          <span className="text-[13px] text-[#4a4a52] leading-relaxed">
            Aucune immatriculation requise pour vendre occasionnellement en votre nom propre — votre pièce d'identité
            (demandée à l'étape Vérification d'identité) suffit. Au-delà d'un certain volume de ventes, la loi ivoirienne
            impose de basculer vers le statut Auto-entrepreneur.
          </span>
        </div>
      )}

      {data.typeEntreprise === 'auto-entrepreneur' && (
        <>
          <Field
            label="Numéro RCCM (personne physique)"
            type="text"
            placeholder="CI-ABJ-2024-A-12345"
            value={data.numeroLegal}
            onChange={e => update({ numeroLegal: e.target.value })}
            required
          />
          <Field
            label="Numéro de Compte Contribuable (NCC)"
            type="text"
            placeholder="Délivré par la DGI"
            value={data.numeroNCC}
            onChange={e => update({ numeroNCC: e.target.value })}
            required
          />
          <Field
            label="Nom commercial (si différent de votre nom)"
            type="text"
            value={data.nomEntreprise}
            onChange={e => update({ nomEntreprise: e.target.value })}
          />
        </>
      )}

      {data.typeEntreprise === 'societe' && (
        <>
          <Select
            label="Forme juridique"
            options={FORMES_JURIDIQUES}
            value={data.formeJuridique}
            onChange={e => update({ formeJuridique: e.target.value })}
            required
          />
          <Field
            label="Numéro RCCM (personne morale)"
            type="text"
            placeholder="CI-ABJ-2024-B-12345"
            value={data.numeroLegal}
            onChange={e => update({ numeroLegal: e.target.value })}
            required
          />
          <Field
            label="Numéro de Compte Contribuable (NCC)"
            type="text"
            placeholder="Délivré par la DGI"
            value={data.numeroNCC}
            onChange={e => update({ numeroNCC: e.target.value })}
            required
          />
          <Field label="Raison sociale" type="text" value={data.nomEntreprise} onChange={e => update({ nomEntreprise: e.target.value })} required />
          <Field label="Adresse du siège social" type="text" value={data.adresseSiege} onChange={e => update({ adresseSiege: e.target.value })} required />
        </>
      )}
    </div>
  )
}
