import { useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { API_BASE } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

type Props = { productId: number; productName: string }

export function StockAlertButton({ productId, productName }: Props) {
  const { user } = useAuth()
  const [email, setEmail]       = useState(user?.email ?? '')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')
  const [showInput, setShowInput] = useState(false)

  const subscribe = async () => {
    const e = email.trim()
    if (!e) { setShowInput(true); return }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/stock-alerts`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ productId, email: e }),
      })
      const json = await res.json()
      if (json.success) {
        setSubscribed(true)
        setMsg(json.message)
        setShowInput(false)
      } else {
        setMsg(json.message)
      }
    } catch {
      setMsg('Erreur réseau.')
    } finally {
      setLoading(false)
    }
  }

  if (subscribed) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
        <BellOff size={15} className="shrink-0" />
        <span className="text-sm font-medium">{msg || 'Vous serez alerté(e) !'}</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {showInput && (
        <input
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
      <button
        onClick={subscribe}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-blue-600 text-blue-600 text-sm font-semibold hover:bg-blue-600 hover:text-white transition-all disabled:opacity-60"
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
        {loading ? 'Envoi…' : `M'alerter dès que "${productName.slice(0, 20)}…" est disponible`}
      </button>
      {msg && <p className="text-xs text-red-500 text-center">{msg}</p>}
    </div>
  )
}
