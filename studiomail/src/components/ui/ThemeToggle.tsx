import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { IconButton } from './Button'

export function ThemeToggle() {
  const { isDark, toggle } = useTheme()
  return (
    <IconButton title={isDark ? 'Passer en clair' : 'Passer en sombre'} onClick={toggle}>
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </IconButton>
  )
}
