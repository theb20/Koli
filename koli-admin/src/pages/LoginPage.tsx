import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@koli.cm')
  const [pass, setPass]   = useState('')
  const [show, setShow]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(email, pass)
    if (ok) navigate('/')
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#f5f5f7]">

      {/* Left: form panel */}
      <div className="flex-1 lg:basis-[46%] min-w-0 flex items-start justify-center px-6 sm:px-12 py-10 overflow-y-auto">

        <div className="w-full max-w-md my-auto">

          {/* Logo */}
          <div className="text-center mb-7">
            <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full shadow-xl">
              <img src="/imgs_dropship/sk_black.png" className="w-full" alt="Logo skignas" />
            </div>
            <h1 className="text-[28px] font-semibold tracking-tight text-[#0f0f10]">
              Administration Skignas
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Connectez-vous à votre espace
            </p>
          </div>

          {/* Card */}
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur-2xl p-8 shadow-[0_20px_70px_rgba(0,0,0,0.08)]"
          >

            {error && (
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-red-600 text-sm">
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="mb-5">
              <label className="mb-2 block text-[13px] font-medium text-slate-600">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-[18px] top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@skignas.com"
                  className="
                    h-14 w-full box-border rounded-2xl border border-slate-200 bg-white
                    pl-[52px] pr-4 text-[15px] outline-none transition
                    focus:border-black focus:ring-4 focus:ring-black/5
                  "
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-baseline justify-between gap-3 flex-wrap">
                <label className="text-[13px] font-medium text-slate-600 whitespace-nowrap">
                  Mot de passe
                </label>
                <Link
                  to="/mot-de-passe-oublie"
                  className="text-[13px] text-slate-400 hover:text-black transition-colors whitespace-nowrap"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-[18px] top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={show ? 'text' : 'password'}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  className="
                    h-14 w-full box-border rounded-2xl border border-slate-200 bg-white
                    pl-[52px] pr-[52px] text-[15px] outline-none transition
                    focus:border-black focus:ring-4 focus:ring-black/5
                  "
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              disabled={loading}
              className="
                mt-6 h-14 w-full rounded-2xl bg-black text-white font-medium
                transition hover:scale-[1.01] hover:bg-slate-900
                active:scale-[0.99] disabled:opacity-50
              "
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <p className="mt-5 text-center text-[13px] text-slate-400">
              Accès sécurisé au Backoffice Skignas
            </p>

          </form>

        </div>

      </div>

      {/* Right: image panel — masqué en dessous de lg, priorité au formulaire */}
      <div className="hidden lg:flex lg:flex-1 lg:basis-[54%] min-w-0 p-5 pl-0">
        <div className="relative w-full h-full rounded-[28px] overflow-hidden">
          
            <img src="/image.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
         
        </div>
      </div>

    </div>
  )
}
