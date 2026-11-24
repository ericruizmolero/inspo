// Monta el vídeo del giro a Vault en Hyperframes a partir de la grabación real de la landing y de los bloques de voz.
// Uso: node montar.cjs <es|en> <carpeta de la grabación>
// Sin variables monta la versión publicada: «Keeping Cool» (public/polish, CC0) al compás y la voz a su nivel.
//   GAIN ganancia de la voz en dB · MGAIN nivel de la música · MUSICA=0 sin música · MUSICA_FILE + BEAT + BAR0 otra pista (medirla con compas.py)
//   SUBS=1 vuelve a poner subtítulos
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const lang = process.argv[2] || 'es', REC = process.argv[3], HERE = __dirname, HF = path.join(HERE, 'hf-' + lang), A = path.join(HF, 'assets');
const sh = (c) => execSync(c, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }).toString();
fs.mkdirSync(A, { recursive: true });
const T = {
  es: {
    blocks: ['Ponle criterio a tu landing. Aquí vas guardando todo lo que te gusta. Una web. Una captura. Un post que viste ayer. Todo junto, en un tablón.', 'Lo ves con tu equipo y lo comentáis. Esto sí. Esto no. Y por qué.', 'Luego toca pulir. Tino te va enseñando cada referencia y te pregunta. ¿Te la quedas? ¿O fuera? Y así, eligiendo, vas entrenando el gusto.', 'Después está el Vault. Son piezas que hemos hecho nosotros. Un menú. Un botón. Un pie de página. Cada una con su mimo.', 'Y ahora viene lo bueno. Conectas tu inteligencia artificial y le pides la web.', 'Pero ya no empieza de cero. Empieza de lo tuyo. Tu retícula. Tu tipografía. Tus colores. ¿Y lo que sale? Ya no se parece a lo de todos. Es tuyo.', 'Criterio. Entrena tu gusto.'],
    steps: [['Guarda', 'Todo lo que te gusta, en un tablón.'], ['Comenta', 'Con tu equipo, sobre cada referencia.'], ['Pule', 'Tino pregunta. Tú eliges.'], ['Vault', 'Piezas hechas por nosotros.'], ['Conecta', 'Tu IA lee tu Criterio.'], ['Crea', 'De un borrador a algo tuyo.']],
    prompt: 'Hazme una web', hero: ['Tu producto,', 'más rápido'], cta: 'Empezar', big: ['Lo difícil ya no es crear.', 'Es que sea <em>tuyo</em>.'], end: 'Entrena tu gusto.', wait: 'Lista de espera abierta', cps: 14.5, cut: /criter/i
  },
  en: {
    blocks: ['Give your landing some taste. Here you keep everything you like. A site. A screenshot. A post you saw yesterday. All of it, on one board.', 'You go through it with your team. This one, yes. This one, no. And why.', 'Then comes the polishing. Tino shows you each reference and asks. Keep it? Or let it go? And that’s how you train your taste. By choosing.', 'Then there’s the Vault. These are pieces we built ourselves. A menu. A button. A footer. Each one made with care.', 'And now the good part. You connect your AI and ask for the website.', 'But it doesn’t start from scratch anymore. It starts from you. Your grid. Your type. Your colors. And what comes out? It doesn’t look like everyone else’s. It’s yours.', 'Criterio. Train your taste.'],
    steps: [['Save', 'Everything you love, on one board.'], ['Discuss', 'With your team, on every reference.'], ['Polish', 'Tino asks. You choose.'], ['Vault', 'Pieces built by us.'], ['Connect', 'Your AI reads your Criterio.'], ['Create', 'From a draft to something yours.']],
    prompt: 'Build me a website', hero: ['Your product,', 'but faster'], cta: 'Get started', big: ['Making things isn’t the hard part.', 'Making them <em>yours</em> is.'], end: 'Train your taste.', wait: 'Waitlist open', cps: 15.5, cut: /criter/i
  }
}[lang];
const dur = (f) => +sh(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).trim();
// ── voz: b1…b6 (el 6 trae el cierre al final y se corta en la última «Criterio»); si falta un bloque, se estima
const V = path.join(HERE, 'voz', lang), have = (n) => fs.existsSync(path.join(V, `b${n}.mp3`)); let cut6 = null;
const cut = fs.existsSync(V + '/b6a.mp3') && fs.existsSync(V + '/b6b.mp3');
if (have(6) && !cut) { try { sh(`ffmpeg -v error -y -i "${V}/b6.mp3" -ar 16000 -ac 1 "${V}/b6.wav"`); sh(`whisper-cli -m ~/.cache/whisper/ggml-small.bin -l ${lang} -ml 1 -sow -oj -of "${V}/b6" "${V}/b6.wav" 2>/dev/null`); const w = JSON.parse(fs.readFileSync(V + '/b6.json')).transcription.filter((x) => T.cut.test(x.text)); if (w.length) cut6 = Math.max(0, w[w.length - 1].offsets.from / 1000 - .14); } catch (e) { console.log('whisper', String(e).slice(0, 120)); } if (cut6 == null || cut6 < dur(V + '/b6.mp3') * .5) cut6 = dur(V + '/b6.mp3') - 2.9; sh(`ffmpeg -v error -y -i "${V}/b6.mp3" -t ${cut6} "${V}/b6a.mp3"`); sh(`ffmpeg -v error -y -ss ${cut6} -i "${V}/b6.mp3" "${V}/b6b.mp3"`); }
const vf = [1, 2, 3, 4, 5].map((n) => have(n) ? `${V}/b${n}.mp3` : null).concat(cut || have(6) ? [`${V}/b6a.mp3`, `${V}/b6b.mp3`] : [null, null]);
const d = T.blocks.map((t, i) => vf[i] ? dur(vf[i]) : t.length / T.cps); console.log('voz', vf.map((f) => f ? 'ok' : '--').join(' '), d.map((x) => x.toFixed(1)).join(' '));
// ── entrada: Tino y la marca sobre papel; la primera frase suena aquí y el visor de Tino se abre hasta ser la ventana del producto
// 24-11: PRE era 1,3 s de Tino callado antes de la primera palabra (Eric: «se tardan 4 segundos en decir solo mira, esto es criterio»)
const PRE = .6; let lead = d[0] * .22; try { const al = JSON.parse(fs.readFileSync(V + '/toma/align.json')), n2 = T.blocks[0].match(/^[^.]+\./)[0].replace(/\s+/g, '').length; let c = 0, t0 = null, t1 = null; for (let i = 0; i < al.characters.length && c < n2; i++) if (al.characters[i].trim()) { if (t0 === null) t0 = al.character_start_times_seconds[i]; t1 = al.character_end_times_seconds[i]; c++; } const x = t1 - t0 + .08; if (x > .8 && x < d[0] * .6) lead = x; } catch (e) { console.log('sin marcas de la toma: entrada estimada'); }
const R = +(PRE + .5 + lead + .15).toFixed(2), MUS = process.env.MUSICA !== '0';
// ── compás: con BEAT (s por tiempo) y BAR0 (primer tiempo fuerte de la pista) la música arranca donde hace falta para que la ventana llegue en un tiempo fuerte, y cada cambio de paso cae en un tiempo
const PISTA = path.join(HERE, '..', '..', 'public', 'polish', 'keeping-cool.mp3'), MFILE = process.env.MUSICA_FILE || (fs.existsSync(PISTA) ? PISTA : ''), SUYA = MFILE === PISTA;   // «Keeping Cool»: 0,70605 s por tiempo, primer tiempo fuerte en 0,696 s
const BEAT = +process.env.BEAT || (SUYA ? 0.70605 : 0), BAR0 = +process.env.BAR0 || (SUYA ? 0.696 : 0); let SS = +process.env.MUSICA_SS || 0; if (BEAT) { const bar = BEAT * 4; SS = +((((BAR0 - (R + .95)) % bar) + bar) % bar).toFixed(3); }
const B0 = BAR0 - SS, snap = (x, n = 1, up = false) => { if (!BEAT) return x; const g = BEAT * n, q = (x - B0) / g; return +(B0 + (up ? Math.ceil(q - 1e-6) : Math.round(q)) * g).toFixed(3); };
// ── metraje: tramos de la grabación, cada uno a la velocidad que pide su bloque de voz
const M = JSON.parse(fs.readFileSync(REC + '/marks.json')), mk = (k, v = 1) => M.marks.find((m) => m[0] === k && m[1] === v && m[2] > 0)[2];
if (!fs.existsSync(REC + '/raw.mp4')) sh(`cd "${REC}" && ffmpeg -v error -y -f concat -safe 0 -i list.txt -vf fps=60 -c:v libx264 -crf 12 -preset fast -pix_fmt yuv420p raw.mp4`);
const pol = mk('pol'), vault = mk('vault'), menu = mk('menu'), art = mk('art'), full = mk('full'), com = mk('com'), zs1 = mk('zs1');
const seg = [['A', 0, com - .25, Math.max(com - .25, PRE + d[0] + 1.1 - R)], ['B', com - .25, pol - .3, Math.max(pol - com - .05, d[1] + .9)], ['C', pol - .3, vault - .15, Math.max(vault - pol - .1, d[2] + .9)], ['D1', vault - .15, menu, Math.max(7.4, d[3] + 1)], ['E', menu, art + .3, Math.max(5.6, d[4] + 1.3)], ['F', art + .3, full + .1, full - art - .2]];   // 24-11: sin el tramo G (la web a pantalla completa): al decir «Es tuyo» se cierra (Eric: «ni hace falta mostrar esa web de prueba»)
let t = R; const tB = R, at = {}; const parts = [];
seg.forEach(([n, a, b, D], i) => { let kF = 0; if (n === 'F') { kF = (b - a) / D; const v6 = Math.max(t + .3, t + (zs1 - a) / kF - .5) + d[5]; D = Math.min(D, v6 + .6 - t); }   // F se corta, a su velocidad, 0,6 s después de «Es tuyo»
  D = +D.toFixed(3); if (BEAT) { let e = snap(t + D); if (e < t + D - .3) e = +(e + BEAT).toFixed(3); D = +(e - t).toFixed(3); } const k = kF || (b - a) / D; at[n] = { t, a, b, D, k }; const kk = Math.max(k, .8), hold = Math.max(0, D - (b - a) / kk); sh(`ffmpeg -v error -y -ss ${a.toFixed(3)} -t ${(b - a).toFixed(3)} -i "${REC}/raw.mp4" -vf "setpts=PTS/${kk.toFixed(5)},fps=30,tpad=stop_mode=clone:stop_duration=${(hold + .2).toFixed(3)}" -t ${D} -an -c:v libx264 -crf 13 -preset fast -pix_fmt yuv420p "${A}/s${i}.mp4"`); parts.push(`file 's${i}.mp4'`); t = +(t + D).toFixed(3); });
fs.writeFileSync(A + '/parts.txt', parts.join('\n')); sh(`cd "${A}" && ffmpeg -v error -y -f concat -safe 0 -i parts.txt -c copy footage.mp4`); const tH = +(tB + dur(A + '/footage.mp4')).toFixed(2), TOT = +(tH + Math.max(3.4, d[6] + 1.7)).toFixed(2);
const inSeg = (n, x) => at[n].t + (x - at[n].a) / at[n].k;
const vs = [PRE + .5, at.B.t + .35, at.C.t + .55, at.D1.t + .35, at.E.t + .35, Math.max(at.F.t + .3, inSeg('F', zs1) - .5), tH + .55];
// ── mezcla de voz
const ins = vf.every(Boolean) ? vf.map((f, i) => [f, vs[i]]) : []; // sin todos los bloques no se mezcla voz: un borrador con una sola frase hablada confunde
if (ins.length) sh(`ffmpeg -v error -y ${ins.map(([f]) => `-i "${f}"`).join(' ')} -filter_complex "${ins.map(([, s], i) => `[${i}:a]aresample=48000,adelay=${Math.round(s * 1000)}:all=1[a${i}]`).join(';')};${ins.map((_, i) => `[a${i}]`).join('')}amix=inputs=${ins.length}:normalize=0,highpass=f=80,acompressor=threshold=0.1:ratio=4:attack=5:release=120:knee=4,apad=whole_dur=${TOT},volume=VOLdB,alimiter=limit=0.84:level=false[o]" -map "[o]" -t ${TOT} -ar 48000 -ac 2 "${A}/mezcla.wav"`.replace('VOLdB', (process.env.GAIN || (lang === 'es' ? '12' : '13')) + 'dB'));
else sh(`ffmpeg -v error -y -f lavfi -i anullsrc=r=48000:cl=stereo -t ${TOT} "${A}/mezcla.wav"`);
if (MUS) { const MF = MFILE; if (MF) sh(`ffmpeg -v error -y -ss ${SS} -i "${MF}" -t ${TOT} -af "loudnorm=I=-16:TP=-2:LRA=9,afade=t=in:d=0.4,afade=t=out:st=${(TOT - 2.2).toFixed(2)}:d=2.2" -ar 48000 -ac 2 "${A}/musica.wav"`); else console.log(sh(`uv run --quiet --with numpy --with scipy python "${HERE}/musica.py" "${A}/musica.wav" ${TOT} ${R} ${tH}`).trim()); fs.renameSync(A + '/mezcla.wav', A + '/voz.wav'); sh(`ffmpeg -v error -y -i "${A}/voz.wav" -i "${A}/musica.wav" -filter_complex "[0:a]asplit=2[v][k];[1:a]aresample=48000,volume=${process.env.MGAIN || '-15'}dB[m];[m][k]sidechaincompress=threshold=0.015:ratio=4:attack=80:release=900[md];[v][md]amix=inputs=2:normalize=0,alimiter=limit=0.84:level=false[o]" -map "[o]" -t ${TOT} -ar 48000 -ac 2 "${A}/mezcla.wav"`); }
// ── recursos
const P = path.join(HERE, '..', 'public'); for (const [a, b] of [['assets/vault/gsap.min.js', 'gsap.min.js'], ['assets/fonts/geist-serif/GeistSerifVF.woff2', 'GeistSerif.woff2'], ['assets/fonts/satoshi/Satoshi-Variable.woff2', 'Satoshi.woff2']]) fs.copyFileSync(path.join(P, a), path.join(A, b));
const L = fs.readFileSync(path.join(HERE, '..', 'src', 'pages', 'index.astro'), 'utf8'), pd = (id) => L.match(new RegExp(`id="${id}" d="([^"]+)"`))[1];
sh(`ffmpeg -v error -y -i "${REC}/f/00030.jpg" -vf "crop=2:2:120:500,scale=1:1" -f rawvideo -pix_fmt rgb24 "${A}/px.raw"`); sh(`ffmpeg -v error -y -i "${REC}/f/00030.jpg" -vf "crop=2:2:1000:560,scale=1:1" -f rawvideo -pix_fmt rgb24 "${A}/dk.raw"`); const DARK = '#' + [...fs.readFileSync(A + '/dk.raw').slice(0, 3)].map((x) => x.toString(16).padStart(2, '0')).join('');
const px = fs.readFileSync(A + '/px.raw'), PAPER = '#' + [...px.slice(0, 3)].map((x) => x.toString(16).padStart(2, '0')).join('');
// ── subtítulos por frase, repartidos por longitud dentro de su bloque
const subs = []; if (process.env.SUBS === '1') T.blocks.forEach((b, i) => { const ph = b.match(/[^.?!]+[.?!]+/g).map((x) => x.trim()).reduce((o, x) => { const l = o[o.length - 1]; if (l && (l.length < 24 || x.length < 13) && l.length + x.length < 46) o[o.length - 1] = l + ' ' + x; else o.push(x); return o; }, []), tot = ph.reduce((s, x) => s + x.length + 6, 0); let x = vs[i]; ph.forEach((p) => { const D = d[i] * (p.length + 6) / tot; subs.push([+x.toFixed(2), +(x + D).toFixed(2), p, i]); x += D; }); });
const stepsAt = [at.A.t + .75, at.B.t, at.C.t, at.D1.t, at.E.t, at.F.t], dA = 0, f2 = (x) => +x.toFixed(2);
const site = (i) => `<div class="gs g${i}" data-layout-ignore><i class="n"></i><b>${T.hero[0]}<br>${T.hero[1]}</b><u>${T.cta}</u><p><s></s><s></s><s></s></p></div>`;
const html = `<!doctype html>
<html lang="${lang}"><head><meta charset="UTF-8"><meta name="viewport" content="width=1920, height=1080"><title>Criterio · ${T.end}</title>
<script src="assets/gsap.min.js"></script>
<style>
@font-face { font-family: "Geist Serif"; src: url("assets/GeistSerif.woff2") format("woff2"); font-weight: 100 900; }
@font-face { font-family: "Satoshi"; src: url("assets/Satoshi.woff2") format("woff2"); font-weight: 300 900; }
* { margin: 0; padding: 0; box-sizing: border-box; } html, body { width: 1920px; height: 1080px; overflow: hidden; background: ${PAPER}; }
#root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: ${PAPER}; color: #1B1B18; font-family: "Satoshi", sans-serif; }
#foot { position: absolute; inset: 0; width: 1920px; height: 1080px; }
.abs { position: absolute; inset: 0; }
/* gancho */
#pr { position: absolute; left: 50%; top: 150px; translate: -50% 0; display: flex; align-items: center; gap: 14px; height: 76px; padding: 0 30px 0 24px; border: 2px solid #1B1B18; border-radius: 20px; background: #F6F1E6; box-shadow: 0 6px 0 #1B1B18; font: 500 34px/1 "Satoshi", sans-serif; white-space: nowrap; } #pr i { width: 14px; height: 14px; border-radius: 50%; background: #E8892B; } #pr span { display: inline-block; overflow: hidden; white-space: nowrap; }
.gs { position: absolute; top: 330px; left: 50%; width: 500px; height: 372px; margin-left: -250px; padding: 30px 34px; border-radius: 22px; background: linear-gradient(150deg, #6D4BFF, #B66BFF 60%, #FF8AD8); color: #fff; box-shadow: 0 30px 60px -30px rgb(40 20 90 / .55); text-align: center; opacity: 0; } .gs .n { display: block; width: 74px; height: 12px; margin-bottom: 44px; border-radius: 6px; background: rgb(255 255 255 / .75); } .gs b { display: block; font: 700 42px/1.05 "Satoshi", sans-serif; letter-spacing: -.02em; } .gs u { display: inline-block; margin-top: 20px; padding: 11px 24px; border-radius: 99px; background: #fff; color: #5B3BE8; font: 700 19px/1 "Satoshi", sans-serif; text-decoration: none; } .gs p { display: flex; gap: 12px; margin-top: 34px; } .gs s { flex: 1; height: 62px; border-radius: 12px; background: rgb(255 255 255 / .22); }
#big { position: absolute; left: 0; right: 0; top: 376px; text-align: center; font: 400 112px/1.08 "Geist Serif", serif; letter-spacing: -.045em; } #big div { opacity: 0; } #big em { font-style: normal; color: #D9741A; }
/* entrada */
#s-in { z-index: 5; } #s-subs { z-index: 6; } #s-end { z-index: 7; }
#in { position: absolute; inset: 0; background: ${PAPER}; } #in-t { position: absolute; left: 852px; top: 318px; width: 216px; height: 216px; fill: #1B1B18; opacity: 0; } #in-w { position: absolute; left: 0; right: 0; top: 572px; text-align: center; font: 400 150px/1 "Geist Serif", serif; letter-spacing: -.05em; } #in-w span { display: inline-block; opacity: 0; } #wipe { position: absolute; left: 440px; top: 90px; width: 1440px; height: 900px; border-radius: 16px; background: #F6A848; transform-origin: 0 0; opacity: 0; }
/* columna de pasos */
#side { position: absolute; left: 64px; top: 0; width: 350px; height: 1080px; } .st { position: absolute; left: 0; top: 396px; width: 350px; opacity: 0; } .st small { display: block; font: 500 28px/1 ui-monospace, Menlo, monospace; color: #6B665B; } .st small b { color: #C4650F; font-weight: 500; } .st h2 { margin: 0 0 18px; font: 400 74px/.95 "Geist Serif", serif; letter-spacing: -.05em; } .st p { font: 500 30px/1.25 "Satoshi", sans-serif; color: #4A463D; text-wrap: balance; }
#bar { position: absolute; left: 64px; top: 348px; width: 350px; height: 3px; background: rgb(27 27 24 / .14); opacity: 0; } #bar i { display: block; height: 100%; width: 0; background: #1B1B18; }
/* subtítulos */
.sb { position: absolute; left: 440px; width: 1440px; top: 1004px; text-align: center; font: 500 34px/1.2 "Satoshi", sans-serif; color: #1B1B18; opacity: 0; } .sb.c { left: 0; width: 1920px; top: 930px; font-size: 38px; }
/* cierre */
#end { position: absolute; inset: 0; background: ${PAPER}; display: grid; place-content: center; justify-items: center; opacity: 0; } #end svg { width: 150px; height: 150px; fill: #1B1B18; opacity: 0; } #end h1 { margin-top: 34px; font: 400 150px/1 "Geist Serif", serif; letter-spacing: -.05em; opacity: 0; } #end p { margin-top: 36px; font: 500 40px/1 "Satoshi", sans-serif; opacity: 0; } #end p b { font-weight: 700; } #end p span { margin-left: 18px; color: #6B665B; }
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-width="1920" data-height="1080" data-duration="${TOT}">
  <video id="foot" class="clip" src="assets/footage.mp4" data-start="${tB}" data-duration="${f2(tH - tB)}" data-media-start="0" data-track-index="0" muted playsinline></video>
  <section id="s-side" class="clip abs" data-start="0" data-duration="${f2(tH)}" data-track-index="2"><div id="bar"><i id="bari"></i></div><div id="side">${T.steps.map(([a, b], i) => `<div class="st" id="st${i}"><h2>${a}</h2><p>${b}</p></div>`).join('')}</div></section>
  <section id="s-subs" class="clip abs" data-start="0" data-duration="${TOT}" data-track-index="3">${subs.map(([a, b, p, i], k) => `<div class="sb${b <= R + .3 ? ' c' : ''}" id="sb${k}">${p}</div>`).join('')}</section>
  <section id="s-end" class="clip abs" data-start="${f2(tH - .5)}" data-duration="${f2(TOT - tH + .5)}" data-track-index="4"><div id="end"><svg viewBox="-4 -8 54 54" shape-rendering="crispEdges"><path d="${pd('ear-l')}${pd('ear-r')}${pd('body')}"/><rect x="26" y="24" width="14" height="2" fill="${PAPER}"/></svg><h1>${T.end}</h1><p><b>criterio.design</b><span>${T.wait}</span></p></div></section>
  <section id="s-in" class="clip abs" data-start="0" data-duration="${f2(R + 1.6)}" data-track-index="5"><div id="in"><svg id="in-t" viewBox="-4 -8 54 54" shape-rendering="crispEdges"><path d="${pd('ear-l')}${pd('ear-r')}${pd('body')}"/><rect x="26" y="24" width="14" height="2" fill="#F6A848"/></svg><h1 id="in-w">${[...'Criterio'].map((c) => `<span>${c}</span>`).join('')}</h1></div><div id="wipe"></div></section>
  <audio id="mezcla" src="assets/mezcla.wav" data-start="0" data-duration="${TOT}" data-track-index="9" data-volume="1"></audio>
</div>
<script>
window.__timelines = window.__timelines || {};
const tl = gsap.timeline({ paused: true }), dA = ${f2(dA)}, tB = ${tB}, tH = ${tH}, TOT = ${TOT}, R = ${R}, PRE = ${PRE}, LEAD = ${f2(lead)};
// el producto entra
// entrada: Tino aparece, salta al «Mira», la marca se escribe y su visor se abre hasta ser la ventana
tl.set("#in-t", { scale: .55, opacity: 0, transformOrigin: "50% 85%" }, 0).to("#in-t", { scale: 1, opacity: 1, duration: .5, ease: "back.out(2.4)" }, .2).to("#in-t", { y: -30, duration: .16, ease: "power2.out" }, PRE + .42).to("#in-t", { y: 0, duration: .34, ease: "bounce.out" }, PRE + .58);
tl.set("#in-w span", { y: 44, opacity: 0 }, 0).to("#in-w span", { y: 0, opacity: 1, duration: .6, ease: "expo.out", stagger: .04 }, PRE + .5 + LEAD * .36);
tl.set("#wipe", { x: 532, y: 356, scaleX: 56 / 1440, scaleY: 8 / 900, opacity: 0 }, 0).set("#wipe", { opacity: 1 }, R).to("#wipe", { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: .95, ease: "expo.inOut" }, R).to("#wipe", { backgroundColor: "${DARK}", duration: .45, ease: "power1.in" }, R + .35);
tl.to("#in-w", { opacity: 0, y: 18, duration: .3, ease: "power2.in" }, R + .05).to("#in-t", { opacity: 0, duration: .3, ease: "power2.in" }, R + .3).set("#in", { opacity: 0 }, R + .95).to("#wipe", { opacity: 0, duration: .5, ease: "power2.out" }, R + .97);
tl.set("#foot", { opacity: 1 }, 0).set("#bar", { opacity: 0 }, 0).to("#bar", { opacity: 1, duration: .4 }, tB + .85).to("#bari", { width: "100%", duration: tH - tB - .6, ease: "none" }, tB + .2);
const SA = ${JSON.stringify(stepsAt.map(f2))};
SA.forEach((t, i) => { tl.set("#st" + i, { y: 26, opacity: 0 }, 0).to("#st" + i, { y: 0, opacity: 1, duration: .6, ease: "expo.out" }, t + .12); const out = i < SA.length - 1 ? SA[i + 1] - .12 : tH - .5; tl.to("#st" + i, { y: -18, opacity: 0, duration: .24, ease: "power2.in" }, out); });
// subtítulos
${JSON.stringify(subs.map(([a, b]) => [a, b]))}.forEach(([a, b], k) => { tl.set("#sb" + k, { opacity: 1 }, a).set("#sb" + k, { opacity: 0 }, b - .04); });
// cierre
tl.to("#foot", { opacity: 0, duration: .45, ease: "power2.in" }, tH - .5).to("#bar", { opacity: 0, duration: .3 }, tH - .5).to("#end", { opacity: 1, duration: .45 }, tH - .45);
tl.set("#end svg", { y: 20, opacity: 0 }, 0).to("#end svg", { y: 0, opacity: 1, duration: .6, ease: "expo.out" }, tH + .1).set("#end h1", { y: 30, opacity: 0 }, 0).to("#end h1", { y: 0, opacity: 1, duration: .8, ease: "expo.out" }, tH + .3).set("#end p", { y: 16, opacity: 0 }, 0).to("#end p", { y: 0, opacity: 1, duration: .6, ease: "expo.out" }, tH + 1.0);
tl.set({}, {}, TOT);
window.__timelines["main"] = tl;
</script></body></html>`;
fs.writeFileSync(HF + '/index.html', html);
fs.writeFileSync(HF + '/hyperframes.json', JSON.stringify({ $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json', registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry', paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' }, media: { autoProxy: true } }, null, 2));
fs.writeFileSync(HF + '/meta.json', JSON.stringify({ id: 'vault-' + lang, name: 'vault-' + lang, createdAt: new Date().toISOString() }));
fs.writeFileSync(HF + '/package.json', JSON.stringify({ name: 'vault-' + lang, private: true, type: 'module' }));
fs.writeFileSync(HF + '/tiempos.json', JSON.stringify({ TOT, PRE, R, BEAT, SS, tB, tH, at, vs, stepsAt, subs }, null, 1));
console.log('TOT', TOT, 'tB', tB, 'tH', tH, 'paper', PAPER, Object.entries(at).map(([k, v]) => `${k}@${v.t.toFixed(1)} x${v.k.toFixed(2)}`).join(' '));
