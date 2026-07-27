import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout, Field } from '../components/AuthLayout'
import { useAuthStore } from './useAuthStore'

type LocationState = { tempToken?: string }

export default function TwoFactorVerifyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyTwoFactor, loading, error } = useAuthStore()
  const { tempToken } = (location.state as LocationState) ?? {}

  const [code, setCode] = useState('')

  if (!tempToken) return <Navigate to="/connexion" replace />

  async function handleSubmit() {
    const ok = await verifyTwoFactor(tempToken!, code.trim())
    if (ok) navigate('/dashboard', { replace: true })
  }

  return (
    <AuthLayout
      headline={<>Vérification<br />en deux<br />étapes.</>}
      leftExtra={
        <p className="text-[#c8c8ce] text-[15px]">
          Saisissez le code généré par votre application d'authentification, ou l'un de vos codes de récupération.
        </p>
      }
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] lg:text-3xl font-extrabold text-[#111] tracking-tight">Double authentification</h2>
        <p className="text-[#6f6f6f] text-[15px]">Confirmez votre identité pour continuer.</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); void handleSubmit() }} className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
            {error}
          </p>
        )}
        <Field
          label="Code de vérification"
          type="text"
          inputMode="numeric"
          placeholder="123456"
          maxLength={14}
          value={code}
          onChange={e => setCode(e.target.value.replace(/[^0-9A-Za-z-]/g, ''))}
          required
          autoFocus
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-[#111] hover:bg-[#2c2c2c] transition-colors text-white rounded-lg py-3.5 text-[15px] font-bold disabled:opacity-60"
        >
          {loading ? 'Vérification…' : 'Vérifier'}
        </button>
      </form>
    </AuthLayout>
  )
}
