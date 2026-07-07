import { useQuery } from '@tanstack/react-query'
import { apiFetch, type ApiResponse } from '../lib/api'

export type SiteSettings = {
  supportPhone:   string
  whatsappNumber: string
  supportEmail:   string
  contactEmail:   string
  address:        string
  facebookUrl?:   string | null
  instagramUrl?:  string | null
  youtubeUrl?:    string | null
  tiktokUrl?:     string | null
}

/** Valeurs de repli si l'API est indisponible — évite un site cassé. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  supportPhone:   '+225 01 41 00 00 12',
  whatsappNumber: '2250700000000',
  supportEmail:   'support@skignas.com',
  contactEmail:   'hello@skignas.com',
  address:        "Cocody, Abidjan - Côte d'Ivoire",
}

/** Numéro WhatsApp → lien wa.me, avec message pré-rempli optionnel. */
export function waLink(whatsappNumber: string, text?: string): string {
  const base = `https://wa.me/${whatsappNumber}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/** Numéro affiché → lien tel:, en retirant les espaces. */
export function telLink(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`
}

export function useSiteSettings() {
  const { data } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const res = await apiFetch<ApiResponse<{ settings: SiteSettings }>>('/api/settings')
      return res.data.settings
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })

  return data ?? DEFAULT_SITE_SETTINGS
}
