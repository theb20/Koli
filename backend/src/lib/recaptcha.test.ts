import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const ORIGINAL_SECRET = process.env.RECAPTCHA_SECRET_KEY

async function importFresh() {
  vi.resetModules()
  return import('./recaptcha')
}

describe('verifyRecaptcha — RECAPTCHA_SECRET_KEY absente (dev local)', () => {
  beforeEach(() => {
    delete process.env.RECAPTCHA_SECRET_KEY
  })

  it('laisse toujours passer, même sans jeton — no-op tant que la clé n\'est pas configurée', async () => {
    const { verifyRecaptcha } = await importFresh()
    expect(await verifyRecaptcha(undefined, 'login')).toBe(true)
  })
})

describe('verifyRecaptcha — RECAPTCHA_SECRET_KEY configurée', () => {
  beforeEach(() => {
    process.env.RECAPTCHA_SECRET_KEY = 'fake-secret-for-tests'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejette une requête sans jeton', async () => {
    const { verifyRecaptcha } = await importFresh()
    expect(await verifyRecaptcha(undefined, 'login')).toBe(false)
  })

  it('accepte un jeton valide dont le score et l\'action correspondent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, score: 0.9, action: 'login' }),
    }))
    const { verifyRecaptcha } = await importFresh()
    expect(await verifyRecaptcha('token-abc', 'login')).toBe(true)
  })

  it('rejette un score sous le seuil (0.5) — signal probable de bot', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, score: 0.2, action: 'login' }),
    }))
    const { verifyRecaptcha } = await importFresh()
    expect(await verifyRecaptcha('token-abc', 'login')).toBe(false)
  })

  it('rejette une action différente de celle attendue — jeton "register" présenté sur /login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: true, score: 0.9, action: 'register' }),
    }))
    const { verifyRecaptcha } = await importFresh()
    expect(await verifyRecaptcha('token-abc', 'login')).toBe(false)
  })

  it('rejette si Google renvoie success: false', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ success: false, 'error-codes': ['invalid-input-response'] }),
    }))
    const { verifyRecaptcha } = await importFresh()
    expect(await verifyRecaptcha('token-abc', 'login')).toBe(false)
  })

  it('n\'échoue pas le login si Google est injoignable (panne tierce) — fail-open côté disponibilité', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    const { verifyRecaptcha } = await importFresh()
    expect(await verifyRecaptcha('token-abc', 'login')).toBe(true)
  })
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.RECAPTCHA_SECRET_KEY
  else process.env.RECAPTCHA_SECRET_KEY = ORIGINAL_SECRET
})
