import { useNavigate } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import type { ChatAction } from './types'

/** Boutons d'action attachés à une réponse de l'assistant — navigation
 * interne pour order/tracking/product/cart/checkout, lien externe réel
 * (WhatsApp/email fournis par le backend) pour support/link. */
export function ChatActions({ actions }: { actions: ChatAction[] }) {
  const navigate = useNavigate()
  if (!actions.length) return null

  function handleClick(action: ChatAction) {
    switch (action.type) {
      case 'order':
        if (action.id) navigate(`/commandes/${action.id}`)
        return
      case 'tracking':
        if (action.id) navigate(`/commandes/${action.id}/suivi`)
        return
      case 'product':
        if (action.id) navigate(`/catalogue/${action.id}`)
        return
      case 'cart':
        navigate('/panier')
        return
      case 'checkout':
        navigate('/panier')
        return
      case 'support':
      case 'link':
        if (action.target) window.open(action.target, '_blank', 'noopener,noreferrer')
        return
    }
  }

  const isExternal = (a: ChatAction) => a.type === 'support' || a.type === 'link'

  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {actions.map((action, i) => (
        <button
          key={`${action.type}-${action.label}-${i}`}
          onClick={() => handleClick(action)}
          className="min-h-[38px] px-3 flex items-center gap-1.5 border-2 border-[#201e1d] text-[13px] font-semibold text-[#201e1d] hover:bg-[#201e1d] hover:text-[#f3f2f2] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec3013]"
        >
          {action.label}
          {isExternal(action) && <ExternalLink size={12} />}
        </button>
      ))}
    </div>
  )
}
