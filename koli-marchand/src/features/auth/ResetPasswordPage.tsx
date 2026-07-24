import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { AuthLayout, Field } from '../components/AuthLayout'
import { api } from '@/lib/api'

const RULES = [
  { test: (p: string) => p.length >= 8, label: 'Au moins 8 caractères' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Au moins 1 majuscule' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Au moins 1 chiffre' },
]

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const rulesOk = RULES.every(r => r.test(password))
  const matchOk = password.length > 0 && password === confirm
  const canSubmit = !!token && rulesOk && matchOk && !loading

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token, password })
      setDone(true)
      setTimeout(() => navigate('/connexion'), 2500)
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(message ?? 'Une erreur est survenue, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      headline={<>Choisissez<br />un nouveau<br />mot de passe.</>}
      leftExtra={<p className="text-[#c8c8ce] text-[15px]">Toutes vos sessions seront déconnectées par sécurité une fois le mot de passe changé.</p>}
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] lg:text-3xl font-extrabold text-[#111] tracking-tight">Nouveau mot de passe</h2>
        <p className="text-[#6f6f6f] text-[15px]">{done ? 'Mot de passe modifié.' : 'Choisissez un mot de passe robuste.'}</p>
      </div>

      {!token ? (
        <div className="flex flex-col gap-5 items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={26} className="text-red-500" />
          </div>
          <p className="text-[14px] text-[#6f6f6f]">Ce lien de réinitialisation est invalide.</p>
          <Link to="/mot-de-passe-oublie" className="bg-[#111] hover:bg-[#2c2c2c] transition-colors text-white rounded-lg px-6 py-3 text-[14px] font-bold">
            Demander un nouveau lien
          </Link>
        </div>
      ) : done ? (
        <div className="flex flex-col gap-5 items-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#e6f7ec] flex items-center justify-center">
            <CheckCircle2 size={26} className="text-[#0a8a3a]" />
          </div>
          <p className="text-[14px] text-[#6f6f6f]">
            Votre mot de passe a été modifié. Toutes vos sessions ont été déconnectées par sécurité. Redirection vers la connexion…
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <Field
            label="Nouveau mot de passe"
            type={show ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            extra={
              <button type="button" onClick={() => setShow(!show)} className="text-[#9a9a9a] hover:text-[#111] transition-colors">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
          />

          <div className="flex flex-col gap-1.5">
            <Field
              label="Confirmer le mot de passe"
              type={show ? 'text' : 'password'}
              placeholder="••••••••"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
            {confirm.length > 0 && !matchOk && (
              <p className="text-[12px] text-red-500">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          <ul className="flex flex-col gap-1">
            {RULES.map(r => (
              <li key={r.label} className={`flex items-center gap-1.5 text-[12px] ${r.test(password) ? 'text-[#0a8a3a]' : 'text-[#9a9a9a]'}`}>
                <CheckCircle2 size={13} /> {r.label}
              </li>
            ))}
          </ul>

          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-[#111] hover:bg-[#2c2c2c] transition-colors text-white rounded-lg py-3.5 text-[15px] font-bold disabled:opacity-40"
          >
            {loading ? 'Modification…' : 'Réinitialiser le mot de passe'}
          </button>
          <Link to="/connexion" className="text-center text-[13px] text-[#6f6f6f] hover:text-[#111] transition-colors">
            Retour à la connexion
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}
