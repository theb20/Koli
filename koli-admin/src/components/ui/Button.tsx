import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

/** `success` conservé pour les pages existantes (avant refonte). */
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle' | 'success'
type Size    = 'xs' | 'sm' | 'md' | 'lg' | 'cta'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const variants: Record<Variant, string> = {
  primary:   'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'bg-card text-ink border border-line hover:bg-hover-fill',
  ghost:     'text-ink-2 hover:bg-hover-fill hover:text-ink',
  danger:    'bg-down-bg text-down border border-down-border hover:brightness-95',
  subtle:    'bg-muted-fill text-ink-2 hover:bg-hover-fill',
  success:   'bg-up-bg text-up border border-up-border hover:brightness-95',
}

const sizes: Record<Size, string> = {
  xs:  'h-7 px-2.5 text-caption gap-1.5 rounded-btn-sm',
  sm:  'h-8 px-3 text-secondary gap-1.5 rounded-input',
  md:  'h-9 px-4 text-body gap-2 rounded-input',
  lg:  'h-10 px-5 text-body gap-2 rounded-cta',
  cta: 'h-[42px] px-5 text-secondary gap-2 rounded-cta',
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }: Props) {
  // Pas de type par défaut : comme avant la refonte, <Button> dans un <form>
  // reste un bouton d'envoi natif (les formulaires existants en dépendent).
  return (
    <button
      {...props}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant], sizes[size], className,
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string          // aria-label obligatoire : bouton sans texte
  icon: ReactNode
  dot?: boolean          // pastille rouge (ex. notifications non lues)
  size?: 28 | 32
}

/** Bouton rond bordé (topbar, navigation de semaine…) */
export function IconButton({ label, icon, dot, size = 32, className, type = 'button', ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      {...props}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full border border-line bg-card text-ink-2',
        'hover:bg-hover-fill hover:text-ink transition-colors disabled:opacity-50',
        size === 32 ? 'w-8 h-8' : 'w-7 h-7',
        className,
      )}
    >
      {icon}
      {dot && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-down ring-2 ring-card" aria-hidden />}
    </button>
  )
}

/** Touche de clavier (⌘, K, G…) */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-kbd bg-muted-fill text-micro font-medium text-ink-2 font-sans">
      {children}
    </kbd>
  )
}
