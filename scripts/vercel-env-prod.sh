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
add MAIL_FROM           "Inspo · Savvia <inspo@savvia.studio>"
add MAIL_REPLY_TO       "hola@savvia.studio"
v="$(val ADMIN_EMAILS)"; [ -n "$v" ] && add ADMIN_EMAILS "$v"
# Proveedores sociales: solo se suben los que tengan valor en .env.local
for k in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET APPLE_CLIENT_ID APPLE_CLIENT_SECRET TWITTER_CLIENT_ID TWITTER_CLIENT_SECRET; do
  v="$(val "$k")"; [ -n "$v" ] && add "$k" "$v"
done
echo; vercel env ls production
