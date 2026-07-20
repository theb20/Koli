import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { api } from '../lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      // Toujours afficher le même état de succès, que l'email existe ou non —
      // ne jamais révéler côté client si un compte correspond à cette adresse.
      setSent(true)
    } catch {
      setError('Une erreur est survenue, réessayez dans un instant.')
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
              Mot de passe oublié
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {sent ? 'Vérifiez votre boîte mail' : 'Recevez un lien de réinitialisation par email'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur-2xl p-8 shadow-[0_20px_70px_rgba(0,0,0,0.08)]">
            {sent ? (
              <div className="text-center py-2">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Si un compte existe avec l'adresse <strong className="text-slate-900">{email}</strong>, un lien de réinitialisation valable <strong>30 minutes</strong> vient de lui être envoyé.
                </p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-black text-white font-medium text-sm transition hover:bg-slate-900"
                >
                  <ArrowLeft size={16} /> Retour à la connexion
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="mb-5">
                  <label className="mb-2 block text-[13px] font-medium text-slate-600">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-[18px] top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="admin@skignas.com"
                      className="h-14 w-full box-border rounded-2xl border border-slate-200 bg-white pl-[52px] pr-4 text-[15px] outline-none transition focus:border-black focus:ring-4 focus:ring-black/5"
                    />
                  </div>
                </div>

                <button
                  disabled={loading}
                  className="h-14 w-full rounded-2xl bg-black text-white font-medium transition hover:scale-[1.01] hover:bg-slate-900 active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
                </button>

                <Link
                  to="/login"
                  className="mt-5 flex items-center justify-center gap-1.5 text-[13px] text-slate-400 hover:text-black transition-colors"
                >
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
