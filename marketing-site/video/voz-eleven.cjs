// Locución con ElevenLabs en UNA toma con marcas de tiempo, cortada por bloques (receta de savvia-web-main/tools/casos-video/voz-toma.cjs).
// Uso: node voz-eleven.cjs voces            → lista las voces de la cuenta
//      node voz-eleven.cjs <es|en> <voiceId> [modelo=eleven_v4] [stability=0.4] [style=0.3]
// La clave se lee de ELEVENLABS_API_KEY del entorno; nunca se escribe en disco.
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const KEY = process.env.ELEVENLABS_API_KEY; if (!KEY) { console.error('falta ELEVENLABS_API_KEY'); process.exit(2); }
const [l, voz, modelo = 'eleven_v4', stab = '0.4', style = '0.3'] = process.argv.slice(2);
(async () => {
  if (l === 'voces') { const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': KEY } }); if (!r.ok) { console.error(r.status, (await r.text()).slice(0, 300)); process.exit(1); } const j = await r.json(); for (const v of j.voices) console.log(v.voice_id, '|', v.name, '|', v.category, '|', [v.labels?.gender, v.labels?.accent, v.labels?.age, v.labels?.descriptive, v.labels?.use_case].filter(Boolean).join(', ')); return; }
  const src = fs.readFileSync(path.join(__dirname, 'montar.cjs'), 'utf8'), blk = src.match(new RegExp(l + ": \\{\\s*blocks: \\[(.*?)\\],\\s*steps", 's'))[1], parrs = [...blk.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]).map((p) => l === "es" ? p.replace(/tu IA/g, "tu i a") : p); // solo en la pista de voz: «IA» se deletrea
  if (parrs.length !== 7) { console.error('esperaba 7 bloques, hay', parrs.length); process.exit(1); }
  const D = path.join(__dirname, 'voz', l), TOMA = path.join(D, 'toma'); fs.mkdirSync(TOMA, { recursive: true }); const texto = parrs.join('\n\n');
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz}/with-timestamps?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': KEY, 'content-type': 'application/json' }, body: JSON.stringify({ text: texto, model_id: modelo, language_code: l, voice_settings: { stability: +stab, similarity_boost: 0.75, style: +style, use_speaker_boost: false } }) });
  if (!r.ok) { console.error(r.status, (await r.text()).slice(0, 400)); process.exit(1); }
  const j = await r.json(), a = j.alignment, ch = a.characters, s = a.character_start_times_seconds, e = a.character_end_times_seconds, toma = path.join(TOMA, 'toma.mp3');
  fs.writeFileSync(toma, Buffer.from(j.audio_base64, 'base64')); fs.writeFileSync(path.join(TOMA, 'align.json'), JSON.stringify(a)); fs.writeFileSync(path.join(TOMA, 'texto.txt'), texto + `\n\n[${voz} ${modelo} ${stab} ${style}]`);
  let i = 0; const dur = e[e.length - 1], N = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6a', 'b6b'];
  parrs.forEach((p, k) => { const n = p.replace(/\s+/g, '').length; let cnt = 0, t0 = null, t1 = null; while (i < ch.length && cnt < n) { if (ch[i].trim()) { if (t0 === null) t0 = s[i]; t1 = e[i]; cnt++; } i++; }
    const ini = Math.max(0, t0 - 0.08), fin = Math.min(dur, t1 + 0.14); execSync(`ffmpeg -y -loglevel error -ss ${ini.toFixed(3)} -to ${fin.toFixed(3)} -i "${toma}" -af "afade=t=in:d=0.03,afade=t=out:st=${(fin - ini - 0.06).toFixed(3)}:d=0.06" -c:a libmp3lame -q:a 2 "${path.join(D, N[k] + '.mp3')}"`); console.log(N[k], ini.toFixed(2), '→', fin.toFixed(2), (fin - ini).toFixed(2) + ' s', p.slice(0, 50)); });
  console.log('toma de', dur.toFixed(1), 's');
})();
