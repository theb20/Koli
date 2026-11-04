import { useState } from 'react'
import { Field } from '../../../components/AuthLayout'
import { StepHeader } from '../../../components/FormFields'
import { registerAccount, ApiError } from '../../../lib/api'
import { Step2Verification } from './Step2Verification'
import type { StepProps } from '../types'

/*
 * Étape 1/2 — fusionne les anciennes étapes "Compte" et "Vérification"
 * (restée un composant à part, Step2Verification, réutilisé ici tel quel)
 * en UN seul écran côté utilisateur : les champs du compte, puis — une fois
 * validés — le bloc de vérification par e-mail apparaît à la place, sans
 * faire avancer la barre de progression extérieure (toujours "Étape 1/2").
 * Le bouton "Continuer" global (rendu par RegisterPage) reste désactivé
 * tant que data.emailVerified n'est pas vrai (voir canAdvance).
 */
export function StepAccount({ data, update }: StepProps) {
  const [accountCreated, setAccountCreated] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fieldsValid = !!(data.prenom && data.nom && data.email && data.telephone && data.password && data.dateNaissance && data.acceptedTerms)

  async function handleCreateAccount() {
    if (!fieldsValid || creating) return
    setError(null)
    setCreating(true)
    try {
      await registerAccount(data)
      setAccountCreated(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de créer le compte, réessayez.')
    } finally {
      setCreating(false)
    }
  }

  if (accountCreated || data.emailVerified) {
    return <Step2Verification data={data} update={update} />
  }

  return (
    <div className="flex flex-col gap-5">
      <StepHeader title="Créez votre compte" desc="Avec engagement." />

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
      <Field label="Date de naissance" type="date" value={data.dateNaissance} onChange={e => update({ dateNaissance: e.target.value })} required />

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

      {error && <p className="text-[13px] text-[#b3261e] font-semibold">{error}</p>}

      <button
        type="button"
        disabled={!fieldsValid || creating}
        onClick={handleCreateAccount}
        className="bg-[#111] disabled:opacity-40 hover:bg-[#2c2c2c] transition-colors text-white rounded-lg py-3.5 text-[15px] font-bold"
      >
        {creating ? 'Création…' : 'Créer mon compte'}
      </button>
    </div>
  )
}
