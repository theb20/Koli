import type { ShopSettings } from '@/types'
import { generatePayoutMethods } from './payouts'

export function generateSettings(): ShopSettings {
  return {
    name: 'TechStore Abidjan',
    description:
      "Boutique spécialisée en électronique et accessoires tech, neufs et reconditionnés vérifiés, livrés partout en Côte d'Ivoire.",
    email: 'contact@techstore-abidjan.ci',
    phone: '+225 07 08 09 10 11',
    payoutMethods: generatePayoutMethods(),
  }
}
