import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-base text-center">
      <p className="text-5xl font-black text-brand">404</p>
      <p className="text-sm text-muted">Cette page n'existe pas.</p>
      <Link to="/" className="text-sm font-semibold text-brand underline">
        Retour au tableau de bord
      </Link>
    </div>
  )
}
