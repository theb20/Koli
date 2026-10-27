/* ─────────────────────────────────────────────────────────────
   Idempotence des écritures — en-tête `Idempotency-Key` (même principe
   que Stripe), appliqué à TOUTES les requêtes POST/PUT/PATCH/DELETE de
   l'API qui le portent. Les clients web (koili, koli-admin, koli-marchand,
   koli-business) l'ajoutent automatiquement (voir leur lib/idempotency.ts).

   Pour une même clé ET un même utilisateur :
   - requête déjà traitée           → réponse enregistrée renvoyée telle quelle
                                      (en-tête Idempotent-Replayed: true), sans
                                      ré-exécuter l'action ;
   - requête identique en cours     → on attend sa fin (double-clic) puis on
                                      renvoie son résultat ; 409 si trop long ;
   - clé réutilisée pour une AUTRE  → 422 (méthode, URL ou corps différents).
     requête
   Ne sont PAS enregistrés (la clé reste réutilisable pour réessayer) : 5xx,
   401 (le client rafraîchit son jeton puis rejoue la même clé), 408, 429,
   connexion coupée avant la réponse.

   Hors périmètre (idempotence propre, ou réponses non rejouables) :
   /auth (jetons + cookies), /internal et /payments (appels serveur à
   serveur et webhooks, déjà idempotents côté métier).
   Complète — ne remplace pas — les idempotences métier existantes
   (Order.clientRequestId, états des retours/paiements, merchantgo).
───────────────────────────────────────────────────────────── */
import { createHash } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { verifyAccessToken } from '../lib/jwt'
import { logger } from '../lib/logger'

export const IDEMPOTENCY_HEADER = 'Idempotency-Key'
const KEY_RE = /^[A-Za-z0-9_-]{8,128}$/
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
/** Réponses jamais figées : le client doit pouvoir réessayer avec la même clé. */
const RETRYABLE = new Set([401, 408, 429])
const MAX_BODY_BYTES = 512 * 1024

export type IdempotencyRecord = {
  fingerprint: string
  status: 'processing' | 'completed'
  responseCode: number | null
  responseBody: unknown
  lockedAt: Date
}

export interface IdempotencyStore {
  find(scope: string, key: string): Promise<IdempotencyRecord | null>
  /** false si la clé existe déjà (course entre deux requêtes). */
  create(scope: string, key: string, fingerprint: string, expiresAt: Date): Promise<boolean>
  /** Reprend un traitement abandonné (verrou plus ancien que staleBefore). */
  takeOver(scope: string, key: string, staleBefore: Date): Promise<boolean>
  complete(scope: string, key: string, code: number, body: unknown): Promise<void>
  release(scope: string, key: string): Promise<void>
  purgeExpired(now: Date): Promise<void>
}

export const prismaIdempotencyStore: IdempotencyStore = {
  async find(scope, key) {
    const r = await prisma.idempotencyKey.findUnique({ where: { scope_key: { scope, key } } })
    return r && { fingerprint: r.fingerprint, status: r.status as IdempotencyRecord['status'], responseCode: r.responseCode, responseBody: r.responseBody, lockedAt: r.lockedAt }
  },
  async create(scope, key, fingerprint, expiresAt) {
    try {
      await prisma.idempotencyKey.create({ data: { scope, key, fingerprint, expiresAt } })
      return true
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') return false
      throw err
    }
  },
  async takeOver(scope, key, staleBefore) {
    const r = await prisma.idempotencyKey.updateMany({ where: { scope, key, status: 'processing', lockedAt: { lt: staleBefore } }, data: { lockedAt: new Date() } })
    return r.count === 1
  },
  async complete(scope, key, code, body) {
    await prisma.idempotencyKey.update({
      where: { scope_key: { scope, key } },
      data:  { status: 'completed', responseCode: code, responseBody: body as Prisma.InputJsonValue },
    })
  },
  async release(scope, key) {
    await prisma.idempotencyKey.deleteMany({ where: { scope, key, status: 'processing' } })
  },
  async purgeExpired(now) {
    await prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: now } } })
  },
}

/** JSON à clés triées : { a, b } et { b, a } donnent la même empreinte. */
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as object).sort().map(k => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

export function requestFingerprint(req: Pick<Request, 'method' | 'originalUrl' | 'body'>): string {
  return createHash('sha256').update(`${req.method} ${req.originalUrl} ${stable(req.body)}`).digest('hex')
}

/** Identité vérifiée uniquement (jamais un jeton non signé) — sinon "anon". */
function scopeOf(req: Request): string {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try { return `u:${verifyAccessToken(auth.slice(7)).userId}` } catch { /* jeton expiré/invalide : anonyme */ }
  }
  return 'anon'
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

type Options = {
  store?: IdempotencyStore
  /** Chemins (relatifs au point de montage) exclus. */
  exclude?: RegExp[]
  ttlMs?: number
  /** Attente max d'une requête identique en cours avant 409. */
  waitMs?: number
  /** Au-delà, un traitement "processing" est considéré abandonné. */
  staleMs?: number
}

export function idempotency(opts: Options = {}) {
  const store = opts.store ?? prismaIdempotencyStore
  const exclude = opts.exclude ?? []
  const ttlMs = opts.ttlMs ?? 24 * 3600 * 1000
  const waitMs = opts.waitMs ?? 15_000
  const staleMs = opts.staleMs ?? 60_000
  let lastPurge = 0

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.get(IDEMPOTENCY_HEADER)
    if (!key || !MUTATING.has(req.method) || exclude.some(r => r.test(req.path))) { next(); return }
    if (!KEY_RE.test(key)) {
      res.status(400).json({ success: false, message: `En-tête ${IDEMPOTENCY_HEADER} invalide (8 à 128 caractères : lettres, chiffres, - et _)` })
      return
    }

    try {
      const now = Date.now()
      if (now - lastPurge > 3600_000) {
        lastPurge = now
        store.purgeExpired(new Date(now)).catch(err => logger.error('[idempotency] purge', err))
      }

      const scope = scopeOf(req)
      const fingerprint = requestFingerprint(req)

      if (await store.create(scope, key, fingerprint, new Date(now + ttlMs))) {
        capture(req, res, store, scope, key)
        next()
        return
      }

      // Clé déjà connue : rejouer, attendre, ou refuser.
      const deadline = Date.now() + waitMs
      for (;;) {
        const rec = await store.find(scope, key)
        if (!rec) {
          // Libérée entre-temps (échec 5xx de la première) : on retente comme neuve.
          if (await store.create(scope, key, fingerprint, new Date(Date.now() + ttlMs))) {
            capture(req, res, store, scope, key)
            next()
            return
          }
          continue
        }
        if (rec.fingerprint !== fingerprint) {
          res.status(422).json({ success: false, message: 'Cette clé d\'idempotence a déjà servi pour une autre requête.' })
          return
        }
        if (rec.status === 'completed') {
          res.set('Idempotent-Replayed', 'true').status(rec.responseCode ?? 200).json(rec.responseBody)
          return
        }
        if (rec.lockedAt.getTime() < Date.now() - staleMs && await store.takeOver(scope, key, new Date(Date.now() - staleMs))) {
          capture(req, res, store, scope, key)
          next()
          return
        }
        if (Date.now() >= deadline) {
          res.set('Retry-After', '2').status(409).json({ success: false, message: 'Une requête identique est déjà en cours de traitement.' })
          return
        }
        await sleep(150)
      }
    } catch (err) {
      // Le stockage des clés ne doit jamais bloquer l'application : on
      // traite la requête normalement (sans garantie d'idempotence).
      logger.error('[idempotency] stockage indisponible, requête traitée sans protection', err)
      next()
    }
  }
}

/** Enregistre la réponse JSON finale ; libère la clé si elle n'est pas figeable. */
function capture(_req: Request, res: Response, store: IdempotencyStore, scope: string, key: string) {
  let body: unknown
  let captured = false
  const originalJson = res.json.bind(res)
  res.json = ((b: unknown) => { body = b; captured = true; return originalJson(b) }) as typeof res.json

  let settled = false
  const settle = (finished: boolean) => {
    if (settled) return
    settled = true
    const code = res.statusCode
    const storable = finished && captured && code < 500 && !RETRYABLE.has(code)
      && Buffer.byteLength(JSON.stringify(body ?? null)) <= MAX_BODY_BYTES
    const op = storable ? store.complete(scope, key, code, body ?? null) : store.release(scope, key)
    op.catch(err => logger.error('[idempotency] enregistrement de la réponse', err))
  }
  res.on('finish', () => settle(true))
  res.on('close', () => settle(false)) // coupé avant la fin → la clé redevient utilisable
}
