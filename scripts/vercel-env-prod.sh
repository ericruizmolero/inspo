#!/usr/bin/env bash
# Sube a Vercel (Production) las variables de BD, auth y correo leyendo .env.local.
# Uso: bash scripts/vercel-env-prod.sh
set -euo pipefail
cd "$(dirname "$0")/.."
val() { grep "^$1=" .env.local | head -1 | cut -d= -f2-; }
add() {
  vercel env rm "$1" production --yes >/dev/null 2>&1 || true
  printf '%s' "$2" | vercel env add "$1" production >/dev/null && echo "✓ $1"
}
add DATABASE_URL        "$(val TURSO_DATABASE_URL)"
add DATABASE_AUTH_TOKEN "$(val TURSO_AUTH_TOKEN)"
add BETTER_AUTH_SECRET  "$(openssl rand -base64 32)"
add BETTER_AUTH_URL     "https://inspo.treseiscero.app"
add RESEND_API_KEY      "$(val RESEND_API_KEY)"
add MAIL_FROM           "Inspo <inspo@savvia.studio>"
echo; vercel env ls production
