import type { Payout, PayoutMethod, PaymentMethod } from '@/types'
import { daysAgo, mulberry32, pick, randomInt } from './rng'

const METHODS: PaymentMethod[] = ['wave', 'orange_money', 'mtn_money']

export function generatePayouts(count = 24): Payout[] {
  const rand = mulberry32(2024)
  return Array.from({ length: count }, (_, i) => {
    const daysOld = i * 3 + randomInt(rand, 0, 2)
    return {
      id: `pay_${String(i + 1).padStart(3, '0')}`,
      reference: `VRST-${String(500000 + i * 7)}`,
      date: daysAgo(daysOld),
      method: pick(rand, METHODS),
      amount: randomInt(rand, 25_000, 320_000),
      status: i === 0 ? 'pending' : pick(rand, ['paid', 'paid', 'paid', 'failed'] as const),
    }
  })
}

export function generatePayoutMethods(): PayoutMethod[] {
  return [
    { id: 'pm_001', method: 'wave', label: 'Wave', maskedNumber: '•••• 4821', isDefault: true },
    { id: 'pm_002', method: 'orange_money', label: 'Orange Money', maskedNumber: '•••• 0932', isDefault: false },
  ]
}
