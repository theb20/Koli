import { Mail } from 'lucide-react'

function WhatsAppIcon(props: { size?: number }) {
  return (
    <svg width={props.size ?? 15} height={props.size ?? 15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-1.744-.872-2.888-1.554-4.036-3.527-.305-.526.305-.489.872-1.627.098-.198.05-.371-.05-.52-.1-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.009-.371-.011-.57-.011-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.057 3.147 4.981 4.287 2.924 1.14 2.924.76 3.47.711.545-.05 1.758-.718 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12.04 0C5.46 0 .13 5.329.13 11.91c0 2.096.556 4.142 1.608 5.942L.058 23.95a.6.6 0 0 0 .734.73l6.209-1.637a11.81 11.81 0 0 0 5.038 1.146c6.582 0 11.91-5.329 11.91-11.91C23.95 5.329 18.621 0 12.04 0zm0 21.68a9.74 9.74 0 0 1-4.957-1.361.6.6 0 0 0-.47-.067l-3.608.951.962-3.512a.6.6 0 0 0-.07-.5A9.75 9.75 0 0 1 2.17 11.91c0-5.44 4.428-9.87 9.87-9.87 5.44 0 9.869 4.43 9.869 9.87 0 5.44-4.428 9.77-9.869 9.77z"/>
    </svg>
  )
}

function FacebookIcon(props: { size?: number }) {
  return (
    <svg width={props.size ?? 15} height={props.size ?? 15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.02 3.657 9.184 8.438 9.94v-7.03H7.898v-2.91h2.54V9.845c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.774-1.63 1.567v1.882h2.773l-.443 2.91h-2.33V22c4.78-.756 8.437-4.92 8.437-9.94z"/>
    </svg>
  )
}

function XIcon(props: { size?: number }) {
  return (
    <svg width={props.size ?? 15} height={props.size ?? 15} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

export function ShareBar({ url, title }: { url: string; title: string }) {
  const links = [
    { label: 'WhatsApp', Icon: WhatsAppIcon, href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { label: 'Facebook', Icon: FacebookIcon, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: 'E-mail', Icon: Mail, href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}` },
    { label: 'X', Icon: XIcon, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}` },
  ]

  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <span className="text-xs text-muted hidden sm:inline">Partager</span>
      {links.map(({ label, Icon, href }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Partager sur ${label}`}
          className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-muted hover:text-ink hover:border-ink transition-colors"
        >
          <Icon size={13} />
        </a>
      ))}
    </div>
  )
}
