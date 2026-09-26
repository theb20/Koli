import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PackageSearch, X, ChevronRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchMyProductRequests } from '../../lib/api'

const DISMISS_KEY = 'koli_quote_banner_dismissed'

function readDismissed(): string[] {
  try { return JSON.parse(sessionStorage.getItem(DISMISS_KEY) ?? '[]') as string[] } catch { return [] }
}

/**
 * Bandeau global — un client connecté qui a un devis de sourcing à traiter
 * (prêt et encore valable, ou accepté mais pas encore payé) y est ramené
 * depuis n'importe quelle page du site, en plus de l'e-mail/SMS/notification.
 * Masquable pour la session ; jamais affiché sur la page du devis elle-même.
 */
export function PendingQuoteBanner() {
  const { token, isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  const [dismissed, setDismissed] = useState<string[]>(readDismissed)

  const { data } = useQuery({
    queryKey: ['my-product-requests'],
    queryFn:  () => fetchMyProductRequests(token!),
    enabled:  isAuthenticated && !!token,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  })

  const pending = (data?.data?.requests ?? []).find(r =>
    r.quoteToken && !dismissed.includes(r.id)
    && ((r.status === 'quoted' && !r.expired) || (r.status === 'accepted' && r.order?.paymentStatus !== 'paid')),
  )

  if (!pending || pathname.startsWith('/devis/') || pathname === '/panier') return null

  const dismiss = () => {
    const next = [...dismissed, pending.id]
    setDismissed(next)
    try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify(next)) } catch { /* navigation privée */ }
  }

  return (
    <div className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <PackageSearch size={16} className="shrink-0 text-blue-300" />
        <p className="flex-1 min-w-0 text-xs sm:text-sm truncate">
          {pending.status === 'accepted'
            ? <>Paiement en attente pour votre devis <strong>« {pending.productName} »</strong></>
            : <>Votre devis pour <strong>« {pending.productName} »</strong> est prêt</>}
        </p>
        <Link to={`/devis/${pending.quoteToken}`}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-gray-900 text-xs font-semibold hover:bg-gray-100 transition-colors">
          {pending.status === 'accepted' ? 'Payer' : 'Voir et payer'} <ChevronRight size={12} />
        </Link>
        <button onClick={dismiss} aria-label="Masquer"
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
