import { useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { MotionConfig, motion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useGlobalShortcuts } from '../../hooks/useGlobalShortcuts'
import { sectionFor } from '../../lib/navigation'
import { cn } from '../../lib/cn'
import { CardSkeleton } from '../ui/States'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from './CommandPalette'
import { AssistantFab, AssistantPanel } from './Assistant'
import { ShortcutsModal } from './ShortcutsModal'
import { LayoutContext } from './LayoutContext'

const COLLAPSE_KEY = 'skignas_admin_sidebar_collapsed'
const readCollapsed = () => { try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false } }

/** Fil d'Ariane sur les pages de détail (/orders/:id → Commandes › Détail). */
function Breadcrumb() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  const section = sectionFor(pathname)
  if (parts.length < 2 || !section) return null
  const leaf = parts[1] === 'new' ? 'Nouveau' : 'Détail'
  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1.5 text-secondary text-muted mb-4">
      <Link to={section.to} className="hover:text-ink transition-colors">{section.label}</Link>
      <ChevronRight size={13} aria-hidden />
      <span className="text-ink-2" aria-current="page">{leaf}</span>
    </nav>
  )
}

export function AdminLayout() {
  const { isAuthenticated } = useAuth()
  const { pathname } = useLocation()
  const isDesktop = useMediaQuery('(min-width: 1280px)')
  const isTablet  = useMediaQuery('(min-width: 1024px)')
  const drawer = !isTablet

  const [userCollapsed, setUserCollapsed] = useState(readCollapsed)
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)

  const collapsed = isDesktop ? userCollapsed : !drawer   // 1024–1279 px : icônes
  const toggleCollapse = useCallback(() => {
    setUserCollapsed(c => { try { localStorage.setItem(COLLAPSE_KEY, c ? '0' : '1') } catch { /* */ } return !c })
  }, [])

  const openPalette = useCallback(() => setPaletteOpen(true), [])
  const openShortcuts = useCallback(() => { setPaletteOpen(false); setShortcutsOpen(true) }, [])
  const openAssistant = useCallback(() => setAssistantOpen(true), [])
  const actions = useMemo(() => ({ openPalette, openShortcuts, openAssistant }), [openPalette, openShortcuts, openAssistant])

  useGlobalShortcuts({ onPalette: openPalette, onShortcuts: openShortcuts })

  // reCAPTCHA ne sert qu'à la connexion : son badge (chargé sur /login) est
  // masqué dans l'espace admin, où il recouvrait le bouton de l'assistant.
  useEffect(() => {
    document.body.classList.add('admin-shell')
    return () => document.body.classList.remove('admin-shell')
  }, [])

  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <LayoutContext.Provider value={actions}>
      <MotionConfig reducedMotion="user">
        <div className="min-h-screen bg-app-bg">
          <Sidebar collapsed={collapsed} canCollapse={isDesktop} onToggleCollapse={toggleCollapse}
            drawer={drawer} open={menuOpen} onClose={() => setMenuOpen(false)} />

          <div className={cn('min-h-screen flex flex-col transition-[padding] duration-200',
            drawer ? 'pl-0' : collapsed ? 'pl-[72px]' : 'pl-[240px]')}>
            <Topbar showBurger={drawer} onOpenMenu={() => setMenuOpen(true)} />
            <main id="contenu" className="flex-1 p-4 sm:p-7 w-full max-w-[1600px] mx-auto overflow-x-clip">
              <Breadcrumb />
              <Suspense fallback={<CardSkeleton lines={4} />}>
                <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}>
                  <Outlet />
                </motion.div>
              </Suspense>
            </main>
          </div>

          <AssistantFab onClick={() => setAssistantOpen(o => !o)} />
          <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
          <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} onShortcuts={openShortcuts} />
          <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        </div>
      </MotionConfig>
    </LayoutContext.Provider>
  )
}
