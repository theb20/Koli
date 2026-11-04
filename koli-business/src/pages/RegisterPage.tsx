import { useEffect, useState } from 'react'
import { AuthLayout } from '../components/AuthLayout'
import { initialRegisterFormData, type RegisterFormData } from './register/types'
import { saveApplicationDraft, submitApplication, uploadFile, ApiError } from '../lib/api'
import { preloadRecaptcha } from '../lib/recaptcha'
import { StepAccount } from './register/steps/StepAccount'
import { StepBoutique } from './register/steps/StepBoutique'
import { Step11Confirmation } from './register/steps/Step11Confirmation'

const STEP_TITLES = ['Compte', 'Boutique']

export default function RegisterPage() {
  const [step, setStep] = useState(0) // 0 : Compte, 1 : Boutique, 2 : confirmation
  const [data, setData] = useState<RegisterFormData>(initialRegisterFormData)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { preloadRecaptcha() }, [])

  const update = (patch: Partial<RegisterFormData>) => setData(d => ({ ...d, ...patch }))

  const isLastFormStep = step === STEP_TITLES.length - 1
  const isConfirmation = step === STEP_TITLES.length

  // Le compte lui-même (création + vérification e-mail) est entièrement géré
  // à l'intérieur de StepAccount — canAdvance(0) ne fait qu'attendre le
  // signal final (emailVerified), pas une action à déclencher ici.
  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return data.emailVerified
      case 1: return !!(
        data.nomBoutique && data.typeEntreprise &&
        // numeroLegal (RCCM) n'est exigé que pour auto-entrepreneur/société —
        // même règle que merchantgo, missingRequiredFields.
        (data.typeEntreprise === 'individuel' || data.numeroLegal) &&
        data.paysAdresse && data.villeAdresse && data.adresseComplete &&
        data.documentIdentite && data.selfie && data.cgv
      )
      default: return true
    }
  }

  // Uploade un fichier en attente vers stockgo (via backend/) si ce n'est
  // pas déjà fait, et renvoie son URL — accumule dans `patch` pour que
  // l'appelant puisse construire la payload merchantgo sans attendre le
  // prochain rendu (setState est asynchrone).
  async function ensureUploaded(
    file: File | null, existingUrl: string, bucket: Parameters<typeof uploadFile>[0],
    patch: Partial<RegisterFormData>, key: keyof RegisterFormData,
  ) {
    if (!file || existingUrl) return
    const url = await uploadFile(bucket, file)
    ;(patch as Record<string, unknown>)[key] = url
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault()
    if (!canAdvance() || saving) return
    setError(null)
    setSaving(true)
    try {
      const patch: Partial<RegisterFormData> = {}

      if (step === 1) {
        await ensureUploaded(data.documentIdentite, data.documentIdentiteUrl, 'document-identite', patch, 'documentIdentiteUrl')
        await ensureUploaded(data.selfie, data.selfieUrl, 'selfie', patch, 'selfieUrl')
      }

      const effectiveData = { ...data, ...patch }
      if (Object.keys(patch).length > 0) update(patch)

      // Rien à enregistrer côté Application en quittant l'étape Compte
      // (prénom/nom/email/téléphone sont des champs User, déjà sauvés par
      // registerAccount dans StepAccount) — seule l'étape Boutique alimente
      // le dossier merchantgo.
      if (step === 1) {
        await saveApplicationDraft(effectiveData)
        if (isLastFormStep) {
          await submitApplication()
        }
      }

      setStep(s => s + 1)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue, réessayez.")
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    setError(null)
    setStep(s => Math.max(0, s - 1))
  }

  const steps = [StepAccount, StepBoutique]
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

            {error && (
              <div className="text-[13px] font-semibold text-[#b3261e] bg-[#fdecea] rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {/* StepAccount gère elle-même ses propres boutons ("Créer mon
                compte" puis "Vérifier") tant que l'e-mail n'est pas
                confirmé — afficher EN PLUS le bouton générique "Continuer"
                à ce moment-là serait redondant (il resterait désactivé de
                toute façon). Il réapparaît dès que data.emailVerified
                passe à vrai, pour faire avancer vers l'étape Boutique. */}
            {!(step === 0 && !data.emailVerified) && (
              <div className="flex gap-3 pt-1">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={saving}
                    className="border border-[#d6d6d6] hover:border-[#111] transition-colors rounded-lg px-6 py-3.5 text-[15px] font-semibold text-[#111] disabled:opacity-40"
                  >
                    Retour
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!canAdvance() || saving}
                  className="flex-1 bg-[#111] disabled:opacity-40 hover:bg-[#2c2c2c] transition-colors text-white rounded-lg py-3.5 text-[15px] font-bold"
                >
                  {saving ? 'Enregistrement…' : isLastFormStep ? 'Envoyer mon dossier' : 'Continuer'}
                </button>
              </div>
            )}
          </form>
        </>
      )}
    </AuthLayout>
  )
}
