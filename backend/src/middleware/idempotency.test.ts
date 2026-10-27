import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('../lib/prisma', () => ({ prisma: {} }))
import express from 'express'
import request from 'supertest'
import { idempotency, type IdempotencyStore, type IdempotencyRecord } from './idempotency'
import { signAccessToken } from '../lib/jwt'

/** Stockage en mémoire, même contrat que la table idempotency_keys. */
function memoryStore(): IdempotencyStore & { rows: Map<string, IdempotencyRecord> } {
  const rows = new Map<string, IdempotencyRecord>()
  const id = (s: string, k: string) => `${s}|${k}`
  return {
    rows,
    async find(s, k) { return rows.get(id(s, k)) ?? null },
    async create(s, k, fingerprint) {
      if (rows.has(id(s, k))) return false
      rows.set(id(s, k), { fingerprint, status: 'processing', responseCode: null, responseBody: null, lockedAt: new Date() })
      return true
    },
    async takeOver(s, k, staleBefore) {
      const r = rows.get(id(s, k))
      if (!r || r.status !== 'processing' || r.lockedAt >= staleBefore) return false
      r.lockedAt = new Date(); return true
    },
    async complete(s, k, code, body) { const r = rows.get(id(s, k))!; r.status = 'completed'; r.responseCode = code; r.responseBody = body },
    async release(s, k) { if (rows.get(id(s, k))?.status === 'processing') rows.delete(id(s, k)) },
    async purgeExpired() {},
  }
}

let store: ReturnType<typeof memoryStore>
let calls: number
let respond: (req: express.Request, res: express.Response) => void

function app(opts: Parameters<typeof idempotency>[0] = {}) {
  const a = express()
  a.use(express.json())
  a.use('/api', idempotency({ store, exclude: [/^\/auth(\/|$)/], waitMs: 2_000, ...opts }))
  a.all('/api/*', (req, res) => { calls++; respond(req, res) })
  return a
}

beforeEach(() => {
  store = memoryStore()
  calls = 0
  respond = (req, res) => { res.status(201).json({ success: true, n: calls, body: req.body }) }
})

const KEY = 'cle-test-0001'

describe('Idempotency-Key', () => {
  it('sans en-tête : aucune protection, chaque requête est exécutée', async () => {
    const a = app()
    await request(a).post('/api/orders').send({ x: 1 })
    await request(a).post('/api/orders').send({ x: 1 })
    expect(calls).toBe(2)
  })

  it('même clé rejouée : action exécutée une seule fois, réponse identique', async () => {
    const a = app()
    const r1 = await request(a).post('/api/orders').set('Idempotency-Key', KEY).send({ x: 1 })
    const r2 = await request(a).post('/api/orders').set('Idempotency-Key', KEY).send({ x: 1 })
    expect(calls).toBe(1)
    expect(r2.status).toBe(201)
    expect(r2.body).toEqual(r1.body)
    expect(r2.headers['idempotent-replayed']).toBe('true')
    expect(r1.headers['idempotent-replayed']).toBeUndefined()
  })

  it('l\'ordre des clés du corps ne change pas l\'empreinte', async () => {
    const a = app()
    await request(a).post('/api/orders').set('Idempotency-Key', KEY).send({ a: 1, b: 2 })
    const r2 = await request(a).post('/api/orders').set('Idempotency-Key', KEY).send({ b: 2, a: 1 })
    expect(calls).toBe(1)
    expect(r2.status).toBe(201)
  })

  it('même clé pour une autre requête : 422, rien n\'est exécuté', async () => {
    const a = app()
    await request(a).post('/api/orders').set('Idempotency-Key', KEY).send({ x: 1 })
    const other = await request(a).post('/api/orders').set('Idempotency-Key', KEY).send({ x: 2 })
    const otherUrl = await request(a).post('/api/cart').set('Idempotency-Key', KEY).send({ x: 1 })
    expect(other.status).toBe(422)
    expect(otherUrl.status).toBe(422)
    expect(calls).toBe(1)
  })

  it('double-clic simultané : une seule exécution, les deux reçoivent le même résultat', async () => {
    respond = (req, res) => { setTimeout(() => res.status(201).json({ success: true, n: calls }), 300) }
    const a = app()
    const [r1, r2] = await Promise.all([
      request(a).post('/api/orders').set('Idempotency-Key', KEY).send({ x: 1 }),
      request(a).post('/api/orders').set('Idempotency-Key', KEY).send({ x: 1 }),
    ])
    expect(calls).toBe(1)
    expect([r1.status, r2.status]).toEqual([201, 201])
    expect(r1.body).toEqual(r2.body)
  })

  it('requête identique trop longue : 409 avec Retry-After', async () => {
    respond = (_req, res) => { setTimeout(() => res.status(201).json({ ok: true }), 600) }
    const a = app({ waitMs: 100 })
    const first = request(a).post('/api/orders').set('Idempotency-Key', KEY).send({}).then(r => r) // .then() envoie la requête tout de suite
    await new Promise(r => setTimeout(r, 50))
    const second = await request(a).post('/api/orders').set('Idempotency-Key', KEY).send({})
    expect(second.status).toBe(409)
    expect(second.headers['retry-after']).toBe('2')
    expect((await first).status).toBe(201)
  })

  it('erreur 5xx : non enregistrée, la même clé peut être réessayée', async () => {
    respond = (_req, res) => { res.status(calls === 1 ? 500 : 201).json({ n: calls }) }
    const a = app()
    expect((await request(a).post('/api/orders').set('Idempotency-Key', KEY).send({})).status).toBe(500)
    expect((await request(a).post('/api/orders').set('Idempotency-Key', KEY).send({})).status).toBe(201)
    expect(calls).toBe(2)
  })

  it('401 (jeton expiré) : non enregistrée, rejouable après rafraîchissement', async () => {
    respond = (_req, res) => { res.status(calls === 1 ? 401 : 200).json({ n: calls }) }
    const a = app()
    await request(a).put('/api/products/1').set('Idempotency-Key', KEY).send({ stock: 3 })
    const r = await request(a).put('/api/products/1').set('Idempotency-Key', KEY).send({ stock: 3 })
    expect(r.status).toBe(200)
    expect(calls).toBe(2)
  })

  it('les erreurs métier 4xx sont figées (pas de ré-exécution)', async () => {
    respond = (_req, res) => { res.status(400).json({ success: false, message: 'Stock insuffisant' }) }
    const a = app()
    await request(a).post('/api/orders').set('Idempotency-Key', KEY).send({})
    const r = await request(a).post('/api/orders').set('Idempotency-Key', KEY).send({})
    expect(r.status).toBe(400)
    expect(r.headers['idempotent-replayed']).toBe('true')
    expect(calls).toBe(1)
  })

  it('une clé n\'est jamais rejouable par un autre utilisateur', async () => {
    const a = app()
    const alice = signAccessToken({ userId: 'alice', email: 'a@x.test', role: 'customer' })
    const bob = signAccessToken({ userId: 'bob', email: 'b@x.test', role: 'customer' })
    await request(a).post('/api/orders').set('Authorization', `Bearer ${alice}`).set('Idempotency-Key', KEY).send({ x: 1 })
    const r = await request(a).post('/api/orders').set('Authorization', `Bearer ${bob}`).set('Idempotency-Key', KEY).send({ x: 1 })
    expect(r.headers['idempotent-replayed']).toBeUndefined()
    expect(calls).toBe(2)
    expect([...store.rows.keys()].sort()).toEqual([`u:alice|${KEY}`, `u:bob|${KEY}`])
  })

  it('clé invalide : 400 ; GET et chemins exclus : ignorés', async () => {
    const a = app()
    expect((await request(a).post('/api/orders').set('Idempotency-Key', 'court').send({})).status).toBe(400)
    await request(a).get('/api/orders').set('Idempotency-Key', KEY)
    await request(a).get('/api/orders').set('Idempotency-Key', KEY)
    await request(a).post('/api/auth/login').set('Idempotency-Key', KEY).send({})
    await request(a).post('/api/auth/login').set('Idempotency-Key', KEY).send({})
    expect(calls).toBe(4)
  })

  it('traitement abandonné (plantage) : repris après expiration du verrou', async () => {
    store.rows.set(`anon|${KEY}`, { fingerprint: 'x', status: 'processing', responseCode: null, responseBody: null, lockedAt: new Date(0) })
    // même empreinte que la requête ci-dessous
    const { requestFingerprint } = await import('./idempotency')
    store.rows.get(`anon|${KEY}`)!.fingerprint = requestFingerprint({ method: 'POST', originalUrl: '/api/orders', body: {} })
    const r = await request(app({ staleMs: 1_000 })).post('/api/orders').set('Idempotency-Key', KEY).send({})
    expect(r.status).toBe(201)
    expect(calls).toBe(1)
  })

  it('stockage indisponible : la requête est traitée normalement', async () => {
    store.create = async () => { throw new Error('db down') }
    const r = await request(app()).post('/api/orders').set('Idempotency-Key', KEY).send({})
    expect(r.status).toBe(201)
    expect(calls).toBe(1)
  })
})
