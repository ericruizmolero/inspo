// Graba la demo real de la portada (la ventana del producto) a 1920x1080: la ventana a la derecha, columna libre a la izquierda.
// Uso: node grabar.cjs <es|en> <carpeta de salida>
//   BASE   dirección de la web servida en local (por defecto http://localhost:4321/, la de `npm run dev:marketing`)
//   CHROME ruta de Google Chrome si no está en /Applications
// Necesita playwright-core: `npm i --no-save playwright-core` en la raíz del repositorio.
const fs = require('fs'); let pw; try { pw = require('playwright-core'); } catch (e) { try { pw = require(process.env.HOME + '/.npm-global/lib/node_modules/@playwright/cli/node_modules/playwright-core'); } catch (e2) { console.error('falta playwright-core: npm i --no-save playwright-core'); process.exit(2); } }
const BASE = process.env.BASE || 'http://localhost:4321/', CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const lang = process.argv[2] || 'es', out = process.argv[3]; fs.mkdirSync(out + '/f', { recursive: true });
(async () => {
  const b = await pw.chromium.launch({ headless: true, executablePath: CHROME, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--window-size=1920,1080'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.addInitScript(() => { if (window !== window.top) return; addEventListener('DOMContentLoaded', () => { const s = document.createElement('style'); s.textContent = 'html,body{overflow:hidden!important}.top,.hero,.mf,.end,.cues,.foot{visibility:hidden!important}#demo{position:fixed!important;left:440px!important;top:90px!important;width:1440px!important;max-width:none!important;margin:0!important;z-index:5}#open{display:none!important}'; document.head.append(s); }); });
  await p.goto(BASE + (lang === 'es' ? 'es/' : '') + '?landing');   // ?landing: con sesión abierta en la app, la portada no redirige await p.waitForTimeout(2500);
  console.log('frame', await p.evaluate(() => { const r = document.querySelector('#frame').getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); }));
  // marcas de estado con reloj de pared
  await p.evaluate(() => { window.__m = []; const Q = { com: '#ovi.go', pol: '#s1.on', vault: '#s2.go', menu: '#menu.on', dlg: '#dlg.on', ai: '#ai.on', q: '#q.on', art: '#ai.art', zs1: '#bld.zs1', zs2: '#bld.zs2', zs3: '#bld.zs3', zs4: '#bld.zs4', zs5: '#bld.zs5', out: '#bld.out', full: '#ai.full' }, st = {}; setInterval(() => { for (const k in Q) { const v = !!document.querySelector(Q[k]); if (v !== !!st[k]) { st[k] = v; window.__m.push([k, v ? 1 : 0, Date.now() / 1000]); } } const n = document.querySelectorAll('.rc.in').length; if (n !== st.n) { st.n = n; if (n === 0) window.__m.push(['loop', 1, Date.now() / 1000]); } }, 16); });
  // esperar al principio de una vuelta
  await p.waitForFunction(() => window.__m.some((m) => m[0] === 'loop'), null, { timeout: 150000, polling: 50 });
  const cdp = await p.context().newCDPSession(p); const ts = []; let n = 0, stop = false;
  cdp.on('Page.screencastFrame', (f) => { if (!stop) { fs.writeFile(`${out}/f/${String(n).padStart(5, '0')}.jpg`, Buffer.from(f.data, 'base64'), () => {}); ts.push(f.metadata.timestamp); n++; } cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await p.evaluate(() => { window.__m = window.__m.filter((m) => m[0] === 'loop').slice(-1); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 93, everyNthFrame: 1 });
  await p.waitForFunction(() => window.__m.some((m) => m[0] === 'full' && m[1] === 1), null, { timeout: 150000, polling: 100 });
  await p.waitForTimeout(13000); stop = true; await cdp.send('Page.stopScreencast');
  const marks = await p.evaluate(() => window.__m); await p.waitForTimeout(500);
  fs.writeFileSync(out + '/marks.json', JSON.stringify({ t0: ts[0], marks: marks.map(([k, v, t]) => [k, v, +(t - ts[0]).toFixed(3)]), n, dur: ts[ts.length - 1] - ts[0] }));
  let c = "ffconcat version 1.0\n"; for (let i = 0; i < n; i++) c += `file 'f/${String(i).padStart(5, '0')}.jpg'\nduration ${Math.max(.001, (ts[i + 1] ?? ts[i] + .033) - ts[i]).toFixed(4)}\n`; fs.writeFileSync(out + '/list.txt', c);
  const gaps = ts.slice(1).map((t, i) => t - ts[i]); console.log('frames', n, 'dur', (ts[n - 1] - ts[0]).toFixed(1), 'fps', (n / (ts[n - 1] - ts[0])).toFixed(1), 'max gap', Math.max(...gaps).toFixed(3), 'gaps>0.1', gaps.filter((g) => g > .1).length, 'errs', errs);
  await b.close();
})().catch((e) => { console.log('FAIL', String(e).slice(0, 400)); process.exit(1); });
