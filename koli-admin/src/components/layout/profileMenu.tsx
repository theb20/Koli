import { useNavigate } from 'react-router-dom'
import { Settings, Moon, Sun, Keyboard, LogOut, ExternalLink } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../lib/theme'
import type { MenuItem } from '../ui/Menu'
import { useLayout } from './LayoutContext'

const SITE_URL = 'https://skignas.com'

/** Menu du profil (carte de la sidebar + topbar). */
export function useProfileMenuItems(): MenuItem[] {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const { openShortcuts } = useLayout()
  return [
    { label: 'Paramètres', icon: <Settings size={15} />, onSelect: () => navigate('/settings') },
    { label: isDark ? 'Thème clair' : 'Thème sombre', icon: isDark ? <Sun size={15} /> : <Moon size={15} />, onSelect: toggle },
    { label: 'Raccourcis clavier', icon: <Keyboard size={15} />, onSelect: openShortcuts, shortcut: '?' },
    { label: 'Voir le site', icon: <ExternalLink size={15} />, onSelect: () => window.open(SITE_URL, '_blank', 'noopener') },
    { separator: true },
    { label: 'Déconnexion', icon: <LogOut size={15} />, danger: true, onSelect: () => { logout(); navigate('/login') } },
  ]
}

/** Menu du sélecteur d'espace (en-tête de la sidebar). */
export function useWorkspaceMenuItems(): MenuItem[] {
  const navigate = useNavigate()
  return [
    { label: 'Voir le site Skignas', icon: <ExternalLink size={15} />, onSelect: () => window.open(SITE_URL, '_blank', 'noopener') },
    { label: 'Paramètres', icon: <Settings size={15} />, onSelect: () => navigate('/settings') },
  ]
}

export const ROLE_LABEL: Record<string, string> = { admin: 'Administrateur' }
