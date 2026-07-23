import { generateProducts } from './products'
import { generateCustomers } from './customers'
import { generateOrders } from './orders'
import { generatePayouts } from './payouts'
import { generatePromotions } from './promotions'
import { generateSettings } from './settings'

/**
 * "Base de données" en mémoire pour MSW — recréée à chaque rechargement de
 * page. Permet aux handlers de muter l'état (création/édition/suppression)
 * de façon cohérente entre les requêtes d'une même session.
 */
function createDb() {
  const products = generateProducts()
  const customers = generateCustomers()
  const orders = generateOrders(products, customers)
  const payouts = generatePayouts()
  const promotions = generatePromotions()
  const settings = generateSettings()

  return { products, customers, orders, payouts, promotions, settings }
}

export const db = createDb()

export function nextId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}
