# Construye la portada (/ y /es/) desde plantilla.html y la deja en marketing-site/src/pages/, donde la sirve Astro.
# Uso, desde cualquier sitio: python3 marketing-site/video/landing/construir.py
#   plantilla.html      toda la portada: marcado, estilos, textos (COPY) y la demo de la ventana del producto
#   textos.cjs          lee COPY para escribir los textos en el HTML (necesita Node)
#   → src/pages/index.astro     inglés
#   → src/pages/es/index.astro  castellano
# Los recursos propios (imágenes, vídeo, piezas del Vault, la web de Altura) ya viven en public/assets/vault/.
# No editar las páginas generadas a mano: se pisan al volver a construir.
import json, os, re, subprocess, sys

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
    'en': dict(at='/', og='Give your landing some taste.', desc='Gather inspiration, comment with your team and connect your agent with Criterio MCP. Join the waitlist.', alt='Give your landing some taste. Without AI slop, struck through, above the Criterio app.', loc='en_US'),
    'es': dict(at='/es/', og='Ponle criterio a tu landing.', desc='Recopila inspiración, comenta con tu equipo y conecta tu agente con Criterio MCP. Apúntate a la lista de espera.', alt='Ponle criterio a tu landing. Sin AI slop, tachado, sobre la app de Criterio.', loc='es_ES'),
}
# los textos van escritos en el HTML de cada idioma (lo lee quien no ejecuta JavaScript); el script solo los cambia con ?lang=
TXT = json.loads(subprocess.run(['node', os.path.join(HERE, 'textos.cjs')], check=True, capture_output=True, text=True).stdout)
def write_texts(p, l):
    t = TXT[l]
    p = re.sub(r'(<(\w+)\b[^<>]*\sdata-t="(\w+)"[^<>]*>)(</\2>)', lambda m: m[1] + t[m[3]] + m[4], p)
    p = re.sub(r'\sdata-t-([a-z-]+)="(\w+)"', lambda m: f'{m[0]} {m[1]}="{t[m[2]]}"', p)
    return p
for l, x in T.items():
    p = re.sub(r'<html lang="[a-z]+">', f'<html lang="{l}" data-lang="{l}" data-es="/es/" data-en="/">', h, count=1)
    p = re.sub(r'<meta name="robots" content="noindex">\s*', '', p, count=1)
    p = re.sub(r'<title>[^<]*</title>', lambda m: f'<title>{TXT[l]["title"]}</title>', p, count=1)
    p = write_texts(p, l)
    head = f'''<meta name="description" content="{x["desc"]}">
<link rel="canonical" href="{SITE}{x["at"]}">
<link rel="alternate" hreflang="en" href="{SITE}/">
<link rel="alternate" hreflang="es" href="{SITE}/es/">
<link rel="alternate" hreflang="x-default" href="{SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Criterio">
<meta property="og:locale" content="{x["loc"]}">
<meta property="og:locale:alternate" content="{T["es" if l == "en" else "en"]["loc"]}">
<meta property="og:url" content="{SITE}{x["at"]}">
<meta property="og:title" content="{x["og"]}">
<meta property="og:description" content="{x["desc"]}">
<meta property="og:image" content="{SITE}/og-home-{l}.jpg?v=20261125">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{x["alt"]}">
<meta name="twitter:card" content="summary_large_image">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">'''
    p = re.sub(r'<meta name="description" content="[^"]*">', lambda m: head, p, count=1)
    for must in ('rel="canonical"', f'data-lang="{l}"', 'og:image', '<span data-t="h1a">' + TXT[l]['h1a']):
        if must not in p:
            sys.exit(f'{l}: falta {must}')
    if 'noindex' in p:
        sys.exit(f'{l}: sigue noindex')
    # lo que la plantilla toma del código de la web: la dirección de la app (i18n.ts), el registro abierto o con lista
    # (signup-mode.ts) y los planes (plans.ts, los mismos de la app). Los planes
    # van en todos los idiomas, cada uno con su data-locale: el script de la plantilla enseña el de ?lang= y oculta el resto
    up = '../' if l == 'en' else '../../'
    p = '\n'.join(['---', '// Generada por marketing-site/video/landing/construir.py desde plantilla.html: no se edita a mano',
                   *(f'import {c} from "{up}components/{c}.astro";' for c in ('HomeSchema', 'HomeManifesto', 'HomeBento', 'HomePlans', 'HomeQuestions')),
                   f'import {{ LOCALES, PAGES, WAITLIST_URL, copy }} from "{up}i18n";', '---', p])
    for mark, astro in {
        '"%%WAITLIST%%"': '{WAITLIST_URL}',
        '"%%LOGIN%%"': f'{{copy.{l}.login.href}}',
        '%%SIGNUP_MODE%%': f'<script>import "{up}scripts/signup-mode";</script>',
        '%%JOINED%%': f'<script>import "{up}scripts/waitlist-joined";</script>',
        '%%SCHEMA%%': f'<HomeSchema locale="{l}" />',
        '%%MANIFESTO%%': f'<HomeManifesto locale="{l}" />',
        '%%BENTO%%': f'<HomeBento locale="{l}" />',
        '%%PRICING%%': f'<HomePlans locale="{l}" />',
        '%%QUESTIONS%%': f'<HomeQuestions locale="{l}" />',
    }.items():
        if mark not in p:
            sys.exit(f'{l}: falta {mark} en la plantilla')
        p = p.replace(mark, astro)
    out = os.path.join(PAGES, 'index.astro') if l == 'en' else os.path.join(PAGES, 'es', 'index.astro')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(p)
    print(os.path.relpath(out, MS), len(p))
