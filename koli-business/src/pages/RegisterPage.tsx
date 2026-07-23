import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout, Field, GoogleButton } from '../components/AuthLayout'

const STEPS = [
  { n: 1, label: 'Créez votre compte' },
  { n: 2, label: 'Vérifiez votre e-mail' },
  { n: 3, label: 'Publiez vos produits' },
]

export default function RegisterPage() {
  const [form, setForm] = useState({ prenom: '', nom: '', boutique: '', email: '', password: '' })
  const [accepted, setAccepted] = useState(false)

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: brancher sur l'API d'inscription marchand une fois disponible
  }

  return (
    <AuthLayout
      headline={<>Ouvrez votre<br />boutique en<br />3 minutes.</>}
      leftExtra={
        <div className="flex flex-col gap-4">
          {STEPS.map(({ n, label }, i) => (
            <div key={n} className="flex items-center gap-3">
              <div
                className={
                  i === 0
                    ? 'w-[26px] h-[26px] rounded-full bg-[#f4f4f2] text-[#111] flex items-center justify-center font-extrabold text-[13px] shrink-0'
                    : 'w-[26px] h-[26px] rounded-full border border-[#3a3a3a] text-[#9a9a9a] flex items-center justify-center font-extrabold text-[13px] shrink-0'
                }
              >
                {n}
              </div>
              <span className={i === 0 ? 'text-[15px]' : 'text-[15px] text-[#9a9a9a]'}>{label}</span>
            </div>
          ))}
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] lg:text-3xl font-extrabold text-[#111] tracking-tight">Créer un compte marchand</h2>
        <p className="text-[#6f6f6f] text-[15px]">Gratuit — sans engagement.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex gap-3.5">
          <div className="flex-1">
            <Field label="Prénom" type="text" placeholder="Awa" value={form.prenom} onChange={update('prenom')} required />
          </div>
          <div className="flex-1">
            <Field label="Nom" type="text" placeholder="Diop" value={form.nom} onChange={update('nom')} required />
          </div>
        </div>
        <Field label="Nom de la boutique" type="text" placeholder="Ma Boutique" value={form.boutique} onChange={update('boutique')} required />
        <Field label="Adresse e-mail" type="email" placeholder="vous@boutique.com" value={form.email} onChange={update('email')} required />
        <Field label="Mot de passe" type="password" placeholder="8 caractères minimum" minLength={8} value={form.password} onChange={update('password')} required />

        <label className="flex items-start gap-2.5 pt-1">
          <input
            type="checkbox"
            checked={accepted}
            onChange={e => setAccepted(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[#111]"
            required
          />
          <span className="text-[13px] text-[#6f6f6f] leading-relaxed">
            J'accepte les <a href="#" className="text-[#111] underline">conditions d'utilisation</a> et la{' '}
            <a href="#" className="text-[#111] underline">politique de confidentialité</a> de Skignas.
          </span>
        </label>

        <div className="flex flex-col gap-3 pt-1">
          <button type="submit" className="bg-[#111] hover:bg-[#2c2c2c] transition-colors text-white rounded-lg py-3.5 text-[15px] font-bold">
            Créer mon compte
          </button>
          <GoogleButton>S'inscrire avec Google</GoogleButton>
        </div>
      </form>

      <p className="text-center text-sm text-[#6f6f6f]">
        Déjà marchand ? <Link to="/connexion" className="text-[#111] font-bold underline">Se connecter</Link>
      </p>
    </AuthLayout>
  )
}
