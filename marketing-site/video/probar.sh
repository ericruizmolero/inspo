#!/bin/bash
# Regenera el vídeo de un idioma de punta a punta, en borrador, para comprobar que todo funciona.
# Uso: BASE=http://localhost:4321/ bash marketing-site/video/probar.sh <es|en>
# Deja el resultado en marketing-site/video/hf-<idioma>/renders/prueba-<idioma>.mp4
set -e
cd "$(dirname "$0")"
l="${1:-es}"
rm -rf "rec-$l"
node grabar.cjs "$l" "rec-$l" | tail -1
node montar.cjs "$l" "rec-$l" | tail -1
cd "hf-$l"
npx -y hyperframes@0.9.37 check 2>&1 | grep -E "error\(s\)" | head -1
npx -y hyperframes@0.9.37 render -q draft -o "renders/prueba-$l.mp4" 2>&1 | tail -2 | head -1
pkill -f chrome-headless-shell || true; pkill -f warmCheck || true
ffprobe -v error -show_entries format=duration -of csv=p=0 "renders/prueba-$l.mp4"
ffmpeg -hide_banner -nostats -i "renders/prueba-$l.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:" | tail -2
echo FIN
