#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — Despliega el worker burgos-finanzas en Cloudflare
#
# Uso: ./scripts/deploy.sh
#
# Qué hace:
#   1. Lee los secretos de .dev.vars
#   2. wrangler deploy
#   3. Sube los secretos DESPUÉS del deploy (wrangler v4 los resetea si se
#      suben antes)
#   4. Imprime un resumen de los endpoints
#
# Requisitos:
#   - wrangler instalado y autenticado (wrangler login)
#   - .dev.vars relleno (ver .dev.vars.example)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .dev.vars ]; then
  echo "Falta .dev.vars — cópialo de .dev.vars.example y rellénalo." >&2
  exit 1
fi

echo "Leyendo secretos desde .dev.vars..."
set -a
# shellcheck disable=SC1091
. ./.dev.vars
set +a

ACCOUNT_ID=$(grep '^account_id' wrangler.toml | sed 's/.*= *"//; s/"//')

# Token OAuth que guardó `wrangler login`
WRANGLER_CONFIG="$HOME/.config/.wrangler/config/default.toml"
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  AUTH_TOKEN="$CLOUDFLARE_API_TOKEN"
elif [ -f "$WRANGLER_CONFIG" ]; then
  AUTH_TOKEN=$(grep 'oauth_token' "$WRANGLER_CONFIG" | sed 's/oauth_token = "//; s/"//')
else
  echo "No encuentro credenciales de Cloudflare. Ejecuta: wrangler login" >&2
  exit 1
fi

# Subir un secreto por la API de Cloudflare (más fiable que wrangler secret put
# con pipes)
upload_secret() {
  local name=$1 value=$2 result
  result=$(curl -s -X PUT \
    "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/scripts/burgos-finanzas/secrets" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"name\":\"${name}\",\"text\":\"${value}\",\"type\":\"secret_text\"}")
  if echo "$result" | grep -q '"success": *true'; then
    echo "  ✓ ${name}"
  else
    echo "  ✗ Error subiendo ${name}: $result" >&2
    exit 1
  fi
}

echo "Desplegando worker..."
wrangler deploy

echo ""
echo "Subiendo secretos..."
upload_secret "ANTHROPIC_API_KEY"     "$ANTHROPIC_API_KEY"
upload_secret "API_TOKEN"             "$API_TOKEN"
upload_secret "DROPBOX_APP_KEY"       "$DROPBOX_APP_KEY"
upload_secret "DROPBOX_APP_SECRET"    "$DROPBOX_APP_SECRET"
upload_secret "DROPBOX_REFRESH_TOKEN" "$DROPBOX_REFRESH_TOKEN"

cat <<'RESUMEN'

════════════════════════════════════════════════════════════════
  BURGOS FINANZAS — worker desplegado
════════════════════════════════════════════════════════════════

  Todas las rutas piden el header:  x-api-token: $API_TOKEN
  Las de datos aceptan  ?viaje=<slug>  (por defecto: burgos)

  GET    /health
  GET    /finanzas?viaje=burgos
  POST   /finanzas/gasto?viaje=burgos
  DELETE /finanzas/gasto/:id?viaje=burgos
  POST   /finanzas/cancelacion?viaje=burgos
  DELETE /finanzas/cancelacion/:id?viaje=burgos
  POST   /finanzas/ocr             multipart: imagen | JSON: imagen_b64

  Para añadir un viaje: una entrada más en VIAJES (src/index.js)
  y volver a ejecutar este script.

════════════════════════════════════════════════════════════════
RESUMEN
