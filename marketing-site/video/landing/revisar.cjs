// Revisión completa de la portada: node marketing-site/video/landing/revisar.cjs [url base] [prefijo de las capturas] [largo]
//   url base: http://localhost:4321/ (npm run dev:marketing) por defecto, o https://criterio.design/ para la publicada
//   largo: además deja correr la demo entera una vez (un minuto más) y mira el Vault y la web de resultado
// Necesita playwright-core (`npm i --no-save playwright-core`) y, para WebKit, `npx playwright-core install webkit`.
// Chrome y WebKit · 1280x720 y 390x844 · ES y EN: consola, respuestas >=400, desborde, formulario, vídeo y recorrido.
let pw; try { pw = require('playwright-core'); } catch (e) { pw = require(process.env.HOME + '/.npm-global/lib/node_modules/@playwright/cli/node_modules/playwright-core'); }
const BASE = process.argv[2] || 'http://localhost:4321/', pre = process.argv[3] || 'revision', LONG = process.argv[4] === 'largo';
const URLS = { en: BASE + '?landing', es: BASE + 'es/?landing' };
let bad = 0; const say = (ok, ...a) => { if (!ok) bad++; console.log(ok ? '  ok ' : '  FALLO', ...a); };
(async () => {
  for (const [eng, T] of [['c', pw.chromium], ['w', pw.webkit]]) {
    const b = await T.launch(eng === 'c' ? { headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] } : { headless: true });
    try {
      for (const [v, w, h] of [['d', 1280, 720], ['m', 390, 844]]) for (const lang of ['es', 'en']) {
        const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: v === 'm' ? 2 : 1, hasTouch: v === 'm' }); const p = await ctx.newPage(); const e = [];
        p.on('console', (m) => m.type() === 'error' && e.push(m.text().slice(0, 160))); p.on('pageerror', (x) => e.push('E ' + String(x).slice(0, 200))); p.on('response', (r) => r.status() >= 400 && e.push(r.status() + ' ' + r.url().slice(-70)));
        let went = null; await p.route('**/api/waitlist', (r) => { went = r.request().postData(); r.fulfill({ json: { ok: true }, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' } }); });
        console.log(`== ${eng === 'c' ? 'Chrome' : 'WebKit'} ${w}x${h} ${lang}`);
        await p.goto(URLS[lang], { waitUntil: 'load' }); await p.waitForTimeout(1800);
        const m = await p.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, h1: document.querySelector('h1').innerText.replace(/\n/g, ' '), over: document.documentElement.scrollWidth - innerWidth, robots: document.querySelector('meta[name=robots]')?.content || '', canon: document.querySelector('link[rel=canonical]')?.href || '', og: document.querySelector('meta[property="og:image"]')?.content || '' }));
        say(m.lang === lang, 'idioma', m.lang, '·', m.h1); say(m.over <= 0, 'desborde', m.over); console.log('     ', m.title, '| robots:', m.robots || '-', '| canonical:', m.canon || '-', '| og:', m.og || '-');
        await p.screenshot({ path: `${pre}-${eng}${v}-${lang}-0.jpg`, type: 'jpeg', quality: 70 });
        // formulario
        const note = () => p.evaluate(() => document.querySelector('#note').textContent);
        await p.fill('#mail', 'nada'); await p.click('#invite button[type=submit]'); const n1 = await note();
        await p.fill('#mail', 'prueba@example.com'); await p.click('#invite button[type=submit]'); const n2 = await note();
        await p.check('#ok'); await p.click('#invite button[type=submit]'); await p.waitForTimeout(900); const done = await p.evaluate(() => ({ text: document.querySelector('#invite .joined').innerText, forms: document.querySelectorAll('.invite.is-joined').length, confetti: document.querySelectorAll('body > canvas').length }));
        say(n1 && n2 && n1 !== n2, 'formulario:', n1, '/', n2); say(done.text.includes('prueba@example.com') && done.forms === 2 && done.confetti === 1, 'confirmación', JSON.stringify(done)); const body = JSON.parse(went || '{}'); say(body.locale === lang && body.consent === true, 'manda', went);
        await p.goto(URLS[lang], { waitUntil: 'load' }); await p.waitForTimeout(1500);
        // vídeo
        await p.evaluate(() => { const f = document.querySelector('#frame').getBoundingClientRect(); scrollTo({ top: scrollY + f.top - Math.max(8, (innerHeight - f.height) / 2), behavior: 'instant' }); }); await p.waitForTimeout(500);
        await p.evaluate(() => document.querySelector('#open').click()); await p.waitForTimeout(3200);
        const vd = await p.evaluate(() => { const d = document.querySelector('#film'), x = d.querySelector('video'); return { open: d.open, src: x?.currentSrc.split('/').pop(), rs: x?.readyState, t: +(x?.currentTime || 0).toFixed(2), w: x?.videoWidth, err: x?.error?.code || 0 }; });
        say(vd.open && vd.rs >= 2 && !vd.err && vd.src === `criterio-${lang}.mp4`, 'vídeo', JSON.stringify(vd)); await p.screenshot({ path: `${pre}-${eng}${v}-${lang}-video.jpg`, type: 'jpeg', quality: 70 });
        await p.click('#shut'); await p.waitForTimeout(700); say(!(await p.evaluate(() => document.querySelector('#film').open)), 'el vídeo cierra');
        // recorrido hasta el pie
        const H = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
        for (const [k, f] of [[1, .4], [2, .75], [3, 1]]) { await p.evaluate((y) => scrollTo({ top: y, behavior: 'instant' }), H * f); await p.waitForTimeout(1400); await p.screenshot({ path: `${pre}-${eng}${v}-${lang}-${k}.jpg`, type: 'jpeg', quality: 70 }); }
        say((await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, 'desborde al final');
        if (LONG && eng === 'c' && lang === 'es') { await p.goto(URLS[lang], { waitUntil: 'load' }); await p.evaluate(() => { const f = document.querySelector('#frame').getBoundingClientRect(); scrollTo({ top: scrollY + f.top - Math.max(8, (innerHeight - f.height) / 2), behavior: 'instant' }); }); await p.waitForFunction(`document.querySelector('#s2.go')`, null, { timeout: 70000, polling: 100 }); await p.waitForTimeout(2500); say((await p.evaluate(() => document.querySelectorAll('.v-live iframe').length)) === 2, 'piezas nuevas del Vault'); await p.waitForFunction(`document.querySelector('#ai.full')`, null, { timeout: 70000, polling: 100 }); await p.waitForTimeout(4500); const fr = p.frames().find((f) => /plomo/.test(f.url())); say(await fr.evaluate(() => !document.documentElement.classList.contains('boot') && document.querySelectorAll('#mark .ch').length === 11 && getComputedStyle(document.querySelector('.nav')).opacity === '1'), 'web de resultado completa (Plomo cargada)'); await p.screenshot({ path: `${pre}-${eng}${v}-${lang}-fin.jpg`, type: 'jpeg', quality: 70 }); }
        const errs = [...new Set(e)].filter((x) => !/ERR_FAILED|app\.criterio\.design|ERR_ABORTED|Failed to load resource: net::ERR/.test(x)); say(errs.length === 0, 'consola y red', JSON.stringify(errs.slice(0, 6)));
        await ctx.close();
      }
      // reduced-motion
      const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); const e = []; p.on('pageerror', (x) => e.push(String(x).slice(0, 200)));
      await p.goto(URLS.es, { waitUntil: 'load' }); await p.waitForTimeout(2500); console.log(`== ${eng === 'c' ? 'Chrome' : 'WebKit'} reduced-motion`); say(e.length === 0 && (await p.evaluate(() => !!document.querySelector('h1').innerText && document.querySelector('#stage').children.length > 0)), 'usable', JSON.stringify(e)); await p.screenshot({ path: `${pre}-${eng}-rm.jpg`, type: 'jpeg', quality: 70 }); await ctx.close();
    } finally { await b.close(); }
  }
  console.log(bad ? `FALLOS: ${bad}` : 'TODO BIEN'); process.exit(bad ? 1 : 0);
})().catch((e) => { console.log('FAIL', String(e).slice(0, 500)); process.exit(1); });
