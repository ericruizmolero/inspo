# Trae una pieza del Vault a la portada: baja su vista previa pública (app.criterio.design/api/vault/<slug>/preview,
# que se abre sin sesión) y la deja en public/assets/vault/vault/<nombre>.html, con sus fotos de Unsplash en local.
# Uso: python3 marketing-site/video/landing/traer-vault.py <slug de la pieza> <nombre del archivo, sin .html>
#   p. ej. python3 marketing-site/video/landing/traer-vault.py brick-helix-work-index helix
# Después, en plantilla.html: añadir vLive("<nombre>") a PIECES y su título y categoría a comps y cc (en es y en en),
# en la MISMA posición los tres, y volver a construir.
import os, re, subprocess, sys, urllib.request

slug, name = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'assets', 'vault', 'vault')
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
h = urllib.request.urlopen(f'https://app.criterio.design/api/vault/{slug}/preview').read().decode('utf-8')
# fuera lo que solo sirve al enlace compartido (icono de la app, tarjeta y canónica)
h = re.sub(r'<link[^>]+rel="(?:icon|canonical|apple-touch-icon)"[^>]*>', '', h)
h = re.sub(r'<meta[^>]+(?:property|name)="(?:og:|twitter:)[^"]*"[^>]*>', '', h)
urls = sorted(set(re.findall(r'https://images\.unsplash\.com/[^"\')\s]+', h)))
for u in urls:
    pid = re.search(r'photo-[0-9a-f-]+', u).group(0)
    f = os.path.join(OUT, 'img', pid + '.jpg')
    if not os.path.exists(f):
        small = re.sub(r'w=\d+', 'w=1000', re.sub(r'q=\d+', 'q=70', u))
        subprocess.run(['curl', '-sS', '-L', '-o', f, small], check=True)
    h = h.replace(u, 'img/' + pid + '.jpg').replace(u.replace('&', '&amp;'), 'img/' + pid + '.jpg')
open(os.path.join(OUT, name + '.html'), 'w', encoding='utf-8').write(h)
left = [x for x in sorted(set(re.findall(r'https?://[^"\'\s)>]+', h))) if 'w3.org' not in x]
print(name, len(h), 'bytes ·', len(urls), 'fotos · peticiones externas que quedan:', left or 'ninguna')
