/**
 * Test de charge k6 — skignas.com (front) + api.skignas.com (backend public)
 *
 * ⚠️  Cible la PRODUCTION par défaut. C'est un vrai site avec de vrais
 * utilisateurs et un vrai backend (Railway) derrière — ce script ne fait que
 * des GET en lecture seule (aucune inscription, connexion, panier ou
 * commande n'est simulée), mais monter les VUs trop haut peut quand même
 * ralentir le site pour de vrais visiteurs ou déclencher le rate limiting.
 *
 * Recommandations avant de lancer en prod :
 *   1. Fais un premier essai en pointant sur localhost (voir BASE_URL/API_BASE
 *      ci-dessous) pour vérifier que le script tourne correctement.
 *   2. Lance en prod à un horaire creux, avec peu de VUs d'abord.
 *   3. Augmente progressivement (voir le tableau `stages`) plutôt que de
 *      partir directement sur une charge lourde.
 *
 * Installation : brew install k6
 * Lancer :        k6 run scripts/k6-loadtest.js
 * Contre localhost : BASE_URL=http://localhost:3000 API_BASE=http://localhost:4000 k6 run scripts/k6-loadtest.js
 *
 * Le scénario définit ses propres `stages` (voir plus bas), donc les flags
 * --vus/--duration de k6 sont ignorés. Pour ajuster l'intensité, utilise la
 * variable d'environnement MAX_VUS à la place :
 *   MAX_VUS=50 k6 run scripts/k6-loadtest.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "https://skignas.com";
const API_BASE = __ENV.API_BASE || "https://api.skignas.com";

// Métriques custom pour distinguer front (statique) et back (API) dans les résultats.
const apiErrorRate = new Rate("api_errors");
const apiDuration = new Trend("api_duration", true);

// Le scénario ci-dessous définit ses propres `stages` — k6 ignore donc les
// flags CLI --vus/--duration (ils ne s'appliquent qu'en l'absence de
// `scenarios`). Pour changer l'intensité, utilise plutôt MAX_VUS :
//   MAX_VUS=50 k6 run scripts/k6-loadtest.js
const MAX_VUS = Number(__ENV.MAX_VUS || 10);

export const options = {
  scenarios: {
    // Montée en charge progressive — volontairement modeste par défaut.
    browsing: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: MAX_VUS }, // montée douce
        { duration: "1m", target: MAX_VUS }, // palier
        { duration: "30s", target: 0 }, // redescente
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // moins de 1% d'erreurs
    http_req_duration: ["p(95)<800"], // 95% des requêtes sous 800ms
    api_errors: ["rate<0.01"],
  },
};

function get(url, tags) {
  const res = http.get(url, { tags });
  check(res, { "status 200": (r) => r.status === 200 });
  return res;
}

export default function () {
  // 1. Page d'accueil (shell statique servi par Firebase Hosting)
  get(`${BASE_URL}/`, { name: "front:home" });
  sleep(randomThink());

  // 2. Catégories + produits mis en avant (API publique, cache court côté serveur)
  const categoriesRes = http.get(`${API_BASE}/api/categories`, { tags: { name: "api:categories" } });
  apiDuration.add(categoriesRes.timings.duration);
  apiErrorRate.add(categoriesRes.status !== 200);
  check(categoriesRes, { "categories 200": (r) => r.status === 200 });
  sleep(randomThink());

  // 3. Liste de produits (page catalogue)
  const productsRes = http.get(`${API_BASE}/api/products?limit=20`, { tags: { name: "api:products-list" } });
  apiDuration.add(productsRes.timings.duration);
  apiErrorRate.add(productsRes.status !== 200);
  check(productsRes, { "products 200": (r) => r.status === 200 });

  get(`${BASE_URL}/catalogue`, { name: "front:catalogue" });
  sleep(randomThink());

  // 4. Fiche produit — prend un produit réel dans la réponse si possible,
  //    sinon retombe sur la page catalogue seule (pas d'ID inventé en dur).
  let productId = null;
  if (productsRes.status === 200) {
    try {
      const body = JSON.parse(productsRes.body);
      const list = body?.data ?? body?.products ?? [];
      if (Array.isArray(list) && list.length > 0) {
        const pick = list[Math.floor(Math.random() * list.length)];
        productId = pick?.id ?? pick?._id ?? null;
      }
    } catch (e) {
      // réponse inattendue — on ignore simplement l'étape fiche produit
    }
  }

  if (productId) {
    const productRes = http.get(`${API_BASE}/api/products/${productId}`, { tags: { name: "api:product-detail" } });
    apiDuration.add(productRes.timings.duration);
    apiErrorRate.add(productRes.status !== 200);
    check(productRes, { "product detail 200": (r) => r.status === 200 });

    get(`${BASE_URL}/catalogue/${productId}`, { name: "front:product-page" });
  }

  sleep(randomThink());
}

// Petit temps de réflexion aléatoire entre les actions, pour imiter un vrai visiteur.
function randomThink() {
  return 1 + Math.random() * 2; // 1 à 3 secondes
}
