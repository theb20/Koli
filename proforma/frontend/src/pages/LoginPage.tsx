
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from '../components/ui/Icon'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const pushToast = useUiStore((s) => s.pushToast)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  function notImplemented(label: string) {
    pushToast(`${label} — à venir.`, 'info')
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#e9e5dc]">

      {/* Texture papier */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'radial-gradient(#b8b1a5 0.6px, transparent 0.6px)',
          backgroundSize: '8px 8px',
        }}
      />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-12">

        <div className="grid w-full max-w-[1250px] gap-10 lg:grid-cols-[1fr_460px] lg:items-center">

          {/* DOCUMENT PROFORMA */}
          <div className="hidden lg:flex justify-center">

            <div className="relative w-full max-w-[620px]">

              {/* ombre */}
              <div className="absolute inset-6 translate-x-5 translate-y-6 rotate-2 bg-black/10 blur-2xl" />

              {/* feuille */}
              <div className="relative bg-white shadow-[0_30px_70px_rgba(0,0,0,.18)]">

                {/* bande supérieure */}
                <div className="h-3 bg-[#222222]" />

                <div className="p-10">

                  {/* HEADER */}
                  <div className="flex items-start justify-between">

                    <div>
                      <img
                        src="/logo-skignas.png"
                        alt="Skignas"
                        className="h-8 w-auto"
                      />

                      <p className="mt-6 text-[10px] font-bold tracking-[0.2em] text-gray-400">
                        PROFORMA
                      </p>

                      <h1 className="mt-1 font-mono text-3xl font-bold text-gray-900">
                        PF-2026-0048
                      </h1>
                    </div>

                    <div className="text-right">

                      <div className="text-[10px] uppercase tracking-wider text-gray-400">
                        Date
                      </div>

                      <div className="mt-1 text-sm font-semibold text-gray-700">
                        29 Août 2026
                      </div>

                      <div className="mt-5 inline-flex border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold tracking-wide text-amber-700">
                        BROUILLON
                      </div>

                    </div>
                  </div>

                  <div className="my-8 border-t border-gray-200" />

                  {/* CLIENT */}
                  <div>

                    <p className="text-[10px] font-bold tracking-widest text-gray-400">
                      CLIENT
                    </p>

                    <h2 className="mt-2 text-lg font-bold text-gray-900">
                      Groupe Ivoire Distribution
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Abidjan · Côte d'Ivoire
                    </p>

                  </div>

                  {/* TABLE */}
                  <div className="mt-8">

                    <div className="grid grid-cols-[1fr_50px_110px] bg-gray-100 px-3 py-3 text-[10px] font-bold tracking-wide text-gray-500">

                      <span>DÉSIGNATION</span>

                      <span className="text-center">
                        QTÉ
                      </span>

                      <span className="text-right">
                        TOTAL
                      </span>

                    </div>

                    {[
                      ['Installation réseau', '1', '250 000'],
                      ['Matériel informatique', '4', '420 000'],
                      ['Configuration système', '1', '180 000'],
                      ['Support technique', '1', '247 400'],
                    ].map((item) => (
                      <div
                        key={item[0]}
                        className="grid grid-cols-[1fr_50px_110px] border-b border-gray-100 px-3 py-4 text-sm"
                      >
                        <span className="font-medium text-gray-700">
                          {item[0]}
                        </span>

                        <span className="text-center text-gray-500">
                          {item[1]}
                        </span>

                        <span className="text-right font-mono font-semibold text-gray-800">
                          {item[2]}
                        </span>
                      </div>
                    ))}

                  </div>

                  {/* TOTAL */}
                  <div className="ml-auto mt-8 w-[240px]">

                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Sous-total</span>
                      <span className="font-mono">
                        1 097 400
                      </span>
                    </div>

                    <div className="mt-3 border-t border-gray-300 pt-3">

                      <div className="flex items-end justify-between">

                        <span className="text-sm font-bold text-gray-900">
                          TOTAL FCFA
                        </span>

                        <span className="font-mono text-2xl font-bold text-gray-900">
                          1 097 400
                        </span>

                      </div>

                    </div>

                  </div>

                  {/* FOOTER DOCUMENT */}
                  <div className="mt-10 border-t border-gray-200 pt-6">

                    <div className="flex items-center justify-between">

                      <div className="text-[10px] text-gray-400">
                        Document généré par Skignas Proforma
                      </div>

                      <div className="rotate-[-8deg] border-2 border-amber-500 px-3 py-1 text-[9px] font-bold tracking-wider text-amber-600">
                        PROFORMA
                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

          {/* LOGIN PAPIER */}
          <div className="flex justify-center">

            <div className="w-full max-w-[460px]">

              <div className="bg-white shadow-[0_25px_60px_rgba(0,0,0,.14)]">

                {/* ligne document */}
                <div className="h-2 bg-[#222222]" />

                <div className="p-7 sm:p-9">

                  {/* logo mobile */}
                  <div className="mb-8 lg:hidden">
                    <img
                      src="/logo-skignas.png"
                      alt="Skignas"
                      className="h-8"
                    />
                  </div>

                  {/* heading */}
                  <div className="mb-8">

                    <p className="text-[10px] font-bold tracking-[0.18em] text-gray-400">
                      ESPACE CLIENT
                    </p>

                    <h2 className="mt-2 text-2xl font-bold text-gray-900">
                      Connexion à Proforma
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      Identifiez-vous pour accéder à vos proformas, devis et documents commerciaux.
                    </p>

                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">

                    {/* EMAIL */}
                    <div>

                      <label className="mb-2 block text-xs font-bold text-gray-700">
                        Email professionnel
                      </label>

                      <div className="flex items-center border-b-2 border-gray-300 pb-2 transition focus-within:border-black">

                        <Mail size={17} className="mr-3 text-gray-400" />

                        <input
                          type="email"
                          required
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="vous@entreprise.com"
                          className="w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-300"
                        />

                      </div>

                    </div>

                    {/* PASSWORD */}
                    <div>

                      <div className="mb-2 flex justify-between">

                        <label className="text-xs font-bold text-gray-700">
                          Mot de passe
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            notImplemented('Réinitialisation du mot de passe')
                          }
                          className="text-xs text-gray-400 hover:text-black"
                        >
                          Oublié ?
                        </button>

                      </div>

                      <div className="flex items-center border-b-2 border-gray-300 pb-2 transition focus-within:border-black">

                        <Lock size={17} className="mr-3 text-gray-400" />

                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-transparent text-sm text-gray-900 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-black"
                        >
                          {showPassword ? (
                            <EyeOff size={17} />
                          ) : (
                            <Eye size={17} />
                          )}
                        </button>

                      </div>

                    </div>

                    {/* ERROR */}
                    {error && (
                      <div className="flex gap-2 border-l-4 border-red-500 bg-red-50 p-3 text-xs text-red-600">

                        <AlertCircle size={16} className="shrink-0" />

                        {error}

                      </div>
                    )}

                    {/* BUTTON */}
                    <Button
                      type="submit"
                      loading={loading}
                      className="h-12 w-full rounded-none text-sm font-semibold"
                    >
                      {loading ? 'Connexion...' : 'Se connecter'}
                    </Button>

                  </form>

                  {/* SIGNUP */}
                  <div className="mt-7 border-t border-dashed border-gray-200 pt-6 text-center">

                    <p className="text-sm text-gray-500">
                      Pas encore de compte ?
                    </p>

                    <Link
                      to="/inscription"
                      className="mt-2 inline-block text-sm font-bold text-black underline underline-offset-4"
                    >
                      Créer un compte
                    </Link>

                  </div>

                  {/* SECURITY */}
                  <div className="mt-8 flex flex-col items-center gap-3 text-center">

                    <div className="flex items-center gap-2 text-[11px] text-gray-400">

                      <ShieldCheck size={14} />

                      Connexion sécurisée par Skignas

                    </div>

                    <div className="flex gap-3 text-[11px] text-gray-400">

                      <button
                        onClick={() =>
                          notImplemented('Page de confidentialité')
                        }
                        type="button"
                        className="hover:text-black"
                      >
                        Confidentialité
                      </button>

                      <span>•</span>

                      <button
                        onClick={() =>
                          notImplemented("Conditions d'utilisation")
                        }
                        type="button"
                        className="hover:text-black"
                      >
                        Conditions
                      </button>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  )
}