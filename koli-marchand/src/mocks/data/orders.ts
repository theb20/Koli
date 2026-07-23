import type { Order, OrderItem, OrderStatus, PaymentMethod, Product, Customer } from '@/types'
import { daysAgo, mulberry32, pick, randomInt } from './rng'

const PAYMENT_METHODS: PaymentMethod[] = ['wave', 'orange_money', 'mtn_money', 'card', 'cash_on_delivery']
const ADDRESS_STREETS = [
  'Rue des Jardins', 'Boulevard Latrille', 'Avenue de la République', 'Rue du Commerce',
  'Rue des Palmiers', 'Boulevard de Marseille', 'Rue 12', 'Avenue Chardy',
]

function statusFor(rand: () => number, daysOld: number): OrderStatus {
  if (daysOld > 10) return pick(rand, ['delivered', 'delivered', 'delivered', 'cancelled'] as const)
  if (daysOld > 5) return pick(rand, ['delivered', 'shipped'] as const)
  if (daysOld > 2) return pick(rand, ['shipped', 'preparing'] as const)
  return pick(rand, ['pending', 'preparing'] as const)
}

export function generateOrders(products: Product[], customers: Customer[], count = 60): Order[] {
  const rand = mulberry32(99)
  const activeProducts = products.filter((p) => p.status !== 'draft')

  return Array.from({ length: count }, (_, i) => {
    const daysOld = randomInt(rand, 0, 21)
    const customer = pick(rand, customers)
    const itemsCount = randomInt(rand, 1, 3)
    const items: OrderItem[] = Array.from({ length: itemsCount }, (_, j) => {
      const product = pick(rand, activeProducts)
      const quantity = randomInt(rand, 1, 3)
      return {
        id: `item_${i}_${j}`,
        productId: product.id,
        productName: product.name,
        thumbnail: product.images[0],
        quantity,
        unitPrice: product.price,
        totalPrice: product.price * quantity,
      }
    })
    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0)
    const createdAt = daysAgo(daysOld)

    return {
      id: `ord_${String(i + 1).padStart(4, '0')}`,
      orderNumber: `SKG-${String(10000 + i)}`,
      customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email },
      items,
      itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount,
      paymentMethod: pick(rand, PAYMENT_METHODS),
      status: statusFor(rand, daysOld),
      shippingAddress: {
        address: `${pick(rand, ADDRESS_STREETS)}, ${randomInt(rand, 1, 200)}`,
        city: customer.city,
        country: customer.country,
      },
      createdAt,
      updatedAt: daysOld > 0 ? daysAgo(randomInt(rand, 0, daysOld)) : createdAt,
    }
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}
