import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { AuthLayout, Field } from '../components/AuthLayout'
import { api } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      // Même état de succès que l'email existe ou non — ne jamais révéler
      // côté client si un compte correspond à cette adresse.
      setSent(true)
    } catch {
      setError('Une erreur est survenue, réessayez dans un instant.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      headline={<>Récupérez<br />l'accès à<br />votre boutique.</>}
      leftExtra={<p className="text-[#c8c8ce] text-[15px]">Un lien de réinitialisation valable 30 minutes vous sera envoyé par e-mail.</p>}
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-[28px] lg:text-3xl font-extrabold text-[#111] tracking-tight">Mot de passe oublié</h2>
        <p className="text-[#6f6f6f] text-[15px]">
          {sent ? 'Vérifiez votre boîte mail.' : 'Recevez un lien de réinitialisation par e-mail.'}
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col gap-5 items-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#e6f7ec] flex items-center justify-center">
            <CheckCircle2 size={26} className="text-[#0a8a3a]" />
          </div>
          <p className="text-[14px] text-[#6f6f6f]">
            Si un compte existe avec l'adresse <strong className="text-[#111]">{email}</strong>, un lien de réinitialisation valable 30 minutes vient de lui être envoyé.
          </p>
          <Link to="/connexion" className="text-[#111] font-bold underline text-[14px]">Retour à la connexion</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p role="alert" className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}
          <Field
            label="Adresse e-mail"
            type="email"
            placeholder="vous@boutique.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#111] hover:bg-[#2c2c2c] transition-colors text-white rounded-lg py-3.5 text-[15px] font-bold disabled:opacity-60"
          >
            {loading ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
          </button>
          <Link to="/connexion" className="text-center text-[13px] text-[#6f6f6f] hover:text-[#111] transition-colors">
            Retour à la connexion
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}
