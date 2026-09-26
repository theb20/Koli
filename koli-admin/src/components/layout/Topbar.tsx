import { useNavigate } from 'react-router-dom'
import { Search, Bell, ChevronDown, Menu as MenuIcon } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAdminCounters } from '../../hooks/useAdminCounters'
import { IconButton, Kbd } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { Menu } from '../ui/Menu'
import { useLayout } from './LayoutContext'
import { useProfileMenuItems } from './profileMenu'
import { WhatsNew } from './WhatsNew'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Topbar({ onOpenMenu, showBurger }: { onOpenMenu: () => void; showBurger: boolean }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { openPalette } = useLayout()
  const { unreadNotifications = 0 } = useAdminCounters()
  const profileItems = useProfileMenuItems()
  const fullName = `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Administrateur'

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 sm:px-6 bg-app-bg border-b border-line">
      {showBurger && (
        <IconButton label="Ouvrir le menu" icon={<MenuIcon size={16} />} onClick={onOpenMenu} />
      )}

      <button type="button" onClick={openPalette} aria-label="Rechercher (⌘K)"
        className="flex items-center gap-2.5 h-9 w-full max-w-[260px] px-3 rounded-input border border-line bg-card text-left text-body text-muted hover:border-muted transition-colors">
        <Search size={16} className="text-ink-2 shrink-0" />
        <span className="flex-1 truncate">Rechercher</span>
        <span className="hidden sm:flex items-center gap-1"><Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd><Kbd>K</Kbd></span>
      </button>

      <div className="ml-auto flex items-center gap-2.5">
        <WhatsNew />
        <IconButton label={unreadNotifications ? `Notifications (${unreadNotifications} non lues)` : 'Notifications'}
          icon={<Bell size={16} strokeWidth={1.5} />} dot={unreadNotifications > 0} onClick={() => navigate('/notifications')} />
        <Menu width={220} label="Profil" items={profileItems} trigger={({ open, toggle }) => (
          <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open}
            className="flex items-center gap-2.5 pl-1 pr-1.5 py-1 rounded-full hover:bg-hover-fill transition-colors">
            <Avatar name={fullName} src={user?.avatar} size={32} />
            <span className="hidden md:block text-left">
              <span className="block text-secondary font-medium text-ink leading-tight">{fullName}</span>
              <span className="block text-caption text-muted leading-tight tabular">ID : {user?.id.slice(-7).toUpperCase()}</span>
            </span>
            <ChevronDown size={16} className="hidden md:block text-ink-2" />
          </button>
        )} />
      </div>
    </header>
  )
}
