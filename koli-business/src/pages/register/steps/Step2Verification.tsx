import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Mail } from 'lucide-react'
import { StepHeader } from '../../../components/FormFields'
import { sendVerificationCode, confirmVerificationCode, ApiError } from '../../../lib/api'
import type { StepProps } from '../types'

export function Step2Verification({ data, update }: StepProps) {
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Ref plutôt que state : doit bloquer un second envoi de façon synchrone,
  // y compris face au double-appel d'effet du StrictMode en dev (un state
  // mis à jour dans le même effet ne serait pas encore reflété au second
  // passage).
  const sentRef = useRef(false)

  // Envoi automatique dès l'arrivée sur l'étape — l'email est déjà connu
  // depuis l'étape 1, pas besoin d'une action explicite pour le premier envoi.
  useEffect(() => {
    if (data.emailVerified || sentRef.current || !data.email) return
    sentRef.current = true
    setSending(true)
    setError(null)
    sendVerificationCode(data.email)
      .catch(err => setError(err instanceof ApiError ? err.message : "Impossible d'envoyer le code."))
      .finally(() => setSending(false))
  }, [data.email, data.emailVerified])

  async function handleResend() {
    setError(null)
    setSending(true)
    try {
      await sendVerificationCode(data.email)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer le code.")
    } finally {
      setSending(false)
    }
  }

  async function handleVerify() {
    setError(null)
    setVerifying(true)
    try {
      await confirmVerificationCode(data.email, code)
      update({ emailVerified: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code invalide.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Vérifiez votre e-mail" desc="Confirmez votre adresse pour activer votre compte." />

      {data.emailVerified ? (
        <div className="flex items-center gap-3 border border-[#0a8a3a]/30 bg-[#e6f7ec] rounded-lg px-4 py-3.5">
          <CheckCircle2 size={18} className="text-[#0a8a3a] shrink-0" />
          <span className="text-[14px] font-semibold text-[#0a8a3a]">E-mail vérifié — {data.email}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 border border-[#d6d6d6] rounded-lg px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Mail size={16} className="text-[#111]" />
            <span className="text-[14px] font-semibold text-[#111]">E-mail</span>
          </div>
          <p className="text-[13px] text-[#6f6f6f]">
            {sending ? 'Envoi du code…' : (
              <>Code envoyé à <strong className="text-[#111]">{data.email}</strong>.</>
            )}
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
              disabled={code.length !== 6 || verifying}
              onClick={handleVerify}
              className="bg-[#111] disabled:opacity-40 hover:bg-[#2c2c2c] transition-colors text-white rounded-lg px-5 text-[14px] font-bold"
            >
              {verifying ? '…' : 'Vérifier'}
            </button>
          </div>
          {error && <p className="text-[13px] text-[#b3261e] font-semibold">{error}</p>}
          <button
            type="button"
            disabled={sending}
            onClick={handleResend}
            className="self-start text-[13px] text-[#111] underline disabled:opacity-40"
          >
            Renvoyer le code
          </button>
        </div>
      )}
    </div>
  )
}
