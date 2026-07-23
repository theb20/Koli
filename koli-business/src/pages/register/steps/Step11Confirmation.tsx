import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, Mail } from 'lucide-react'
import type { RegisterFormData } from '../types'

export function Step11Confirmation({ data }: { data: RegisterFormData }) {
  return (
    <div className="flex flex-col gap-6 items-center text-center">
      <div className="w-16 h-16 rounded-full bg-[#e6f7ec] flex items-center justify-center">
        <CheckCircle2 size={30} className="text-[#0a8a3a]" />
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[24px] lg:text-[26px] font-extrabold text-[#111] tracking-tight">Dossier envoyé !</h2>
        <p className="text-[#6f6f6f] text-[15px] max-w-sm">
          Merci {data.prenom} — votre demande d'ouverture de boutique <strong className="text-[#111]">{data.nomBoutique || ''}</strong> a bien été transmise.
        </p>
      </div>

      <div className="w-full flex flex-col gap-3 text-left">
        <div className="flex items-start gap-3 border border-[#ebebeb] rounded-lg px-4 py-3.5">
          <Clock size={18} className="text-[#111] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#111]">Vérification par un administrateur</span>
            <span className="text-[13px] text-[#6f6f6f]">Votre dossier (KYC compris) est en cours de revue — généralement sous 24 à 48h.</span>
          </div>
        </div>
        <div className="flex items-start gap-3 border border-[#ebebeb] rounded-lg px-4 py-3.5">
          <Mail size={18} className="text-[#111] shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[14px] font-semibold text-[#111]">Notification par e-mail</span>
            <span className="text-[13px] text-[#6f6f6f]">Vous recevrez la décision (approuvée ou à compléter) à {data.email || 'votre adresse'}.</span>
          </div>
        </div>
      </div>

      <Link to="/connexion" className="w-full bg-[#111] hover:bg-[#2c2c2c] transition-colors text-white rounded-lg py-3.5 text-[15px] font-bold text-center">
        Retour à la connexion
      </Link>
    </div>
  )
}
