import { logger } from './logger'

const SANDBOX_BASE = 'https://app.paydunya.com/sandbox-api/v1'
const LIVE_BASE     = 'https://app.paydunya.com/api/v1'
const TIMEOUT_MS    = 10_000

/** fetch() avec timeout — évite qu'une commande reste bloquée en attente d'un PayDunya lent/indisponible. */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function baseUrl(): string {
  return process.env.PAYDUNYA_MODE === 'live' ? LIVE_BASE : SANDBOX_BASE
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type':          'application/json',
    'PAYDUNYA-MASTER-KEY':   process.env.PAYDUNYA_MASTER_KEY ?? '',
    'PAYDUNYA-PRIVATE-KEY':  process.env.PAYDUNYA_PRIVATE_KEY ?? '',
    'PAYDUNYA-PUBLIC-KEY':   process.env.PAYDUNYA_PUBLIC_KEY ?? '',
    'PAYDUNYA-TOKEN':        process.env.PAYDUNYA_TOKEN ?? '',
  }
}

export function isPaydunyaConfigured(): boolean {
  return !!(
    process.env.PAYDUNYA_MASTER_KEY &&
    process.env.PAYDUNYA_PRIVATE_KEY &&
    process.env.PAYDUNYA_PUBLIC_KEY &&
    process.env.PAYDUNYA_TOKEN
  )
}

type CreateInvoiceParams = {
  amount:       number
  description:  string
  orderId:      string
  orderNumber:  string
  returnUrl:    string
  cancelUrl:    string
  callbackUrl:  string
  customerName?: string
  customerEmail?: string
}

type CreateInvoiceResult = { token: string; checkoutUrl: string }

/** Crée une facture PayDunya et renvoie l'URL de paiement vers laquelle rediriger le client. */
export async function createInvoice(params: CreateInvoiceParams): Promise<CreateInvoiceResult> {
  const body = {
    invoice: {
      total_amount: params.amount,
      description:  params.description,
    },
    store: {
      name: 'Skignas',
    },
    actions: {
      cancel_url:   params.cancelUrl,
      return_url:   params.returnUrl,
      callback_url: params.callbackUrl,
    },
    custom_data: {
      order_id:     params.orderId,
      order_number: params.orderNumber,
    },
  }

  const res = await fetchWithTimeout(`${baseUrl()}/checkout-invoice/create`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(body),
  })

  const data = await res.json() as { response_code?: string; response_text?: string; token?: string }
  // response_text est l'URL de paiement elle-même en cas de succès (pas un message
  // d'erreur) — vérifié empiriquement sur la réponse réelle de l'API sandbox, pas
  // une hypothèse : "https://paydunya.com/sandbox-checkout/invoice/{token}" (domaine
  // et chemin différents de ce qu'on aurait pu deviner). En cas d'échec, response_code
  // n'est pas "00" et response_text redevient un vrai message d'erreur lisible.
  if (data.response_code !== '00' || !data.token || !data.response_text) {
    logger.error('[paydunya] échec création facture', data)
    throw new Error(data.response_text ?? 'Échec de la création de la facture PayDunya')
  }

  return { token: data.token, checkoutUrl: data.response_text }
}

export type ConfirmedInvoice = {
  status:     string
  token:      string
  customData: Record<string, unknown>
}

/**
 * Revérifie le statut RÉEL d'une facture directement auprès de PayDunya, avec
 * nos propres clés — c'est le seul résultat digne de confiance. Le contenu
 * brut envoyé par l'IPN (POST reçu de l'extérieur, non authentifié par
 * signature) ne doit jamais servir directement à marquer une commande payée.
 */
export async function confirmInvoice(token: string): Promise<ConfirmedInvoice> {
  const res = await fetchWithTimeout(`${baseUrl()}/checkout-invoice/confirm/${token}`, {
    method:  'GET',
    headers: authHeaders(),
  })
  const data = await res.json() as { status?: string; custom_data?: Record<string, unknown> }
  return {
    status:     data.status ?? 'unknown',
    token,
    customData: data.custom_data ?? {},
  }
}
