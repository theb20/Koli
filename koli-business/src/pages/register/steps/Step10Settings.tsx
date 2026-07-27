import { useEffect } from 'react'
import { Info } from 'lucide-react'
import { Field } from '../../../components/AuthLayout'
import { StepHeader } from '../../../components/FormFields'
import type { StepProps } from '../types'

/*
 * Politique de retour unique pour toute la plateforme (14 jours après
 * livraison, cf. SiteSettings.returnWindowDays côté backend/ — appliquée
 * telle quelle par backend/src/routes/returns.ts, jamais configurable par
 * marchand) — laisser un champ libre ici donnait l'illusion à tort qu'un
 * marchand pouvait fixer ses propres conditions de retour.
 */
const RETURN_POLICY = "Retours acceptés sous 14 jours après réception de la commande. Le produit doit être non utilisé, non endommagé et dans son emballage d'origine. Le remboursement est traité par Skignas selon les conditions générales de la plateforme."

export function Step10Settings({ data, update }: StepProps) {
  useEffect(() => {
    if (data.politiqueRetour !== RETURN_POLICY) update({ politiqueRetour: RETURN_POLICY })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      <div>
        <label className="text-[13px] font-semibold text-[#111] block mb-1.5">Politique de retour</label>
        <div className="flex items-start gap-3 bg-[#f7f7f5] rounded-lg px-4 py-3.5">
          <Info size={18} className="text-[#111] shrink-0 mt-0.5" />
          <span className="text-[13px] text-[#4a4a52] leading-relaxed">
            {RETURN_POLICY} Cette politique est commune à tous les marchands Skignas et ne peut pas être personnalisée.
          </span>
        </div>
      </div>

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
