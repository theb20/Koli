import { http, HttpResponse } from 'msw'
import { BASE } from '@/lib/api'
import type { AuthResponse, MerchantUser } from '@/types'

const DEMO_USER: MerchantUser = {
  id: 'merchant_001',
  shopName: 'TechStore Abidjan',
  ownerName: 'Kouadio Yao',
  email: 'marchand@skignas.com',
  isVerified: true,
}

function issueTokens(): Pick<AuthResponse, 'accessToken' | 'refreshToken'> {
  const suffix = Math.random().toString(36).slice(2, 10)
  return { accessToken: `mock_access_${suffix}`, refreshToken: `mock_refresh_${suffix}` }
}

export const authHandlers = [
  http.post(`${BASE}/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string }
    if (!body.email || !body.password || body.password.length < 6) {
      return HttpResponse.json({ message: 'E-mail ou mot de passe incorrect.' }, { status: 401 })
    }
    const response: AuthResponse = { ...issueTokens(), user: { ...DEMO_USER, email: body.email } }
    return HttpResponse.json(response)
  }),

  http.post(`${BASE}/api/auth/refresh`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { refreshToken?: string } | null
    if (!body?.refreshToken) {
      return HttpResponse.json({ message: 'Session expirée.' }, { status: 401 })
    }
    return HttpResponse.json({ ...issueTokens(), user: DEMO_USER })
  }),

  http.post(`${BASE}/api/auth/logout`, () => HttpResponse.json({ success: true })),
]
