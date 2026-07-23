import type { Customer, CustomerSegment } from '@/types'
import { daysAgo, mulberry32, pick, randomInt } from './rng'

const FIRST_NAMES = [
  'Awa', 'Fatou', 'Aminata', 'Aya', 'Marie', 'Adjoua', 'Kadidiatou', 'Nafissatou',
  'Kouassi', 'Yao', 'Koffi', 'Ibrahim', 'Moussa', 'Seydou', 'Abdoulaye', 'Amara',
  'Josiane', 'Mariam', 'Chantal', 'Grace',
]

const LAST_NAMES = [
  'Kouassi', 'Koné', 'Traoré', "N'Guessan", 'Ouattara', 'Diabaté', 'Bamba', 'Yao',
  'Diallo', 'Camara', 'Coulibaly', 'Kacou', 'Adou', 'Aka', 'Touré', 'Silué',
]

const CITY_COUNTRY: Record<string, string> = {
  'Abidjan': "Côte d'Ivoire",
  'Bouaké': "Côte d'Ivoire",
  'Yamoussoukro': "Côte d'Ivoire",
  'San-Pédro': "Côte d'Ivoire",
  'Korhogo': "Côte d'Ivoire",
  'Daloa': "Côte d'Ivoire",
  'Man': "Côte d'Ivoire",
  'Gagnoa': "Côte d'Ivoire",
  'Abengourou': "Côte d'Ivoire",
  'Dakar': 'Sénégal',
  'Lomé': 'Togo',
  'Cotonou': 'Bénin',
}

const CITIES = Object.keys(CITY_COUNTRY)

export const CUSTOMER_CITIES = CITIES

function segmentFor(ordersCount: number, totalSpent: number): CustomerSegment {
  if (totalSpent > 500_000 || ordersCount > 10) return 'vip'
  if (ordersCount <= 1) return 'new'
  return 'regular'
}

export function generateCustomers(count = 40): Customer[] {
  const rand = mulberry32(7)
  return Array.from({ length: count }, (_, i) => {
    const first = pick(rand, FIRST_NAMES)
    const last = pick(rand, LAST_NAMES)
    const ordersCount = randomInt(rand, 0, 22)
    const totalSpent = ordersCount === 0 ? 0 : randomInt(rand, 15_000, 55_000) * ordersCount
    const createdAt = daysAgo(randomInt(rand, 15, 400))
    const city = pick(rand, CITIES)
    return {
      id: `cust_${String(i + 1).padStart(3, '0')}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@gmail.com`,
      phone: `+225 ${randomInt(rand, 1, 7)}${randomInt(rand, 0, 9)} ${randomInt(rand, 10, 99)} ${randomInt(rand, 10, 99)} ${randomInt(rand, 10, 99)}`,
      city,
      country: CITY_COUNTRY[city],
      segment: segmentFor(ordersCount, totalSpent),
      ordersCount,
      totalSpent,
      lastOrderAt: ordersCount > 0 ? daysAgo(randomInt(rand, 0, 60)) : null,
      createdAt,
    }
  })
}
