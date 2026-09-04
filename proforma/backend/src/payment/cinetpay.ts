/**
 * Paiement en ligne via CinetPay — passerelle qui agrège Wave, Orange Money,
 * MTN Money, Moov Money et carte bancaire derrière une seule API de
 * checkout, ce qui correspond exactement à l'usage courant en Côte
 * d'Ivoire pour ce type d'app (spec : "Wave, Orange Money ou CinetPay").
 *
 * Sans clés configurées (CINETPAY_API_KEY / CINETPAY_SITE_ID), toute
 * tentative échoue avec un message clair — jamais de faux succès de
 * paiement simulé.
 */

const API_KEY = process.env.CINETPAY_API_KEY
const SITE_ID = process.env.CINETPAY_SITE_ID
const BASE_URL = 'https://api-checkout.cinetpay.com/v2'

export const cinetpayConfigured = Boolean(API_KEY && SITE_ID)

const NOT_CONFIGURED_MESSAGE =
  "Paiement en ligne non configuré : ajoute CINETPAY_API_KEY et CINETPAY_SITE_ID dans backend/.env pour activer cette fonctionnalité."

export interface InitiatePaymentInput {
  transactionId: string
  amount: number // unité majeure de la devise (CinetPay n'accepte pas les centimes pour XOF)
  currency: 'XOF' | 'EUR' | 'USD'
  description: string
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  returnUrl: string
  notifyUrl: string
}

export interface InitiatePaymentResult {
  paymentUrl: string
  cinetpayTransactionId: string
}

export async function initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
  if (!API_KEY || !SITE_ID) throw new Error(NOT_CONFIGURED_MESSAGE)

  const res = await fetch(`${BASE_URL}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: API_KEY,
      site_id: SITE_ID,
      transaction_id: input.transactionId,
      amount: Math.round(input.amount),
      currency: input.currency,
      description: input.description.slice(0, 255),
      customer_name: input.customerName,
      customer_email: input.customerEmail || 'client@example.com',
      customer_phone_number: input.customerPhone || undefined,
      return_url: input.returnUrl,
      notify_url: input.notifyUrl,
      channels: 'ALL',
    }),
  })

  const data = (await res.json()) as any
  if (data.code !== '201' || !data.data?.payment_url) {
    throw new Error(data.message || 'Échec de l’initialisation du paiement CinetPay')
  }

  return { paymentUrl: data.data.payment_url, cinetpayTransactionId: input.transactionId }
}

export interface PaymentStatus {
  status: 'ACCEPTED' | 'REFUSED' | 'PENDING' | 'UNKNOWN'
  operatorId?: string
  paymentMethod?: string
  amount?: number
  currency?: string
}

/**
 * Vérifie le statut réel d'une transaction auprès de CinetPay — ne jamais se
 * fier au seul contenu du webhook notify_url, toujours reconfirmer ici.
 */
export async function checkPaymentStatus(transactionId: string): Promise<PaymentStatus> {
  if (!API_KEY || !SITE_ID) throw new Error(NOT_CONFIGURED_MESSAGE)

  const res = await fetch(`${BASE_URL}/payment/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apikey: API_KEY, site_id: SITE_ID, transaction_id: transactionId }),
  })

  const data = (await res.json()) as any
  const status = data?.data?.status
  if (status === 'ACCEPTED') {
    return {
      status: 'ACCEPTED',
      operatorId: data.data.operator_id,
      paymentMethod: data.data.payment_method,
      amount: Number(data.data.amount),
      currency: data.data.currency,
    }
  }
  if (status === 'REFUSED') return { status: 'REFUSED' }
  if (status === 'PENDING') return { status: 'PENDING' }
  return { status: 'UNKNOWN' }
}
