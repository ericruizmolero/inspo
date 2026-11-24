// Los textos de plantilla.html (COPY) tal como se leen sin JavaScript, en JSON, para construir.py: por idioma, los que
// son una cadena. Falla si COPY no está donde se espera.
const fs = require('fs'), path = require('path'), vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, 'plantilla.html'), 'utf8');
const m = html.match(/\n  const COPY = (\{\n[\s\S]*?\n  \});\n/);
if (!m) throw new Error('plantilla.html: no encuentro COPY');
const COPY = vm.runInNewContext('(' + m[1] + ')');

const esc = (x) => x.replace(/[&<{}]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '{': '&#123;', '}': '&#125;' })[c]);
const out = {};
for (const [lang, c] of Object.entries(COPY)) {
  out[lang] = Object.fromEntries(Object.entries(c).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, esc(v).replace(/"/g, '&quot;')]));
}
process.stdout.write(JSON.stringify(out));
