import { Link, NavLink } from 'react-router-dom'
import { AlignLeft, ChevronDown, MapPin, Tag, Zap } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Accueil',   href: '/' },
  { label: 'Catalogue', href: '/catalogue', hasDropdown: true },
  { label: 'Blog',      href: '/blog' },
  { label: 'À propos',  href: '/about' },
  { label: 'Contact',   href: '/contact' },
]

export function NavBar() {
  return (
    <nav className="bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto flex items-center h-11">

        {/* Browse Categories */}
        <button className="flex items-center gap-2 px-5 h-full text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#3730A3] transition-colors cursor-pointer shrink-0 tracking-wide uppercase">
          <AlignLeft size={15} />
          Browse Categories
          <ChevronDown size={12} className="opacity-70 ml-0.5" />
        </button>

        {/* Nav links */}
        <div className="flex items-center">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={`${link.href}-${link.label}`}
              to={link.href}
              end={link.href === '/'}
              className={({ isActive }) =>
                `flex items-center gap-1 text-xs font-semibold px-4 h-11 whitespace-nowrap transition-colors uppercase tracking-wide ${
                  isActive
                    ? 'text-[#4F46E5] border-b-2 border-[#4F46E5]'
                    : 'text-slate-500 hover:text-[#4F46E5]'
                }`
              }
            >
              {link.label}
              {link.hasDropdown && <ChevronDown size={10} className="opacity-50" />}
            </NavLink>
          ))}
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center shrink-0">
          <Link to="/contact" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#4F46E5] px-4 h-11 border-l border-slate-100 transition-colors">
            <MapPin size={13} />
            <span className="hidden sm:block font-medium">Track Order</span>
          </Link>
          <Link to="/catalogue?badge=sale" className="flex items-center gap-1.5 text-xs font-bold text-[#D97706] hover:text-amber-700 px-4 h-11 border-l border-slate-100 transition-colors">
            <Tag size={13} />
            <span className="hidden sm:block">Soldes</span>
          </Link>
          <Link to="/catalogue?badge=hot" className="flex items-center gap-1.5 text-xs font-bold text-[#4F46E5] hover:text-[#3730A3] px-4 h-11 border-l border-slate-100 transition-colors">
            <Zap size={13} />
            <span className="hidden sm:block">Flash Deals</span>
          </Link>
        </div>

      </div>
    </nav>
  )
}
