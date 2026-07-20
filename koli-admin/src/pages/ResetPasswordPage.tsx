import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { api } from '../lib/api'

const RULES = [
  { test: (p: string) => p.length >= 8, label: 'Au moins 8 caractères' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Au moins 1 majuscule' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Au moins 1 chiffre' },
]

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [show, setShow]           = useState(false)
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')

  const rulesOk   = RULES.every(r => r.test(password))
  const matchOk   = password.length > 0 && password === confirm
  const canSubmit = !!token && rulesOk && matchOk && !loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/reset-password', { token, password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      setError(message ?? 'Une erreur est survenue, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f5f5f7]">
      <div className="flex-1 lg:basis-[46%] min-w-0 flex items-start justify-center px-6 sm:px-12 py-10 overflow-y-auto">
        <div className="w-full max-w-md my-auto">

          <div className="text-center mb-7">
            <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-xl">
              <img src="/imgs_dropship/sk_black.png" className="w-full" alt="Logo skignas" />
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[#0f0f10]">
              Nouveau mot de passe
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {done ? 'Mot de passe modifié' : 'Choisissez un mot de passe robuste'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur-2xl p-8 shadow-[0_20px_70px_rgba(0,0,0,0.08)]">
            {!token ? (
              <div className="text-center py-2">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                  <AlertCircle size={28} className="text-red-500" />
                </div>
                <p className="text-sm text-slate-600">Ce lien de réinitialisation est invalide.</p>
                <Link to="/mot-de-passe-oublie" className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-black text-white font-medium text-sm transition hover:bg-slate-900">
                  Demander un nouveau lien
                </Link>
              </div>
            ) : done ? (
              <div className="text-center py-2">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <p className="text-sm text-slate-600">
                  Votre mot de passe a été modifié. Toutes vos sessions ont été déconnectées par sécurité.
                  Redirection vers la connexion...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-red-600 text-sm">
                    <AlertCircle size={18} className="flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="mb-5">
                  <label className="mb-2 block text-[13px] font-medium text-slate-600">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-[18px] top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={show ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-14 w-full box-border rounded-2xl border border-slate-200 bg-white pl-[52px] pr-[52px] text-[15px] outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                    />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-[13px] font-medium text-slate-600">Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-[18px] top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={show ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="h-14 w-full box-border rounded-2xl border border-slate-200 bg-white pl-[52px] pr-4 text-[15px] outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                    />
                  </div>
                  {confirm.length > 0 && !matchOk && (
                    <p className="mt-1.5 text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                  )}
                </div>

                <ul className="mb-6 space-y-1">
                  {RULES.map(r => (
                    <li key={r.label} className={`flex items-center gap-1.5 text-xs ${r.test(password) ? 'text-green-600' : 'text-slate-400'}`}>
                      <CheckCircle2 size={13} /> {r.label}
                    </li>
                  ))}
                </ul>

                <button
                  disabled={!canSubmit}
                  className="h-14 w-full rounded-2xl bg-black text-white font-medium transition hover:scale-[1.01] hover:bg-slate-900 active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Modification...' : 'Réinitialiser le mot de passe'}
                </button>

                <Link to="/login" className="mt-5 flex items-center justify-center gap-1.5 text-[13px] text-slate-400 hover:text-black transition-colors">
                  <ArrowLeft size={13} /> Retour à la connexion
                </Link>
              </form>
            )}
          </div>

        </div>
      </div>

      <div className="hidden lg:flex lg:flex-1 lg:basis-[54%] min-w-0 p-5 pl-0">
        <div className="relative w-full h-full rounded-[28px] overflow-hidden">
          <img src="/image.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </div>
    </div>
  )
}
