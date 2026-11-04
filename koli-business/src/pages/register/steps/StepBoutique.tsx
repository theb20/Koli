import { StepHeader } from '../../../components/FormFields'
import { Step4Business } from './Step4Business'
import { Step5Legal } from './Step5Legal'
import { Step6Address } from './Step6Address'
import { Step7Payment } from './Step7Payment'
import { Step8Kyc } from './Step8Kyc'
import type { StepProps } from '../types'

const SectionLabel = ({ children }: { children: string }) => (
  <span className="text-[13px] font-bold text-[#111] uppercase tracking-wide">{children}</span>
)

/*
 * Étape 2/2 — tout ce qui reste réellement nécessaire pour qu'un dossier
 * soit instruisible par un admin (voir merchantgo, missingRequiredFields) :
 * nom de boutique, statut légal, adresse, préférence de paiement, pièce
 * d'identité + selfie, CGV. Le reste (logo/bannière, description,
 * catégorie, livraison, réseaux sociaux, coordonnées bancaires détaillées,
 * modèle économique) se complète après coup depuis koli-marchand, une fois
 * le dossier approuvé — ça n'a jamais bloqué la soumission côté serveur.
 */
export function StepBoutique({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-7">
      <StepHeader title="Votre boutique" desc="Le strict nécessaire pour instruire votre dossier — le reste se complète plus tard." />

      <div className="flex flex-col gap-5">
        <SectionLabel>Boutique</SectionLabel>
        <Step4Business data={data} update={update} />
      </div>

      <div className="flex flex-col gap-5 border-t border-[#ebebeb] pt-6">
        <Step5Legal data={data} update={update} />
      </div>

      <div className="flex flex-col gap-5 border-t border-[#ebebeb] pt-6">
        <Step6Address data={data} update={update} />
      </div>

      <div className="flex flex-col gap-5 border-t border-[#ebebeb] pt-6">
        <SectionLabel>Paiement</SectionLabel>
        <Step7Payment data={data} update={update} />
      </div>

      <div className="flex flex-col gap-5 border-t border-[#ebebeb] pt-6">
        <Step8Kyc data={data} update={update} />
      </div>

      <label className="flex items-start gap-2.5 border-t border-[#ebebeb] pt-6">
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
