import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useMyStoreStatus } from '../api/useBilling'

/** Bandeau global — suspension AUTOMATIQUE pour facture d'abonnement impayée, voir merchantgo. */
export function SuspensionBanner() {
  const { data: store } = useMyStoreStatus()
  if (!store?.suspendedAt) return null

  return (
    <div className="bg-red-600 text-white px-4 py-2.5 text-sm flex items-center justify-center gap-2 text-center">
      <AlertTriangle size={14} className="shrink-0" />
      <span>Votre boutique est suspendue — {store.suspensionReason}</span>
      <Link to="/facturation" className="font-semibold underline underline-offset-2 shrink-0">Régulariser</Link>
    </div>
  )
}
