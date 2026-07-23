import { useState } from 'react'
import { AuthLayout } from '../components/AuthLayout'
import { initialRegisterFormData, type RegisterFormData } from './register/types'
import { Step1Account } from './register/steps/Step1Account'
import { Step2Verification } from './register/steps/Step2Verification'
import { Step3Personal } from './register/steps/Step3Personal'
import { Step4Business } from './register/steps/Step4Business'
import { Step5Legal } from './register/steps/Step5Legal'
import { Step6Address } from './register/steps/Step6Address'
import { Step7Payment } from './register/steps/Step7Payment'
import { Step8Kyc } from './register/steps/Step8Kyc'
import { Step9Delivery } from './register/steps/Step9Delivery'
import { Step10Settings } from './register/steps/Step10Settings'
import { Step11Confirmation } from './register/steps/Step11Confirmation'

const STEP_TITLES = [
  'Compte', 'Vérification', 'Profil', 'Boutique', 'Statut légal',
  'Adresse', 'Paiement', 'Identité', 'Livraison', 'Paramètres',
]

export default function RegisterPage() {
  const [step, setStep] = useState(0) // 0-9 : étapes de formulaire, 10 : confirmation
  const [data, setData] = useState<RegisterFormData>(initialRegisterFormData)

  const update = (patch: Partial<RegisterFormData>) => setData(d => ({ ...d, ...patch }))

  const isLastFormStep = step === STEP_TITLES.length - 1
  const isConfirmation = step === STEP_TITLES.length

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return !!(data.prenom && data.nom && data.email && data.telephone && data.password && data.acceptedTerms)
      case 1: return data.emailVerified && data.phoneVerified
      case 9: return data.cgv
      default: return true
    }
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!canAdvance()) return
    setStep(s => s + 1)
  }

  function handleBack() {
    setStep(s => Math.max(0, s - 1))
  }

  const steps = [
    Step1Account, Step2Verification, Step3Personal, Step4Business, Step5Legal,
    Step6Address, Step7Payment, Step8Kyc, Step9Delivery, Step10Settings,
  ]
  const CurrentStep = steps[step]

  return (
    <AuthLayout
      headline={<>Ouvrez votre<br />boutique en<br />quelques minutes.</>}
      leftExtra={
        !isConfirmation && (
          <div className="flex flex-col gap-3">
            {STEP_TITLES.map((title, i) => (
              <div key={title} className="flex items-center gap-3">
                <div
                  className={
                    i < step
                      ? 'w-[22px] h-[22px] rounded-full bg-[#f4f4f2] text-[#111] flex items-center justify-center font-extrabold text-[11px] shrink-0'
                      : i === step
                        ? 'w-[22px] h-[22px] rounded-full border-2 border-[#f4f4f2] text-[#f4f4f2] flex items-center justify-center font-extrabold text-[11px] shrink-0'
                        : 'w-[22px] h-[22px] rounded-full border border-[#3a3a3a] text-[#6f6f6f] flex items-center justify-center font-extrabold text-[11px] shrink-0'
                  }
                >
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-[14px] ${i === step ? 'text-white font-semibold' : i < step ? 'text-[#c8c8ce]' : 'text-[#6f6f6f]'}`}>
                  {title}
                </span>
              </div>
            ))}
          </div>
        )
      }
    >
      {isConfirmation ? (
        <Step11Confirmation data={data} />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#111]">Étape {step + 1}/{STEP_TITLES.length}</span>
            <div className="flex-1 h-1.5 rounded-full bg-[#ebebeb] overflow-hidden">
              <div
                className="h-full bg-[#111] rounded-full transition-all"
                style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
              />
            </div>
          </div>

          <form onSubmit={handleNext} className="flex flex-col gap-6">
            <CurrentStep data={data} update={update} />

            <div className="flex gap-3 pt-1">
              {step > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="border border-[#d6d6d6] hover:border-[#111] transition-colors rounded-lg px-6 py-3.5 text-[15px] font-semibold text-[#111]"
                >
                  Retour
                </button>
              )}
              <button
                type="submit"
                disabled={!canAdvance()}
                className="flex-1 bg-[#111] disabled:opacity-40 hover:bg-[#2c2c2c] transition-colors text-white rounded-lg py-3.5 text-[15px] font-bold"
              >
                {isLastFormStep ? 'Envoyer mon dossier' : 'Continuer'}
              </button>
            </div>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
