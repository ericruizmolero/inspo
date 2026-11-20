# Construye la portada (/ y /es/) desde plantilla.html y la deja en marketing-site/src/pages/, donde la sirve Astro.
# Uso, desde cualquier sitio: python3 marketing-site/video/landing/construir.py
#   plantilla.html      toda la portada: marcado, estilos, textos (COPY) y la demo de la ventana del producto
#   → src/pages/index.astro     inglés
#   → src/pages/es/index.astro  castellano
# Los recursos propios (imágenes, vídeo, piezas del Vault, la web de Altura) ya viven en public/assets/vault/.
# No editar las páginas generadas a mano: se pisan al volver a construir.
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MS = os.path.join(HERE, '..', '..')
PAGES = os.path.join(MS, 'src', 'pages')
SITE = 'https://criterio.design'
read = lambda *p: open(os.path.join(*p), encoding='utf-8').read()

t = read(HERE, 'plantilla.html')
# Tino en píxeles (orejas y cuerpo) y los logos de las fuentes salen de lo que ya dibuja la web
wl = read(MS, 'src', 'components', 'WaitlistPage.astro')
es = read(MS, 'src', 'pages', 'es', 'landing', 'index.astro')
g = re.search(r'<a class="mark".*?<g fill="#1B1B18">(.*?)</g>', wl, re.S).group(1)
ps = re.findall(r'<path([^>]*?)d="([^"]*)"', g)
earl = [d for a, d in ps if 'ear-l' in a][0]
earr = [d for a, d in ps if 'ear-r' in a][0]
body = [d for a, d in ps if 'ear' not in a][0]
mark = json.loads(re.search(r'const MARK = (\{.*?\});', es, re.S).group(1))
h = t.replace('%%EARL%%', earl).replace('%%EARR%%', earr).replace('%%BODY%%', body).replace('%%MARK%%', json.dumps(mark))

# rutas: la plantilla las escribe relativas; lo propio va a /assets/vault/, lo compartido a lo que ya sirve la web
h = re.sub(r'''(["'`(])\.\./(fonts|marca)/''', r'\1/assets/\2/', h)
h = re.sub(r'''(["'`(])(?:\./)?tino-app/''', r'\1/assets/mascota/tino-app/', h)
h = re.sub(r'''(["'`(])(gsap\.min\.js|mtn\.js|tino-dock\.png|(?:vf|refs|art|equipo|altura|plomo|own|vault|video)/)''', r'\1/assets/vault/\2', h)
# scripts/check-dist.mjs lee cualquier src="…" o href="…" del HTML, también los de las plantillas del JS:
# donde la ruta lleva ${…}, el espacio de delante va escrito \x20 (vale igual dentro de una plantilla)
h = re.sub(r' (src|href|poster)="([^"]*\$\{)', r'\\x20\1="\2', h)
# Astro sirve la página tal cual: con is:inline no empaqueta ni reescribe ningún script ni estilo
h = re.sub(r'<(script|style)(?=[\s>])', r'<\1 is:inline', h)

T = {
    'en': dict(at='/', title='Criterio · Your team decides the look. Your agent builds the landing', desc='Gather references, vote on what stays and get a criterio.md your agent reads before it builds the landing. Join the waitlist and we’ll email you when your invite is ready.', alt='Your references, written down as decisions. Tino reads a row of references.', loc='en_US'),
    'es': dict(at='/es/', title='Criterio · Tu equipo decide el estilo. Tu agente construye la landing', desc='Reúne referencias, votad qué se queda y obtén un criterio.md que tu agente lee antes de construir la landing. Apúntate a la lista y te invitamos cuando llegue tu turno.', alt='Tus referencias, escritas como decisiones. Tino lee una fila de referencias.', loc='es_ES'),
}
for l, x in T.items():
    p = re.sub(r'<html lang="[a-z]+">', f'<html lang="{l}" data-lang="{l}" data-es="/es/" data-en="/">', h, count=1)
    p = re.sub(r'<meta name="robots" content="noindex">\s*', '', p, count=1)
    p = re.sub(r'<title>[^<]*</title>', lambda m: f'<title>{x["title"]}</title>', p, count=1)
    head = f'''<meta name="description" content="{x["desc"]}">
<link rel="canonical" href="{SITE}{x["at"]}">
<link rel="alternate" hreflang="en" href="{SITE}/">
<link rel="alternate" hreflang="es" href="{SITE}/es/">
<link rel="alternate" hreflang="x-default" href="{SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Criterio">
<meta property="og:locale" content="{x["loc"]}">
<meta property="og:url" content="{SITE}{x["at"]}">
<meta property="og:title" content="{x["title"]}">
<meta property="og:description" content="{x["desc"]}">
<meta property="og:image" content="{SITE}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{x["alt"]}">
<meta name="twitter:card" content="summary_large_image">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">'''
    p = re.sub(r'<meta name="description" content="[^"]*">', lambda m: head, p, count=1)
    for must in ('rel="canonical"', f'data-lang="{l}"', 'og:image'):
        if must not in p:
            sys.exit(f'{l}: falta {must}')
    if 'noindex' in p:
        sys.exit(f'{l}: sigue noindex')
    out = os.path.join(PAGES, 'index.astro') if l == 'en' else os.path.join(PAGES, 'es', 'index.astro')
    p = '---\n// Generada por marketing-site/video/landing/construir.py desde plantilla.html: no se edita a mano\n---\n' + p
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(p)
    print(os.path.relpath(out, MS), len(p))
