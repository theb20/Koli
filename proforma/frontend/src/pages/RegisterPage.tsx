import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { useAuthStore } from '../store/authStore'

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const register = useAuthStore((s) => s.register)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await register(form)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src="/logo-skignas.png" alt="Skignas" className="h-12 w-auto" />
          <div className="text-center">
            <p className="text-lg font-extrabold text-ink">Proforma</p>
            <p className="text-xs text-muted">Créer votre compte</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 border border-border bg-white p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            <Input label="Nom" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input
            label="Mot de passe"
            type="password"
            required
            hint="8 caractères minimum"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && <p className="text-xs font-medium text-danger">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2 w-full">
            Créer mon compte
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted">
          Déjà un compte ?{' '}
          <Link to="/connexion" className="font-semibold text-brand">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
