/* ─────────────────────────────────────────────────────────────
   Idempotence des écritures — ajoute l'en-tête Idempotency-Key à chaque
   POST/PUT/PATCH/DELETE envoyé à NOS API (backend/src/middleware/
   idempotency.ts et merchantgo/internal/middleware/idempotency.go le
   lisent). Fichier identique dans koili, koli-admin, koli-marchand et
   koli-business : toute évolution se fait dans les quatre.

   - Une requête = une clé : un réessai de la MÊME requête (ex. après
     rafraîchissement du jeton) garde sa clé → jamais exécutée deux fois.
   - Double-clic : une requête identique (méthode + URL + corps) lancée
     pendant que la première est en cours reprend SA clé → le serveur
     n'exécute qu'une fois et renvoie le même résultat aux deux.
   - Réponse reçue → la clé est oubliée : refaire volontairement la même
     action plus tard (ex. « ajouter au panier » une 2e fois) reste possible.
   - Corps non sérialisable (FormData, fichier) : clé unique par requête.
───────────────────────────────────────────────────────────── */

export const IDEMPOTENCY_HEADER = 'Idempotency-Key'
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const inflight = new Map<string, { key: string; users: number }>()

export function newIdempotencyKey(): string {
  const c = globalThis.crypto
  // randomUUID exige un contexte sécurisé (https ou localhost) — repli sinon
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  return Array.from(c.getRandomValues(new Uint8Array(16)), (x: number) => x.toString(16).padStart(2, '0')).join('')
}

/** Empreinte du corps, ou null s'il n'est pas comparable (fichiers…). */
function bodyFingerprint(body: unknown): string | null {
  if (body == null) return ''
  if (typeof body === 'string') return body
  if (body instanceof URLSearchParams) return body.toString()
  if (typeof FormData !== 'undefined' && body instanceof FormData) return null
  if (typeof Blob !== 'undefined' && body instanceof Blob) return null
  if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) return null
  try { return JSON.stringify(body) } catch { return null }
}

/**
 * Clé d'idempotence d'une écriture (null pour une lecture). `release()`
 * doit être appelé quand la réponse est reçue (succès ou échec).
 */
export function acquireIdempotencyKey(method: string, url: string, body: unknown): { key: string; release: () => void } | null {
  const m = method.toUpperCase()
  if (!MUTATING.has(m)) return null
  // Authentification : exclue côté serveur (jetons + cookies non rejouables) —
  // inutile d'envoyer l'en-tête, et la connexion ne dépend ainsi jamais de lui.
  if (/\/api\/auth(\/|$|\?)/.test(url)) return null
  const fp = bodyFingerprint(body)
  if (fp === null) return { key: newIdempotencyKey(), release: () => {} }
  const id = `${m} ${url} ${fp}`
  let entry = inflight.get(id)
  if (entry) entry.users++
  else inflight.set(id, entry = { key: newIdempotencyKey(), users: 1 })
  let released = false
  return {
    key: entry.key,
    release: () => {
      if (released) return
      released = true
      const e = inflight.get(id)
      if (e && --e.users <= 0) inflight.delete(id)
    },
  }
}

/**
 * Enveloppe window.fetch une fois pour toutes : toutes les écritures vers
 * `apiOrigins` portent une clé, quel que soit l'endroit du code qui appelle
 * fetch. Les autres domaines (YouTube, CDN…) ne sont jamais touchés.
 */
export function installFetchIdempotency(apiOrigins: (string | undefined)[]): void {
  if (typeof window === 'undefined' || (window.fetch as { __idempotent?: boolean }).__idempotent) return
  const origins = new Set(apiOrigins.filter((u): u is string => !!u).map(u => new URL(u, window.location.href).origin))
  const original = window.fetch.bind(window)
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const req = input instanceof Request ? input : null
    let target: URL
    try { target = new URL(req ? req.url : input.toString(), window.location.href) } catch { return original(input, init) }
    if (!origins.has(target.origin)) return original(input, init)
    const headers = new Headers(init?.headers ?? req?.headers)
    if (headers.has(IDEMPOTENCY_HEADER)) return original(input, init)
    const idem = acquireIdempotencyKey(init?.method ?? req?.method ?? 'GET', target.pathname + target.search, init?.body)
    if (!idem) return original(input, init)
    headers.set(IDEMPOTENCY_HEADER, idem.key)
    try { return await original(input, { ...init, headers }) } finally { idem.release() }
  }
  ;(wrapped as { __idempotent?: boolean }).__idempotent = true
  window.fetch = wrapped as typeof window.fetch
}

/* Typage minimal d'une instance axios (évite d'imposer axios aux apps qui n'en ont pas). */
type HeadersLike = { has?: (h: string) => boolean; set?: (h: string, v: string) => unknown; [k: string]: unknown }
type ConfigLike = { method?: string; url?: string; baseURL?: string; data?: unknown; headers: HeadersLike; __idemRelease?: () => void }
type AxiosLike = {
  interceptors: {
    request: { use: (f: (c: ConfigLike) => ConfigLike) => unknown }
    response: { use: (ok: (r: { config: ConfigLike }) => unknown, ko: (e: { config?: ConfigLike }) => unknown) => unknown }
  }
}

/** Même comportement pour une instance axios (qui n'utilise pas fetch). */
export function installAxiosIdempotency(instance: unknown): void {
  const api = instance as AxiosLike
  api.interceptors.request.use(config => {
    const h = config.headers
    // Réessai (ex. après refresh du jeton) : la clé d'origine est conservée.
    if (h.has?.(IDEMPOTENCY_HEADER) || h[IDEMPOTENCY_HEADER]) return config
    const idem = acquireIdempotencyKey(config.method ?? 'get', `${config.baseURL ?? ''}${config.url ?? ''}`, config.data)
    if (!idem) return config
    if (h.set) h.set(IDEMPOTENCY_HEADER, idem.key)
    else h[IDEMPOTENCY_HEADER] = idem.key
    config.__idemRelease = idem.release
    return config
  })
  api.interceptors.response.use(
    res => { res.config.__idemRelease?.(); return res },
    err => { err.config?.__idemRelease?.(); return Promise.reject(err) },
  )
}
