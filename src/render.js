#!/usr/bin/env node
/* Usage: node src/render.js decks/example.json dist/index.html */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { layouts, noFooter } from './layouts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8'));

const css = () =>
  ['src/design/tokens.css', 'src/design/layouts.css']
    .map((f) => fs.readFileSync(path.resolve(root, f), 'utf8'))
    .join('\n');

/* Brand assets become data URIs so dist/*.html is portable. Drop
   images/logo-lockup.svg in and it replaces the composed wordmark. */
export function loadAssets() {
  const uri = (file, mime) => {
    const abs = path.resolve(root, file);
    if (!fs.existsSync(abs)) return null;
    return `data:${mime};base64,${fs.readFileSync(abs).toString('base64')}`;
  };
  return {
    icon: uri('images/logo-icon.png', 'image/png') || uri('images/logo-icon.jpg', 'image/jpeg'),
    lockup: uri('images/logo-lockup.svg', 'image/svg+xml') || uri('images/logo-lockup.png', 'image/png'),
  };
}

export function renderDeck(deck, images, assets = { icon: null, lockup: null }) {
  const warnings = [];
  let page = 2; // the opening title slide is unnumbered; numbering starts after it

  const slides = deck.slides.map((slide, i) => {
    const fn = layouts[slide.layout];
    if (!fn) {
      warnings.push(`slide ${i + 1}: unknown layout "${slide.layout}"`);
      return '';
    }
    const numbered = !noFooter.has(slide.layout);
    const ctx = {
      images,
      assets,
      page: numbered ? page++ : null,
      footerText: slide.footer ?? deck.footer ?? '',
      warn: (m) => warnings.push(`slide ${i + 1} (${slide.layout}): ${m}`),
    };
    return `<section class="slide ${slide.layout}" data-n="${i + 1}" data-layout="${slide.layout}">${fn(slide, ctx)}</section>`;
  });

  const html = `<!doctype html>
<html lang="${deck.lang || 'en'}">
<head>
<meta charset="utf-8">
<title>${deck.title || 'Presentation'}</title>
<style>
:root{--logo-icon:url('${assets.icon || ''}');--logo-lockup:url('${assets.lockup || ''}')}
${css()}
</style>
<style>
  body { margin: 0; background: #6b7280; }
  .deck { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 24px 0; }
  .stage { width: var(--slide-w); height: var(--slide-h); transform-origin: top left; }
  .frame { box-shadow: 0 6px 24px rgba(0,0,0,.35); background: #fff; overflow: hidden; }
  @media print {
    @page { size: 960px 540px; margin: 0; }
    body { background: #fff; }
    .deck { gap: 0; padding: 0; }
    .frame { box-shadow: none; break-after: page; }
    .stage { transform: none !important; }
    .frame, .stage { width: 960px !important; height: 540px !important; }
  }
</style>
</head>
<body>
<div class="deck">
${slides.map((s) => `<div class="frame"><div class="stage">${s}</div></div>`).join('\n')}
</div>
<script>
  // Preview only. Print output is always 1:1.
  function fit() {
    const scale = Math.min(1, (window.innerWidth - 80) / 960);
    document.querySelectorAll('.frame').forEach(f => {
      f.style.width = (960 * scale) + 'px';
      f.style.height = (540 * scale) + 'px';
      f.querySelector('.stage').style.transform = 'scale(' + scale + ')';
    });
  }
  addEventListener('resize', fit); fit();
</script>
</body>
</html>`;

  return { html, warnings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const deckPath = process.argv[2] || 'decks/example.json';
  const outPath = process.argv[3] || 'dist/index.html';
  const deck = read(deckPath);
  const images = read('images/manifest.json');
  const outDir = path.resolve(root, path.dirname(outPath));
  for (const [id, entry] of Object.entries(images)) {
    if (!fs.existsSync(path.resolve(outDir, entry.src))) {
      entry.missing = true;
      console.warn(`  warn: no file for image "${id}" (${entry.src}) — placeholder used`);
    }
  }
  const { html, warnings } = renderDeck(deck, images, loadAssets());
  fs.mkdirSync(path.resolve(root, path.dirname(outPath)), { recursive: true });
  fs.writeFileSync(path.resolve(root, outPath), html);
  console.log(`rendered ${deck.slides.length} slides -> ${outPath}`);
  warnings.forEach((w) => console.warn('  warn:', w));
}
