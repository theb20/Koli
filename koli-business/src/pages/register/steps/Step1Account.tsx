import { Field } from '../../../components/AuthLayout'
import { StepHeader } from '../../../components/FormFields'
import type { StepProps } from '../types'

export function Step1Account({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Créez votre compte" desc="Gratuit — sans engagement." />

      <div className="flex gap-3.5">
        <div className="flex-1">
          <Field label="Prénom" type="text" placeholder="Awa" value={data.prenom} onChange={e => update({ prenom: e.target.value })} required />
        </div>
        <div className="flex-1">
          <Field label="Nom" type="text" placeholder="Diop" value={data.nom} onChange={e => update({ nom: e.target.value })} required />
        </div>
      </div>
      <Field label="Adresse e-mail" type="email" placeholder="vous@boutique.com" value={data.email} onChange={e => update({ email: e.target.value })} required />
      <Field label="Numéro de téléphone" type="tel" placeholder="+225 07 00 00 00 00" value={data.telephone} onChange={e => update({ telephone: e.target.value })} required />
      <Field label="Mot de passe" type="password" placeholder="8 caractères minimum" minLength={8} value={data.password} onChange={e => update({ password: e.target.value })} required />

      <label className="flex items-start gap-2.5 pt-1">
        <input
          type="checkbox"
          checked={data.acceptedTerms}
          onChange={e => update({ acceptedTerms: e.target.checked })}
          className="mt-0.5 w-4 h-4 accent-[#111]"
          required
        />
        <span className="text-[13px] text-[#6f6f6f] leading-relaxed">
          J'accepte les <a href="#" className="text-[#111] underline">conditions d'utilisation</a> et la{' '}
          <a href="#" className="text-[#111] underline">politique de confidentialité</a> de Skignas.
        </span>
      </label>
    </div>
  )
}
