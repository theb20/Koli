#!/usr/bin/env bash
#
# security-audit.sh — orchestre l'ensemble des scanners de sécurité du
# projet Skignas et regroupe leurs résultats dans security-reports/.
#
# Usage :
#   ./security-audit.sh            # audit complet (statique + live)
#   ./security-audit.sh --static   # uniquement SAST/secrets/dépendances (pas de requêtes réseau)
#   ./security-audit.sh --live     # uniquement les checks contre les domaines en prod (headers, TLS)
#
# Volontairement absents (voir security-reports/README.md pour le détail) :
#   - OWASP ZAP / Nuclei (scanners ACTIFS — le backend local pointe sur la
#     vraie base Postgres de production, aucun environnement de staging
#     séparé n'existe ; un scan actif risquerait de corrompre de vraies
#     données) — décision explicite, pas un oubli.
#   - SonarQube (nécessite un serveur dédié — Semgrep + Bearer + ESLint déjà
#     configuré dans le projet couvrent l'essentiel de ce qu'il apporterait).
#   - Dockle (nécessite un daemon Docker, absent de cette machine).
#   - kube-bench (aucun cluster Kubernetes dans ce projet — Railway/Firebase).
#
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

REPORT_DIR="$ROOT_DIR/security-reports"
RAW_DIR="$REPORT_DIR/raw"
TS="$(date +%Y-%m-%dT%H-%M-%S)"
mkdir -p "$RAW_DIR"

MODE="${1:-full}" # full | --static | --live

NODE_PROJECTS=(backend koili koli-marchand koli-admin koli-business)
DOCKERFILES=(stockgo/Dockerfile merchantgo/Dockerfile)
LIVE_HOSTS=(skignas.com api.skignas.com business.skignas.com)

log() { printf '\n\033[1;34m▸ %s\033[0m\n' "$1"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn(){ printf '  \033[33m!\033[0m %s\n' "$1"; }

# ── SAST — Semgrep ──────────────────────────────────────────────────
run_semgrep() {
  log "Semgrep (SAST — XSS, SQLi, SSRF, RCE, path traversal...)"
  semgrep scan \
    --config p/owasp-top-ten --config p/security-audit --config p/secrets \
    --config p/javascript --config p/typescript --config p/expressjs --config p/react --config p/nodejsscan \
    --exclude node_modules --exclude dist --exclude build --exclude .firebase \
    --json --output "$RAW_DIR/semgrep.json" \
    --quiet . 2>"$RAW_DIR/semgrep.stderr.log"
  ok "→ raw/semgrep.json"
}

# ── Secrets — Gitleaks ───────────────────────────────────────────────
run_gitleaks() {
  log "Gitleaks (secrets — clés API, tokens, mots de passe)"
  gitleaks detect \
    --source . --report-format json --report-path "$RAW_DIR/gitleaks.json" \
    --no-banner --redact 2>"$RAW_DIR/gitleaks.stderr.log"
  ok "→ raw/gitleaks.json"
}

# ── Dépendances — Trivy (filesystem, pas besoin de Docker) ──────────
run_trivy() {
  log "Trivy (CVE npm/Go)"
  trivy fs --scanners vuln --format json --output "$RAW_DIR/trivy-fs.json" \
    --skip-dirs node_modules --skip-dirs dist --skip-dirs build \
    . 2>"$RAW_DIR/trivy-fs.stderr.log"
  ok "→ raw/trivy-fs.json"

  log "Trivy (configuration des Dockerfile)"
  for df in "${DOCKERFILES[@]}"; do
    [ -f "$df" ] || continue
    name=$(echo "$df" | tr '/' '_')
    trivy config --format json --output "$RAW_DIR/trivy-config-$name.json" "$df" 2>>"$RAW_DIR/trivy-config.stderr.log"
  done
  ok "→ raw/trivy-config-*.json"
}

# ── Sécurité API / données sensibles — Bearer ────────────────────────
run_bearer() {
  log "Bearer CLI (JWT, données sensibles, sécurité API)"
  bearer scan backend --format json --output "$RAW_DIR/bearer-backend.json" \
    --skip-path node_modules --quiet 2>"$RAW_DIR/bearer.stderr.log" || true
  ok "→ raw/bearer-backend.json"
}

# ── npm audit (par projet Node) ──────────────────────────────────────
run_npm_audit() {
  log "npm audit (par projet)"
  for proj in "${NODE_PROJECTS[@]}"; do
    [ -f "$proj/package.json" ] || continue
    (cd "$proj" && npm audit --json > "$RAW_DIR/npm-audit-$proj.json" 2>"$RAW_DIR/npm-audit-$proj.stderr.log")
    ok "→ raw/npm-audit-$proj.json"
  done
}

# ── Headers HTTP + CSP — équivalent Mozilla Observatory ──────────────
run_headers() {
  log "Headers HTTP / CSP (domaines en production, lecture seule)"
  for host in "${LIVE_HOSTS[@]}"; do
    curl -sS -D - "https://$host/" -o /dev/null > "$RAW_DIR/headers-$host.txt" 2>"$RAW_DIR/headers-$host.stderr.log"
    ok "→ raw/headers-$host.txt"
  done
  # API Mozilla Observatory (si disponible) — best-effort, ne bloque jamais l'audit
  for host in "${LIVE_HOSTS[@]}"; do
    curl -sS -m 20 "https://observatory-api.mdn.mozilla.net/api/v2/scan?host=$host" \
      -X POST -o "$RAW_DIR/observatory-$host.json" 2>>"$RAW_DIR/observatory.stderr.log" || true
  done
}

# ── SSL/TLS — testssl.sh ──────────────────────────────────────────────
run_testssl() {
  log "testssl.sh (chiffrement, certificats, protocoles TLS)"
  for host in "${LIVE_HOSTS[@]}"; do
    testssl.sh --quiet --jsonfile "$RAW_DIR/testssl-$host.json" "$host" \
      > "$RAW_DIR/testssl-$host.log" 2>&1
    ok "→ raw/testssl-$host.json"
  done
}

STATIC_STEPS=(run_semgrep run_gitleaks run_trivy run_bearer run_npm_audit)
LIVE_STEPS=(run_headers run_testssl)

case "$MODE" in
  --static) STEPS=("${STATIC_STEPS[@]}") ;;
  --live)   STEPS=("${LIVE_STEPS[@]}") ;;
  *)        STEPS=("${STATIC_STEPS[@]}" "${LIVE_STEPS[@]}") ;;
esac

echo "═══════════════════════════════════════════════════════════"
echo "  Audit de sécurité Skignas — $TS"
echo "═══════════════════════════════════════════════════════════"

for step in "${STEPS[@]}"; do "$step"; done

log "Fusion des résultats"
node "$ROOT_DIR/security-reports/merge-reports.mjs" "$RAW_DIR" "$REPORT_DIR" "$TS"
ok "→ security-reports/SUMMARY.md"
ok "→ security-reports/dashboard.html"

echo
echo "═══════════════════════════════════════════════════════════"
echo "  Terminé — voir security-reports/SUMMARY.md et dashboard.html"
echo "═══════════════════════════════════════════════════════════"
