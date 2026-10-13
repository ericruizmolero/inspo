#!/usr/bin/env node
// Read the design tokens a live page actually renders with: colors (by role),
// font families, the type scale per element role, spacing, radius, shadows,
// button variants and :root custom properties. Uses headless Chrome via
// playwright-core and the browser's computed styles, so it works for any
// framework or CSS setup.
//
// Usage:
//   node extract-url.mjs --url <url> [--out-dir <dir>] [--wait <ms>] [--channel chrome|chromium]
//
// Writes into --out-dir (default: ./.design-extract):
//   tokens.json        everything below, machine-readable
//   desktop.png        1440px-wide viewport screenshot (first screen)
//   desktop-full.png   1440px-wide full-page screenshot
//   mobile.png         390px-wide full-page screenshot
// Prints a readable summary to stdout; the last stdout line is the tokens.json path.

import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
  }
  return out;
}

async function launchBrowser(channel) {
  const attempts = channel ? [channel] : ['chrome', 'chromium'];
  let lastError;
  for (const ch of attempts) {
    try {
      return await chromium.launch(ch === 'chromium' ? { headless: true } : { channel: ch, headless: true });
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(
    `Failed to launch a browser (tried ${attempts.join(', ')}). Install Google Chrome, or run ` +
    `"npx playwright install chromium" in the skill's scripts/ folder.\nUnderlying error: ${lastError && lastError.message}`
  );
}

async function settle(page, wait) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  // Scroll through once so lazy sections and scroll-triggered styles render.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(wait);
}

// Runs in the page. Walks visible elements and tallies computed values.
function collect() {
  // Computed colors come back as rgb() for hex/rgb sources but keep their own
  // space otherwise (oklch() for Tailwind v4's palette, lab(), color(display-p3 …)),
  // so anything that isn't rgb() is painted onto a 1px canvas and read back as sRGB.
  const swatch = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgbaOf = (value) => {
    const m = value.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const parts = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
    }
    swatch.clearRect(0, 0, 1, 1);
    swatch.fillStyle = '#000';
    swatch.fillStyle = value;
    swatch.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = swatch.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const toHex = (value) => {
    if (!value || value === 'transparent' || value === 'none') return null;
    const [r, g, b, a] = rgbaOf(value);
    if (a === 0) return null;
    const hex = '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
    return a < 1 ? `${hex} @${Math.round(a * 100)}%` : hex;
  };
  const bump = (map, key, weight = 1, sample) => {
    if (key === null || key === undefined || key === '') return;
    const entry = map.get(key) || { count: 0, samples: [] };
    entry.count += weight;
    if (sample && entry.samples.length < 3 && !entry.samples.includes(sample)) entry.samples.push(sample);
    map.set(key, entry);
  };
  const describe = (el) => {
    const tag = el.tagName.toLowerCase();
    const cls = (typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
    return cls ? `${tag}.${cls}` : tag;
  };
  // Tailwind-style rings and resets leave transparent 0-size layers in box-shadow; drop them.
  const cleanShadow = (value) => {
    if (!value || value === 'none') return null;
    const layers = value.split(/,(?![^(]*\))/).map((l) => l.trim())
      .filter((l) => !/rgba\([^)]*,\s*0\)/.test(l) && !/(^|\s)0px 0px 0px( 0px)?($|\s)/.test(l.replace(/rgba?\([^)]*\)/, '').trim() + ' '));
    return layers.length ? layers.join(', ') : null;
  };
  const radius = (value) => (parseFloat(value) >= 999 ? '9999px (pill)' : value);
  const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();

  const colors = { text: new Map(), background: new Map(), border: new Map() };
  const families = new Map();
  const spacing = new Map();
  const gaps = new Map();
  const radii = new Map();
  const shadows = new Map();
  const roles = {};
  const buttons = new Map();
  const sections = [];

  const roleOf = (el) => {
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) return tag;
    if (tag === 'p' || tag === 'li') return 'body';
    if (tag === 'small' || tag === 'figcaption' || tag === 'label') return 'small';
    return null;
  };

  const all = [...document.body.querySelectorAll('*')].slice(0, 6000);
  for (const el of all) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    const area = Math.min(rect.width * rect.height, 1440 * 900);
    const label = describe(el);
    const text = ownText(el);

    if (text) {
      bump(colors.text, toHex(cs.color), text.length, label);
      const family = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      bump(families, family, text.length, label);
      const role = roleOf(el);
      if (role && !roles[role]) {
        roles[role] = {
          sample: text.slice(0, 60),
          fontFamily: cs.fontFamily,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
          textTransform: cs.textTransform,
          color: toHex(cs.color),
        };
      }
    }
    bump(colors.background, toHex(cs.backgroundColor), Math.round(area / 1000) || 1, label);
    if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') bump(colors.border, toHex(cs.borderTopColor), 1, label);

    for (const prop of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom']) {
      const px = parseFloat(cs[prop]);
      if (px > 0) bump(spacing, `${Math.round(px)}px`, 1);
    }
    for (const prop of ['rowGap', 'columnGap']) {
      const px = parseFloat(cs[prop]);
      if (px > 0) bump(gaps, `${Math.round(px)}px`, 1);
    }
    if (parseFloat(cs.borderTopLeftRadius) > 0) bump(radii, radius(cs.borderTopLeftRadius), 1, label);
    bump(shadows, cleanShadow(cs.boxShadow), 1, label);

    const tag = el.tagName.toLowerCase();
    const looksLikeButton = tag === 'button' || el.getAttribute('role') === 'button' ||
      (tag === 'a' && (toHex(cs.backgroundColor) || parseFloat(cs.borderTopWidth) > 0) && parseFloat(cs.paddingLeft) >= 8);
    if (looksLikeButton && (el.innerText || '').trim() && rect.height >= 24 && rect.height <= 80) {
      const key = [toHex(cs.backgroundColor) || 'transparent', toHex(cs.color), radius(cs.borderTopLeftRadius), cs.fontWeight,
        parseFloat(cs.borderTopWidth) > 0 ? `${cs.borderTopWidth} ${toHex(cs.borderTopColor)}` : 'no border'].join(' | ');
      const entry = buttons.get(key) || {
        background: toHex(cs.backgroundColor) || 'transparent',
        color: toHex(cs.color),
        radius: radius(cs.borderTopLeftRadius),
        padding: `${cs.paddingTop} ${cs.paddingRight}`,
        height: `${Math.round(rect.height)}px`,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        border: parseFloat(cs.borderTopWidth) > 0 ? `${cs.borderTopWidth} solid ${toHex(cs.borderTopColor)}` : 'none',
        shadow: cleanShadow(cs.boxShadow) || 'none',
        count: 0,
        labels: [],
      };
      entry.count++;
      const t = el.innerText.trim().slice(0, 30);
      if (entry.labels.length < 3 && !entry.labels.includes(t)) entry.labels.push(t);
      buttons.set(key, entry);
    }

    if (['section', 'header', 'footer'].includes(tag) && rect.height > 120 && sections.length < 20) {
      const heading = el.querySelector('h1, h2, h3');
      sections.push({
        tag,
        heading: heading ? heading.innerText.trim().slice(0, 60) : null,
        background: toHex(cs.backgroundColor),
        paddingY: `${cs.paddingTop} / ${cs.paddingBottom}`,
        height: Math.round(rect.height),
      });
    }
  }

  const customProperties = {};
  const rootStyle = getComputedStyle(document.documentElement);
  const names = new Set();
  for (const sheet of [...document.styleSheets]) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    const walk = (list) => {
      for (const rule of list) {
        if (rule.cssRules) walk(rule.cssRules);
        if (rule.style && /(^|,)\s*(:root|html)\b/.test(rule.selectorText || '')) {
          for (const prop of rule.style) if (prop.startsWith('--')) names.add(prop);
        }
      }
    };
    walk(rules);
  }
  for (const name of [...names].slice(0, 300)) customProperties[name] = rootStyle.getPropertyValue(name).trim();

  const top = (map, n) => [...map.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, n)
    .map(([value, { count, samples }]) => ({ value, count, samples }));

  return {
    title: document.title,
    colors: { text: top(colors.text, 12), background: top(colors.background, 12), border: top(colors.border, 8) },
    fontFamilies: top(families, 6),
    loadedFonts: [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family.replace(/["']/g, '')} ${f.weight}`))].slice(0, 20),
    typeRoles: roles,
    spacing: top(spacing, 16),
    gaps: top(gaps, 10),
    radii: top(radii, 8),
    shadows: top(shadows, 6),
    buttons: [...buttons.values()].sort((a, b) => b.count - a.count).slice(0, 6),
    sections,
    customProperties,
    rootFontSize: rootStyle.fontSize,
    bodyBackground: toHex(getComputedStyle(document.body).backgroundColor),
  };
}

function summarize(t) {
  const line = (arr, fmt) => arr.map(fmt).join(', ') || '—';
  const out = [];
  out.push(`# ${t.url}  (${t.title})`);
  out.push(`Text colors: ${line(t.colors.text, (c) => `${c.value} ×${c.count}`)}`);
  out.push(`Backgrounds (by area): ${line(t.colors.background, (c) => `${c.value} ×${c.count}`)}`);
  out.push(`Borders: ${line(t.colors.border, (c) => `${c.value} ×${c.count}`)}`);
  out.push(`Font families: ${line(t.fontFamilies, (f) => f.value)}  | loaded: ${t.loadedFonts.join(', ') || '—'}`);
  out.push('Type roles:');
  for (const [role, r] of Object.entries(t.typeRoles)) {
    out.push(`  ${role.padEnd(5)} ${r.fontSize}/${r.lineHeight} w${r.fontWeight} ls ${r.letterSpacing} ${r.color} "${r.sample}"`);
  }
  out.push(`Spacing: ${line(t.spacing, (s) => `${s.value}×${s.count}`)}`);
  out.push(`Gaps: ${line(t.gaps, (s) => `${s.value}×${s.count}`)}`);
  out.push(`Radii: ${line(t.radii, (s) => `${s.value}×${s.count}`)}`);
  out.push(`Shadows: ${t.shadows.length} distinct${t.shadows[0] ? ` (most used: ${t.shadows[0].value})` : ''}`);
  out.push('Buttons:');
  for (const b of t.buttons) out.push(`  bg ${b.background} text ${b.color} r ${b.radius} h ${b.height} w${b.fontWeight} border ${b.border} ×${b.count} ("${b.labels.join('", "')}")`);
  out.push(`Sections: ${t.sections.map((s) => `${s.tag}${s.heading ? ` "${s.heading}"` : ''} bg ${s.background || 'none'} pad ${s.paddingY}`).join(' · ') || '—'}`);
  out.push(`:root custom properties: ${Object.keys(t.customProperties).length}`);
  return out.join('\n');
}

const args = parseArgs(process.argv.slice(2));
if (!args.url) {
  console.error('Usage: node extract-url.mjs --url <url> [--out-dir <dir>] [--wait <ms>] [--channel chrome|chromium]');
  process.exit(2);
}
const outDir = path.resolve(args['out-dir'] || '.design-extract');
fs.mkdirSync(outDir, { recursive: true });
const wait = Number(args.wait || 800);

const browser = await launchBrowser(args.channel);
try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktop.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await settle(desktop, wait);
  const tokens = { url: args.url, ...(await desktop.evaluate(collect)) };
  await desktop.screenshot({ path: path.join(outDir, 'desktop.png') });
  await desktop.screenshot({ path: path.join(outDir, 'desktop-full.png'), fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 });
  await mobile.goto(args.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await settle(mobile, wait);
  await mobile.screenshot({ path: path.join(outDir, 'mobile.png'), fullPage: true });

  const file = path.join(outDir, 'tokens.json');
  fs.writeFileSync(file, JSON.stringify(tokens, null, 2));
  console.log(summarize(tokens));
  console.log(`Screenshots: ${path.join(outDir, 'desktop.png')}, desktop-full.png, mobile.png`);
  console.log(file);
} finally {
  await browser.close();
}
