import { NavLink } from 'react-router-dom'
import { ChevronDown, ChevronsUpDown, Lock, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { NAV_GROUPS } from '../../lib/navigation'
import { useAuth } from '../../hooks/useAuth'
import { useAdminCounters } from '../../hooks/useAdminCounters'
import { Avatar } from '../ui/Avatar'
import { Menu } from '../ui/Menu'
import { ROLE_LABEL, useProfileMenuItems, useWorkspaceMenuItems } from './profileMenu'
import { PageHeader } from './PageHeader'

type SidebarProps = {
  collapsed: boolean            // mode icônes (72px)
  canCollapse: boolean          // bouton de repli visible (≥ 1280px)
  onToggleCollapse: () => void
  drawer: boolean               // < 1024px : tiroir
  open: boolean
  onClose: () => void
}

export function Sidebar({ collapsed, canCollapse, onToggleCollapse, drawer, open, onClose }: SidebarProps) {
  const { user } = useAuth()
  const counters = useAdminCounters()
  const profileItems = useProfileMenuItems()
  const workspaceItems = useWorkspaceMenuItems()
  const fullName = `${user?.prenom ?? ''} ${user?.nom ?? ''}`.trim() || 'Administrateur'
  const icons = collapsed && !drawer

  return (
    <>
      {drawer && open && <div className="fixed inset-0 z-40 bg-overlay" onClick={onClose} aria-hidden />}
      <aside aria-label="Navigation principale"
        className={cn(
          'fixed left-0 top-0 h-full z-50 flex flex-col bg-app-bg border-r border-line transition-[transform,width] duration-200 ease-out',
          icons ? 'w-[72px]' : 'w-[240px]',
          drawer && !open && '-translate-x-full',
        )}>
        {/* Logo */}
        <div className={cn('flex items-center h-[76px] shrink-0', icons ? 'justify-center' : 'justify-between px-6')}>
          <span className={cn('font-bold tracking-tight text-primary select-none', icons ? 'text-[22px]' : 'text-[26px]')}>
            {icons ? 's' : 'skignas'}
          </span>
          {drawer && (
            <button type="button" onClick={onClose} aria-label="Fermer le menu"
              className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink-2 hover:bg-hover-fill">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Sélecteur d'espace */}
        <div className={cn('shrink-0 pb-3', icons ? 'px-[18px]' : 'px-4')}>
          <Menu align="left" width={220} label="Espace" items={workspaceItems} className="w-full" trigger={({ open: o, toggle }) => (
            <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={o} title="Skignas Admin"
              className={cn('w-full flex items-center gap-3 rounded-nav hover:bg-hover-fill transition-colors', icons ? 'justify-center p-0' : 'p-1.5 -mx-1.5')}>
              <span className="w-9 h-9 rounded-nav bg-hover-fill text-ink-2 flex items-center justify-center shrink-0"><Lock size={16} /></span>
              {!icons && (
                <>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-body font-semibold text-ink truncate">Skignas Admin</span>
                    <span className="block text-caption text-muted truncate">{ROLE_LABEL[user?.role ?? ''] ?? user?.role}</span>
                  </span>
                  <ChevronDown size={16} className="text-ink-2 shrink-0" />
                </>
              )}
            </button>
          )} />
        </div>

        {/* Navigation groupée */}
        <nav className={cn('flex-1 overflow-y-auto overflow-x-hidden pb-4', icons ? 'px-3' : 'px-4')}>
          {NAV_GROUPS.map(group => (
            <div key={group.title} className="mt-5 first:mt-2">
              {icons
                ? <div className="mx-auto mb-2 h-px w-6 bg-line" aria-hidden />
                : <p className="px-3.5 mb-1.5 text-micro font-medium uppercase tracking-wider text-muted">{group.title}</p>}
              <ul className="space-y-1">
                {group.items.map(({ to, label, icon: Icon, counter }) => {
                  const count = counter ? counters[counter] ?? 0 : 0
                  return (
                    <li key={to}>
                      <NavLink to={to} end={to === '/'} onClick={drawer ? onClose : undefined}
                        title={icons ? label : undefined} aria-label={icons ? label : undefined}
                        className={({ isActive }) => cn(
                          'relative flex items-center h-11 rounded-nav text-nav transition-colors',
                          icons ? 'justify-center' : 'gap-3 px-3.5',
                          isActive ? 'bg-lime text-on-lime font-medium' : 'text-ink-2 hover:bg-hover-fill hover:text-ink',
                        )}>
                        <Icon size={18} strokeWidth={1.5} className="shrink-0" />
                        {!icons && <span className="flex-1 truncate">{label}</span>}
                        {count > 0 && (icons
                          ? <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary ring-2 ring-app-bg" aria-label={`${count} en attente`} />
                          : <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-on-primary text-micro font-medium flex items-center justify-center tabular">
                              {count > 99 ? '99+' : count}
                            </span>)}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {canCollapse && !drawer && (
          <button type="button" onClick={onToggleCollapse}
            aria-label={collapsed ? 'Déplier la navigation' : 'Replier la navigation'}
            title={collapsed ? 'Déplier' : 'Replier'}
            className={cn('mx-4 mb-2 h-9 flex items-center gap-3 rounded-nav text-secondary text-muted hover:bg-hover-fill hover:text-ink transition-colors', icons ? 'justify-center mx-3' : 'px-3.5')}>
            {collapsed ? <PanelLeftOpen size={18} strokeWidth={1.5} /> : <PanelLeftClose size={18} strokeWidth={1.5} />}
            {!icons && 'Replier'}
          </button>
        )}

        {/* Carte profil */}
        <div className="border-t border-line p-4 shrink-0">
          <Menu align="left" side="top" width={220} label="Profil" items={profileItems} className="w-full" trigger={({ open: o, toggle }) => (
            <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={o} title={icons ? fullName : undefined}
              className={cn('w-full flex items-center gap-3 rounded-nav hover:bg-hover-fill transition-colors', icons ? 'justify-center' : 'p-1.5 -m-1.5')}>
              <Avatar name={fullName} src={user?.avatar} size={32} online />
              {!icons && (
                <>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-secondary font-medium text-ink truncate">{fullName}</span>
                    <span className="block text-caption text-muted truncate">{user?.email}</span>
                  </span>
                  <ChevronsUpDown size={16} className="text-ink-2 shrink-0" />
                </>
              )}
            </button>
          )} />
        </div>
      </aside>
    </>
  )
}

/** Compatibilité — les pages existantes importent PageTitle depuis ce fichier. */
export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return <PageHeader title={title} subtitle={sub} actions={action} />
}
