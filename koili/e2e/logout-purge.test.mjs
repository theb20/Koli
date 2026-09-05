/* ─────────────────────────────────────────────────────────────
   Test e2e — purge de session au logout (Playwright, pas de framework de
   test existant dans ce projet). Vérifie que la déconnexion supprime
   immédiatement token/user/panier du localStorage, survit à un refresh, et
   qu'un second compte ne voit jamais les données du premier (voir
   AuthContext.tsx:purgeSession, lib/sessionPurge.ts, CartContext.tsx).

   Prérequis : backend (npm run dev, port 4000, RECAPTCHA_SECRET_KEY vide
   pour bypasser reCAPTCHA en local) et koili (VITE_API_URL=http://localhost:4000
   npx vite, port 3000) démarrés localement.

   Lancer : npm run test:e2e:logout (depuis koili/), ou directement
   node e2e/logout-purge.test.mjs
───────────────────────────────────────────────────────────── */
import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const API = 'http://localhost:4000'
const PASSWORD = 'TestPass123!'
const PRODUCT_ID = 113
const ts = Date.now()
const EMAIL_A = `logout-test-a-${ts}@example.com`
const EMAIL_B = `logout-test-b-${ts}@example.com`

let failures = 0
function ok(label, cond) {
  console.log(`${cond ? '✅' : '❌'} ${label}`)
  if (!cond) failures++
}

async function registerUser(email) {
  const res = await fetch(`${API}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prenom: 'Test', nom: 'Purge', email, password: PASSWORD, naissance: '1995-01-01' }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(`Échec inscription ${email}: ${json.message}`)
  return json.data.user.id
}

async function deleteAccount(token) {
  await fetch(`${API}/api/auth/account`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
}

async function getStorageSnapshot(page) {
  return page.evaluate(() => ({
    keys: Object.keys(localStorage),
    koli_token: localStorage.getItem('koli_token'),
    koli_user: localStorage.getItem('koli_user'),
    koli_cart: localStorage.getItem('koli_cart'),
    sessionStorageKeys: Object.keys(sessionStorage),
  }))
}

function cartIsEmpty(koliCartValue) {
  return koliCartValue === null || JSON.parse(koliCartValue).length === 0
}

async function dismissCookieBanner(page) {
  // Le banner n'apparaît qu'après un délai de 2.8s (voir CookieBanner.tsx) —
  // attendre explicitement plutôt que de vérifier immédiatement.
  const accept = page.getByText('Accepter', { exact: true })
  try {
    await accept.waitFor({ state: 'visible', timeout: 4000 })
    await accept.click()
    await page.waitForTimeout(200)
  } catch {
    // déjà accepté précédemment (consentement stocké) — rien à faire
  }
}

async function login(page, email) {
  await page.goto(`${BASE}/login`)
  await dismissCookieBanner(page)
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', PASSWORD)
  await page.getByText('Continuer', { exact: true }).click()
  await page.waitForFunction(() => !!localStorage.getItem('koli_token'), { timeout: 15000 })
  return page.evaluate(() => localStorage.getItem('koli_token'))
}

async function addToCartViaApi(page, token) {
  // Équivalent fonctionnel à cliquer "ajouter au panier" sur une fiche
  // produit, suivi d'un reload pour que CartContext hydrate depuis le
  // serveur — exactement le flux d'un utilisateur déjà connecté qui revient
  // sur le site.
  await page.evaluate(async ({ token, productId }) => {
    await fetch(`http://localhost:4000/api/cart/${productId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ qty: 2 }),
    })
  }, { token, productId: PRODUCT_ID })
  await page.reload()
  await page.waitForTimeout(1500) // laisse CartContext hydrater depuis le serveur
}

async function fetchServerCart(page, token) {
  return page.evaluate(async (token) => {
    const res = await fetch('http://localhost:4000/api/cart', { headers: { Authorization: `Bearer ${token}` } })
    return res.json()
  }, token)
}

async function run() {
  await registerUser(EMAIL_A)
  await registerUser(EMAIL_B)
  console.log(`Comptes de test créés : A=${EMAIL_A} B=${EMAIL_B}`)

  const browser = await chromium.launch()
  // "Mon Compte" (header) n'est rendu qu'à partir du breakpoint lg
  // (Tailwind, ~1024px) — viewport desktop explicite pour éviter un faux
  // échec dû à la taille de fenêtre par défaut de Playwright.
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage()

  console.log('\n=== Scénario 1 : login A, ajout panier, vérif localStorage ===')
  const tokenA = await login(page, EMAIL_A)
  let snap = await getStorageSnapshot(page)
  ok('koli_token présent après login', !!snap.koli_token)
  ok('koli_user présent après login', !!snap.koli_user)

  await addToCartViaApi(page, tokenA)
  snap = await getStorageSnapshot(page)
  ok('koli_cart ABSENT du localStorage une fois connecté (source de vérité = serveur)', snap.koli_cart === null)

  const cartA = await fetchServerCart(page, tokenA)
  ok('panier serveur A contient bien le produit ajouté', cartA.data?.length === 1 && cartA.data[0].qty === 2)

  console.log('\n=== Scénario 2 : logout → purge immédiate (vrai clic UI, header) ===')
  await page.getByText('Mon Compte', { exact: true }).click()
  await page.getByText('Se déconnecter', { exact: true }).click()
  await page.waitForTimeout(500)
  snap = await getStorageSnapshot(page)
  ok('koli_token supprimé immédiatement après logout', snap.koli_token === null)
  ok('koli_user supprimé immédiatement après logout', snap.koli_user === null)
  ok('koli_cart absent/vide immédiatement après logout', cartIsEmpty(snap.koli_cart))

  console.log('\n=== Scénario 3 : hard refresh après logout ===')
  await page.reload()
  await page.waitForTimeout(500)
  snap = await getStorageSnapshot(page)
  ok('après refresh, toujours déconnecté (pas de koli_token)', snap.koli_token === null)
  ok('après refresh, panier toujours vide', cartIsEmpty(snap.koli_cart))

  console.log('\n=== Scénario 4 : route privée après logout ===')
  await page.goto(`${BASE}/profil`)
  await page.waitForTimeout(800)
  ok('redirigé vers /login en accédant à /profil déconnecté', page.url().includes('/login'))

  console.log('\n=== Scénario 5 : logout depuis une page privée + bouton retour ===')
  await login(page, EMAIL_A)
  await page.goto(`${BASE}/profil`)
  await page.waitForTimeout(500)
  ok('page /profil accessible connecté', page.url().includes('/profil'))
  // ProfilPage a son propre layout (sidebar "Se déconnecter" → modale de
  // confirmation), pas le header partagé — deux clics : le déclencheur,
  // puis le bouton de confirmation dans la modale.
  await page.getByText('Se déconnecter', { exact: true }).click()
  await page.getByRole('button', { name: 'Se déconnecter' }).last().click()
  await page.waitForTimeout(500)
  // handleLogout() navigue vers "/" (pas "/login") — comportement normal de
  // l'app : ce qui compte est que /profil ne reste plus affichée.
  ok('logout depuis /profil quitte immédiatement la page privée (sans reload)', !page.url().includes('/profil'))
  await page.goBack()
  await page.waitForTimeout(500)
  ok('retour navigateur ne réaffiche pas /profil avec données privées',
    !page.url().includes('/profil') || (await getStorageSnapshot(page)).koli_token === null)

  console.log('\n=== Scénario 6 : compte B ne voit jamais le panier de A ===')
  const tokenB = await login(page, EMAIL_B)
  snap = await getStorageSnapshot(page)
  const cartB = await fetchServerCart(page, tokenB)
  ok('panier serveur B est vide (aucune fuite du panier A)', Array.isArray(cartB.data) && cartB.data.length === 0)
  ok('localStorage koli_cart vide/absent pour B juste après login', cartIsEmpty(snap.koli_cart))

  await browser.close()

  console.log('\nNettoyage des comptes de test...')
  await deleteAccount(tokenA)
  await deleteAccount(tokenB)

  console.log(`\n${failures === 0 ? '✅ TOUS LES TESTS PASSENT' : `❌ ${failures} ÉCHEC(S)`}`)
  process.exit(failures === 0 ? 0 : 1)
}

run().catch(err => { console.error(err); process.exit(1) })
