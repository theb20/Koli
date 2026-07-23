import { Field } from '../../../components/AuthLayout'
import { StepHeader, Textarea } from '../../../components/FormFields'
import type { StepProps } from '../types'

export function Step10Settings({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Paramètres de la boutique" desc="Derniers réglages avant l'envoi de votre dossier." />

      <Field label="Nom de domaine personnalisé (optionnel)" type="text" placeholder="maboutique.com" value={data.domainePersonnalise} onChange={e => update({ domainePersonnalise: e.target.value })} />
      <Field label="Horaires d'ouverture" type="text" placeholder="Lun–Sam, 8h–19h" value={data.horairesOuverture} onChange={e => update({ horairesOuverture: e.target.value })} />

      <div className="flex gap-3.5">
        <div className="flex-1">
          <Field label="Facebook" type="text" placeholder="facebook.com/…" value={data.facebook} onChange={e => update({ facebook: e.target.value })} />
        </div>
        <div className="flex-1">
          <Field label="Instagram" type="text" placeholder="instagram.com/…" value={data.instagram} onChange={e => update({ instagram: e.target.value })} />
        </div>
      </div>
      <Field label="WhatsApp" type="tel" placeholder="+225 07 00 00 00 00" value={data.whatsapp} onChange={e => update({ whatsapp: e.target.value })} />

      <Textarea
        label="Politique de retour"
        placeholder="Ex : retours acceptés sous 14 jours, produit non utilisé…"
        value={data.politiqueRetour}
        onChange={e => update({ politiqueRetour: e.target.value })}
      />

      <label className="flex items-start gap-2.5 pt-1">
        <input
          type="checkbox"
          checked={data.cgv}
          onChange={e => update({ cgv: e.target.checked })}
          className="mt-0.5 w-4 h-4 accent-[#111]"
          required
        />
        <span className="text-[13px] text-[#6f6f6f] leading-relaxed">
          J'accepte les <a href="#" className="text-[#111] underline">conditions générales de vente</a> applicables aux marchands Skignas.
        </span>
      </label>
    </div>
  )
}
