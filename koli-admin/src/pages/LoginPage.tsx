import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { preloadRecaptcha } from '../lib/recaptcha'
import { DotMatrixCanvas } from '../components/ui/DotMatrixCanvas'

/* Règles inchangées : e-mail + mot de passe, reCAPTCHA v3 (préchargé),
   comptes non-admin refusés (useAuth), erreurs serveur affichées,
   redirection vers / après connexion, lien mot de passe oublié.
   Pas d'inscription ni de connexion sociale : les comptes admin ne se
   créent pas depuis cette page. */

const field = 'w-full h-10 px-3.5 rounded-btn-sm border border-login-field-border bg-login-bg text-[14px] text-login-text placeholder:text-login-faint outline-none transition-colors focus:border-login-muted'

export default function LoginPage() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [show, setShow]   = useState(false)

  useEffect(() => { preloadRecaptcha() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = await login(email, pass)
    if (ok) navigate('/')
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-login-bg text-login-text font-sans px-4 py-10">
      <DotMatrixCanvas className="absolute inset-0 w-full h-full z-0" />
      {/* Vignette : assombrit le centre pour la lisibilité du formulaire */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0)_100%)]" aria-hidden />

      <main className="relative z-[2] w-full max-w-[400px] rounded-cta border border-login-card-border bg-login-card p-8 shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col items-center text-center">
        <div className="w-11 h-11 mb-3 rounded-full border border-login-field-border bg-login-logo-bg flex items-center justify-center text-[20px] font-bold leading-none" aria-hidden>
          s
        </div>
        <h1 className="text-[1.35rem] font-semibold tracking-[-0.025em] mb-1">Administration Skignas</h1>
        <p className="text-[0.85rem] text-login-muted mb-4 leading-relaxed">Connectez-vous à votre espace.</p>

        {error && (
          <div role="alert" className="w-full mb-3 flex items-start gap-2 rounded-btn-sm border border-down/40 bg-down/10 px-3 py-2.5 text-left text-[0.8rem] text-login-error">
            <AlertCircle size={15} className="shrink-0 mt-px" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2.5 text-left">
          <label htmlFor="login-email" className="sr-only">Adresse e-mail</label>
          <input id="login-email" type="email" required autoComplete="username" autoFocus
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="admin@skignas.com" className={field} />

          <label htmlFor="login-password" className="sr-only">Mot de passe</label>
          <div className="relative">
            <input id="login-password" type={show ? 'text' : 'password'} required autoComplete="current-password"
              value={pass} onChange={e => setPass(e.target.value)}
              placeholder="Mot de passe" className={`${field} pr-10`} />
            <button type="button" onClick={() => setShow(s => !s)}
              aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-btn-sm text-login-muted hover:text-login-text transition-colors">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" disabled={loading}
            className="mt-1 w-full h-10 rounded-btn-sm bg-login-cta text-login-cta-text text-[14px] font-medium flex items-center justify-center gap-2 transition-colors hover:bg-login-cta-hover disabled:opacity-60">
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="h-px w-full bg-login-card-border my-4" />

        <Link to="/mot-de-passe-oublie" className="text-[0.875rem] text-login-muted hover:text-login-text transition-colors">
          Mot de passe oublié ?
        </Link>
        <p className="mt-3 text-[0.8rem] text-login-muted">
          Accès réservé à l'équipe Skignas.
        </p>

        <p className="mt-4 text-[0.72rem] text-login-faint leading-relaxed">
          Ce site est protégé par reCAPTCHA : les{' '}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-login-muted underline-offset-2 hover:underline">règles de confidentialité</a> et les{' '}
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-login-muted underline-offset-2 hover:underline">conditions d'utilisation</a> de Google s'appliquent.
        </p>
      </main>
    </div>
  )
}
