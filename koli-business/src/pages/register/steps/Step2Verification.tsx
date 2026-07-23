import { useState } from 'react'
import { CheckCircle2, Mail, Phone } from 'lucide-react'
import { StepHeader } from '../../../components/FormFields'
import type { StepProps } from '../types'

function OtpBlock({
  icon, label, target, verified, onVerify,
}: {
  icon: React.ReactNode
  label: string
  target: string
  verified: boolean
  onVerify: () => void
}) {
  const [code, setCode] = useState('')

  if (verified) {
    return (
      <div className="flex items-center gap-3 border border-[#0a8a3a]/30 bg-[#e6f7ec] rounded-lg px-4 py-3.5">
        <CheckCircle2 size={18} className="text-[#0a8a3a] shrink-0" />
        <span className="text-[14px] font-semibold text-[#0a8a3a]">{label} vérifié{target && ` — ${target}`}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5 border border-[#d6d6d6] rounded-lg px-4 py-4">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-[14px] font-semibold text-[#111]">{label}</span>
      </div>
      <p className="text-[13px] text-[#6f6f6f]">
        Code envoyé à <strong className="text-[#111]">{target || '—'}</strong>.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="Code à 6 chiffres"
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          className="flex-1 border border-[#d6d6d6] focus:border-[#111] rounded-lg px-3.5 py-2.5 text-[15px] outline-none transition-colors tracking-widest"
        />
        <button
          type="button"
          disabled={code.length !== 6}
          onClick={onVerify}
          className="bg-[#111] disabled:opacity-40 hover:bg-[#2c2c2c] transition-colors text-white rounded-lg px-5 text-[14px] font-bold"
        >
          Vérifier
        </button>
      </div>
      <button type="button" className="self-start text-[13px] text-[#111] underline">Renvoyer le code</button>
    </div>
  )
}

export function Step2Verification({ data, update }: StepProps) {
  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Vérifiez votre compte" desc="Confirmez votre e-mail et votre numéro pour activer votre compte." />

      <OtpBlock
        icon={<Mail size={16} className="text-[#111]" />}
        label="E-mail"
        target={data.email}
        verified={data.emailVerified}
        onVerify={() => update({ emailVerified: true })}
      />
      <OtpBlock
        icon={<Phone size={16} className="text-[#111]" />}
        label="Téléphone"
        target={data.telephone}
        verified={data.phoneVerified}
        onVerify={() => update({ phoneVerified: true })}
      />

      {data.emailVerified && data.phoneVerified && (
        <div className="flex items-center gap-3 bg-[#f7f7f5] rounded-lg px-4 py-3.5">
          <CheckCircle2 size={18} className="text-[#111] shrink-0" />
          <span className="text-[14px] font-semibold text-[#111]">Compte activé — vous pouvez continuer.</span>
        </div>
      )}
    </div>
  )
}
