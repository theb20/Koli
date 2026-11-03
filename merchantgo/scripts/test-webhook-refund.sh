#!/usr/bin/env bash
# Envoie un faux webhook GeniusPay "payment.refunded" à merchantgo, pour
# tester en sandbox le chemin de confirmation de remboursement SANS
# attendre un vrai remboursement fait sur le dashboard GeniusPay.
#
# Prérequis (l'un OU l'autre selon ce que tu testes) :
#   - un PaymentIntent existe déjà côté merchantgo pour cette référence
#     (créé par un vrai paiement sandbox passé par le checkout koili) ;
#   - ET, si tu testes le remboursement DIRECT d'une commande (POST
#     /api/orders/:id/refund côté backend/) : la commande correspondante
#     doit déjà être au statut paymentStatus="refund_pending" (sinon ce
#     script confirmera juste côté merchantgo, sans rien à réconcilier
#     côté backend — réponse 200 quand même, voir internal.ts mark-refunded).
#
# Usage :
#   GENIUSPAY_WEBHOOK_SECRET=<valeur réelle de l'env merchantgo> \
#   MERCHANTGO_URL=http://localhost:8080 \
#   ./scripts/test-webhook-refund.sh [reference]
#
# Ne JAMAIS committer la vraie valeur de GENIUSPAY_WEBHOOK_SECRET — elle
# est lue depuis l'environnement, jamais en dur ici.

set -euo pipefail

if [ -z "${GENIUSPAY_WEBHOOK_SECRET:-}" ]; then
  echo "Erreur : GENIUSPAY_WEBHOOK_SECRET non défini dans l'environnement." >&2
  echo "C'est le même secret que GENIUSPAY_WEBHOOK_SECRET dans merchantgo/.env (ou la variable Railway en prod)." >&2
  exit 1
fi

MERCHANTGO_URL="${MERCHANTGO_URL:-http://localhost:8080}"
REFERENCE="${1:-SANDBOX_RJUEMVI28YCRUTI2}"

BODY=$(printf '{"event":"payment.refunded","data":{"reference":"%s"}}' "$REFERENCE")

# HMAC-SHA256(secret, corps BRUT) en hex — doit reproduire EXACTEMENT
# geniuspay.VerifyWebhookSignature côté Go (merchantgo/internal/geniuspay/client.go).
SIGNATURE=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$GENIUSPAY_WEBHOOK_SECRET" | sed 's/^.* //')

echo "→ POST ${MERCHANTGO_URL}/api/v1/webhooks/geniuspay"
echo "→ reference: ${REFERENCE}"
echo ""

curl -s -i -X POST "${MERCHANTGO_URL}/api/v1/webhooks/geniuspay" \
  -H "Content-Type: application/json" \
  -H "X-GeniusPay-Signature: ${SIGNATURE}" \
  -d "${BODY}"

echo ""
