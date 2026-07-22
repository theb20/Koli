# ── Build ────────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bin/server ./cmd/server

# ── Runtime ──────────────────────────────────────────────────────────
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata su-exec && \
    addgroup -S stockgo && adduser -S stockgo -G stockgo

WORKDIR /app
COPY --from=builder /app/bin/server /app/server
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Point de montage attendu pour le Volume Railway. Le conteneur démarre en
# root (nécessaire pour corriger la propriété du Volume à chaque démarrage
# — voir entrypoint.sh) puis descend en privilèges vers l'utilisateur
# applicatif non-root avant d'exécuter le serveur.
RUN mkdir -p /storage && chown -R stockgo:stockgo /storage /app

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
