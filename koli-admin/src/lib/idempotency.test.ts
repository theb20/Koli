import { describe, it, expect } from 'vitest'
import { acquireIdempotencyKey, installAxiosIdempotency, IDEMPOTENCY_HEADER } from './idempotency'

describe('acquireIdempotencyKey', () => {
  it('lecture (GET) : pas de clé', () => {
    expect(acquireIdempotencyKey('get', '/api/products', undefined)).toBeNull()
  })

  it('double-clic : une requête identique en cours reprend la même clé', () => {
    const a = acquireIdempotencyKey('POST', '/api/cart', { productId: 1, qty: 1 })!
    const b = acquireIdempotencyKey('post', '/api/cart', { productId: 1, qty: 1 })!
    expect(b.key).toBe(a.key)
    a.release(); b.release()
  })

  it('une fois la réponse reçue, refaire la même action donne une nouvelle clé', () => {
    const a = acquireIdempotencyKey('POST', '/api/cart', { productId: 2 })!
    a.release()
    const b = acquireIdempotencyKey('POST', '/api/cart', { productId: 2 })!
    expect(b.key).not.toBe(a.key)
    b.release()
  })

  it('la clé reste partagée tant qu\'une des deux requêtes est en cours', () => {
    const a = acquireIdempotencyKey('PUT', '/api/products/1', { stock: 3 })!
    const b = acquireIdempotencyKey('PUT', '/api/products/1', { stock: 3 })!
    a.release(); a.release() // double release sans effet
    const c = acquireIdempotencyKey('PUT', '/api/products/1', { stock: 3 })!
    expect(c.key).toBe(b.key)
    b.release(); c.release()
    expect(acquireIdempotencyKey('PUT', '/api/products/1', { stock: 3 })!.key).not.toBe(b.key)
  })

  it('corps ou URL différents : clés différentes', () => {
    const a = acquireIdempotencyKey('PUT', '/api/products/1', { stock: 3 })!
    const b = acquireIdempotencyKey('PUT', '/api/products/1', { stock: 4 })!
    const c = acquireIdempotencyKey('PUT', '/api/products/2', { stock: 3 })!
    expect(new Set([a.key, b.key, c.key]).size).toBe(3)
    a.release(); b.release(); c.release()
  })

  it('fichiers (FormData) : clé unique à chaque envoi', () => {
    const f = new FormData()
    expect(acquireIdempotencyKey('POST', '/api/upload', f)!.key).not.toBe(acquireIdempotencyKey('POST', '/api/upload', f)!.key)
  })

  it('routes d\'authentification : jamais d\'en-tête (exclues côté serveur)', () => {
    expect(acquireIdempotencyKey('POST', 'https://api.skignas.com/api/auth/login', { email: 'x' })).toBeNull()
    expect(acquireIdempotencyKey('POST', '/api/auth/forgot-password', { email: 'x' })).toBeNull()
    expect(acquireIdempotencyKey('POST', '/api/authors', {})).not.toBeNull() // seul le préfixe exact /api/auth est exclu
  })

  it('clés conformes au format attendu par le serveur', () => {
    const { key, release } = acquireIdempotencyKey('DELETE', '/api/x', undefined)!
    expect(key).toMatch(/^[A-Za-z0-9_-]{8,128}$/)
    release()
  })
})

describe('installAxiosIdempotency', () => {
  type Cfg = { method?: string; url?: string; data?: unknown; headers: Record<string, unknown>; __idemRelease?: () => void }
  function fakeAxios() {
    let onRequest!: (c: Cfg) => Cfg
    let onOk!: (r: { config: Cfg }) => unknown
    const inst = { interceptors: {
      request: { use: (f: (c: Cfg) => Cfg) => { onRequest = f } },
      response: { use: (ok: (r: { config: Cfg }) => unknown) => { onOk = ok } },
    } }
    installAxiosIdempotency(inst)
    return { req: (c: Cfg) => onRequest(c), done: (c: Cfg) => onOk({ config: c }) }
  }

  it('ajoute la clé aux écritures et la conserve lors d\'un réessai', () => {
    const ax = fakeAxios()
    const c = ax.req({ method: 'put', url: '/api/products/9', data: { stock: 1 }, headers: {} })
    const key = c.headers[IDEMPOTENCY_HEADER]
    expect(key).toBeTypeOf('string')
    // réessai après refresh du jeton : même config, même clé
    expect(ax.req(c).headers[IDEMPOTENCY_HEADER]).toBe(key)
    ax.done(c)
    expect(ax.req({ method: 'get', url: '/api/products', headers: {} }).headers[IDEMPOTENCY_HEADER]).toBeUndefined()
  })
})
