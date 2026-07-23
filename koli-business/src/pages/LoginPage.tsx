import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout, Field, GoogleButton } from '../components/AuthLayout'

const STATS = [
  { value: '12 500+', label: 'marchands actifs' },
  { value: '98 %', label: 'de paiements versés sous 48 h' },
  { value: '0 FCFA', label: "de frais d'inscription" },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: brancher sur l'API d'authentification marchand une fois disponible
  }

  return (
    <AuthLayout
      headline={<>Vendez plus.<br />Gérez tout,<br />au même endroit.</>}
      leftExtra={
        <div className="flex flex-col gap-5">
          {STATS.map(({ value, label }) => (
            <div key={label} className="flex items-baseline gap-3.5">
              <span className="text-2xl lg:text-[26px] font-extrabold">{value}</span>
              <span className="text-[#9a9a9a] text-[15px]">{label}</span>
            </div>
          ))}
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] lg:text-3xl font-extrabold text-[#111] tracking-tight">Connexion marchand</h2>
        <p className="text-[#6f6f6f] text-[15px]">Accédez à votre tableau de bord Skignas.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          label="Adresse e-mail"
          type="email"
          placeholder="vous@boutique.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Field
          label="Mot de passe"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          extra={<Link to="#" className="text-[13px] text-[#111] underline">Mot de passe oublié ?</Link>}
        />

        <div className="flex flex-col gap-3 pt-1">
          <button type="submit" className="bg-[#111] hover:bg-[#2c2c2c] transition-colors text-white rounded-lg py-3.5 text-[15px] font-bold">
            Se connecter
          </button>
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-[#e3e3e3]" />
            <span className="text-[#9a9a9a] text-[13px]">ou</span>
            <div className="flex-1 h-px bg-[#e3e3e3]" />
          </div>
          <GoogleButton>Continuer avec Google</GoogleButton>
        </div>
      </form>

      <p className="text-center text-sm text-[#6f6f6f]">
        Nouveau sur Skignas ? <Link to="/inscription" className="text-[#111] font-bold underline">Créer un compte marchand</Link>
      </p>
      <p className="text-center text-[13px]">
        <a href="#" className="text-[#9a9a9a] hover:text-[#111] transition-colors">Aide &amp; support</a>
      </p>
    </AuthLayout>
  )
}
