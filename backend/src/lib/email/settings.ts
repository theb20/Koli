import { prisma } from '../prisma'

export type EmailContactInfo = {
  whatsappNumber: string
  supportEmail:   string
  supportPhone:   string
}

const DEFAULTS: EmailContactInfo = {
  whatsappNumber: '2250700000000',
  supportEmail:   'support@skignas.com',
  supportPhone:   '+225 01 41 00 00 12',
}

/** Coordonnées de contact réelles (SiteSettings), avec repli si indisponible. */
export async function getContactInfo(): Promise<EmailContactInfo> {
  try {
    const s = await prisma.siteSettings.findUnique({ where: { id: 1 } })
    if (!s) return DEFAULTS
    return { whatsappNumber: s.whatsappNumber, supportEmail: s.supportEmail, supportPhone: s.supportPhone }
  } catch {
    return DEFAULTS
  }
}

export function waLink(whatsappNumber: string, text?: string): string {
  const base = `https://wa.me/${whatsappNumber}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
