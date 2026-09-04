import type { CSSProperties, HTMLAttributes } from 'react'

/**
 * Icônes Flaticon Uicons (style Bold Straight — cohérent avec le design sans
 * arrondi de l'application) exposées avec la même API que lucide-react
 * (`size`, `className`) pour ne pas avoir à retoucher chaque site d'usage.
 */
export interface IconProps extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
  size?: number | string
  color?: string
  style?: CSSProperties
}

function createIcon(uiconClass: string) {
  function Icon({ size = 16, color, className = '', style, ...rest }: IconProps) {
    return (
      <i
        className={`fi ${uiconClass}${className ? ` ${className}` : ''}`}
        style={{
          fontSize: typeof size === 'number' ? `${size}px` : size,
          width: typeof size === 'number' ? `${size}px` : size,
          color,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          ...style,
        }}
        aria-hidden="true"
        {...rest}
      />
    )
  }
  return Icon
}

export const AlertCircle = createIcon('fi-bs-octagon-exclamation')
export const ArrowLeft = createIcon('fi-bs-arrow-left')
export const ArrowRightLeft = createIcon('fi-bs-exchange')
export const ArrowUpDown = createIcon('fi-bs-arrows-alt-v')
export const ArrowUpRight = createIcon('fi-bs-arrow-up-right')
export const Bell = createIcon('fi-bs-bell')
export const Building2 = createIcon('fi-bs-building')
export const Check = createIcon('fi-bs-check')
export const CheckCheck = createIcon('fi-bs-check-double')
export const CheckCircle2 = createIcon('fi-bs-check-circle')
export const ChevronDown = createIcon('fi-bs-angle-down')
export const Clock = createIcon('fi-bs-clock')
export const Clock3 = createIcon('fi-bs-clock')
export const Copy = createIcon('fi-bs-copy')
export const CreditCard = createIcon('fi-bs-credit-card')
export const Download = createIcon('fi-bs-download')
export const Eraser = createIcon('fi-bs-eraser')
export const Eye = createIcon('fi-bs-eye')
export const EyeOff = createIcon('fi-bs-eye-crossed')
export const FileSpreadsheet = createIcon('fi-bs-file-spreadsheet')
export const FileText = createIcon('fi-bs-file')
export const FlaskConical = createIcon('fi-bs-flask')
export const Info = createIcon('fi-bs-info')
export const Landmark = createIcon('fi-bs-landmark-alt')
export const LayoutDashboard = createIcon('fi-bs-dashboard')
export const Link2 = createIcon('fi-bs-link')
export const Lock = createIcon('fi-bs-lock')
export const Loader2 = createIcon('fi-bs-spinner')
export const LogOut = createIcon('fi-bs-right-from-bracket')
export const Mail = createIcon('fi-bs-envelope')
export const MapPin = createIcon('fi-bs-map-pin')
export const MessageCircle = createIcon('fi-bs-comment')
export const MoreVertical = createIcon('fi-bs-menu-dots')
export const Package = createIcon('fi-bs-package')
export const Palette = createIcon('fi-bs-palette')
export const Pause = createIcon('fi-bs-pause')
export const PenLine = createIcon('fi-bs-pen-nib')
export const Pencil = createIcon('fi-bs-pencil')
export const Phone = createIcon('fi-bs-phone-call')
export const Play = createIcon('fi-bs-play')
export const Plus = createIcon('fi-bs-plus')
export const Printer = createIcon('fi-bs-print')
export const Receipt = createIcon('fi-bs-receipt')
export const Repeat = createIcon('fi-bs-arrows-repeat')
export const Search = createIcon('fi-bs-search')
export const Send = createIcon('fi-bs-paper-plane')
export const Settings = createIcon('fi-bs-settings')
export const Share2 = createIcon('fi-bs-share')
export const Shield = createIcon('fi-bs-shield')
export const ShieldCheck = createIcon('fi-bs-shield-check')
export const Smartphone = createIcon('fi-bs-mobile-notch')
export const Trash2 = createIcon('fi-bs-trash')
export const TrendingUp = createIcon('fi-bs-arrow-trend-up')
export const Upload = createIcon('fi-bs-upload')
export const UserPlus = createIcon('fi-bs-user-add')
export const Users = createIcon('fi-bs-users')
export const Wallet = createIcon('fi-bs-wallet')
export const X = createIcon('fi-bs-cross-small')
export const XCircle = createIcon('fi-bs-circle-xmark')
