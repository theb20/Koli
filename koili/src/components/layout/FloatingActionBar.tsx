import { Link, useLocation } from 'react-router-dom'
import { Home, Info, MessageCircle, Heart, ShoppingBag } from 'lucide-react'
import { useCartStore, selectItemCount } from '../../store/cartStore'

const ACTIONS = [
  { icon: Home, href: '/', label: 'Home' },
  { icon: Info, href: '/about', label: 'About' },
  { icon: MessageCircle, href: '/contact', label: 'Contact' },
  { icon: Heart, href: '/shop', label: 'Wishlist' },
  { icon: ShoppingBag, href: '/shop', label: 'Shop', highlight: true },
]

export function FloatingActionBar() {
  const { pathname } = useLocation()
  const itemCount = useCartStore(selectItemCount)

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 flex flex-col z-50 rounded-l-xl overflow-hidden shadow-2xl">
      {ACTIONS.map(({ icon: Icon, href, label, highlight }) => (
        <Link
          key={label}
          to={href}
          title={label}
          className={[
            'w-11 h-11 flex items-center justify-center transition-all relative group',
            highlight
              ? 'bg-[#4F46E5] text-white hover:bg-[#3730A3]'
              : pathname === href
              ? 'bg-indigo-50 text-[#4F46E5]'
              : 'bg-white text-slate-400 hover:text-[#4F46E5] hover:bg-indigo-50 border-b border-slate-100',
          ].join(' ')}
        >
          <Icon size={16} />
          {highlight && itemCount > 0 && (
            <span className="absolute top-1 right-1 bg-[#D97706] text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}
