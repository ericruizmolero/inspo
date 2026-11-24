#!/bin/bash
# Enseña en vivo en qué va la regeneración del vídeo (probar.sh). Uso: bash marketing-site/video/progreso.sh   (Ctrl+C para salir)
cd "$(dirname "$0")"
while true; do
  clear; echo "Vídeo de la portada · $(date +%H:%M:%S)"; echo
  for l in es en; do
    f=$(ls rec-$l/f 2>/dev/null | wc -l | tr -d ' '); r=hf-$l/renders/prueba-$l.mp4
    if pgrep -f "grabar.cjs $l" >/dev/null; then st="grabando la demo · $f fotogramas (~2800 al acabar)"
    elif pgrep -f "montar.cjs $l" >/dev/null; then st="montando: voz, cortes y música"
    elif pgrep -f "hyperframes" >/dev/null && [ -d hf-$l ] && [ "$(find hf-$l -newer rec-$l/marks.json -name index.html 2>/dev/null)" ] && [ ! -f "$r" -o "$r" -ot hf-$l/index.html ]; then st="renderizando el borrador"
    elif [ -f "$r" ] && [ ! "$r" -ot "rec-$l/marks.json" ]; then st="listo · $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$r" | cut -c1-4) s · $(date -r "$r" +%H:%M)"
    elif [ -d rec-$l ]; then st="a medias ($f fotogramas)"
    else st="en espera"; fi
    printf "  %s  %s\n" "$l" "$st"
  done
  sleep 2
done
