#!/usr/bin/env node
/* Usage: node src/render.js decks/example.json dist/index.html */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { layouts, noFooter } from './layouts.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8'));

const css = () =>
  ['src/design/tokens.css', 'src/design/layouts.css']
    .map((f) => fs.readFileSync(path.resolve(root, f), 'utf8'))
    .join('\n');

const attr = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const EFFECTS = new Set(['none', 'fade', 'fade-up', 'slide-left', 'scale']);
const REVEALS = new Set(['none', 'bullets']);
const PHOTO_EFFECTS = new Set(['none', 'slow-zoom']);

const preset = (value, allowed, fallback) => {
  if (value === false) return 'none';
  return allowed.has(value) ? value : fallback;
};

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
    const effect = preset(slide.effect ?? deck.effect ?? 'fade', EFFECTS, 'fade');
    const reveal = preset(slide.reveal ?? deck.reveal ?? (slide.bullets?.length ? 'bullets' : 'none'), REVEALS, 'none');
    const photoEffect = preset(slide.photoEffect ?? deck.photoEffect ?? 'slow-zoom', PHOTO_EFFECTS, 'slow-zoom');

    const numbered = !noFooter.has(slide.layout);
    const ctx = {
      images,
      assets,
      page: numbered ? page++ : null,
      footerText: slide.footer ?? deck.footer ?? '',
      warn: (m) => warnings.push(`slide ${i + 1} (${slide.layout}): ${m}`),
    };
    return `<section class="slide ${slide.layout}" data-n="${i + 1}" data-layout="${attr(slide.layout)}" data-effect="${attr(effect)}" data-reveal="${attr(reveal)}" data-photo-effect="${attr(photoEffect)}">${fn(slide, ctx)}</section>`;
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
  .presenter-controls {
    position: fixed; left: 50%; bottom: 18px; z-index: 10;
    display: flex; align-items: center; gap: 6px;
    padding: 7px 9px; border-radius: 999px;
    background: rgba(24, 28, 33, .84); color: #fff;
    box-shadow: 0 8px 28px rgba(0,0,0,.28);
    backdrop-filter: blur(10px);
    transform: translateX(-50%);
  }
  .presenter-controls button {
    min-width: 34px; height: 34px; border: 0; border-radius: 17px;
    background: rgba(255,255,255,.12); color: inherit;
    font: 700 13px/1 var(--font);
    cursor: pointer;
  }
  .presenter-controls button:hover,
  .presenter-controls button:focus-visible { background: rgba(255,255,255,.24); outline: none; }
  .presenter-controls .status { min-width: 58px; text-align: center; font: 500 12px/1 var(--font); }
  body.presenter-mode {
    min-height: 100vh; overflow: hidden; background: #303842;
    display: flex; align-items: center; justify-content: center;
  }
  body.presenter-mode .deck {
    position: relative; display: block;
    width: 960px; height: 540px;
    gap: 0; padding: 0;
  }
  body.presenter-mode .frame {
    position: absolute; inset: 0;
    opacity: 0; pointer-events: none;
    transition: opacity .42s ease;
    will-change: opacity;
  }
  body.presenter-mode .frame.is-current {
    opacity: 1; pointer-events: auto;
    z-index: 2;
  }
  body.overview-mode .deck { width: auto !important; height: auto !important; }
  body.overview-mode .frame {
    position: static; opacity: 1; pointer-events: auto;
    transform: none; transition: none;
  }
  body.overview-mode .frame.is-current { outline: 3px solid #ffdb5c; outline-offset: 6px; }
  .js-enabled .slide[data-effect="fade"],
  .js-enabled .slide[data-effect="fade-up"],
  .js-enabled .slide[data-effect="slide-left"],
  .js-enabled .slide[data-effect="scale"] {
    opacity: 0;
    transition: opacity .48s ease, transform .48s ease;
  }
  .js-enabled .slide[data-effect="fade-up"] { transform: translateY(14px); }
  .js-enabled .slide[data-effect="slide-left"] { transform: translateX(18px); }
  .js-enabled .slide[data-effect="scale"] { transform: scale(.985); }
  .js-enabled .slide.is-active { opacity: 1; transform: none; }
  .js-enabled .slide[data-reveal="bullets"] .bullets li {
    opacity: .34; transform: translateY(5px);
    transition: opacity .22s ease, transform .22s ease;
  }
  .js-enabled .slide[data-reveal="bullets"] .bullets li.is-revealed { opacity: 1; transform: none; }
  .js-enabled .text-more {
    opacity: .28;
    transition: opacity .22s ease;
  }
  .js-enabled .slide.is-expanded .text-more { opacity: 1; }
  .js-enabled .slide .slide-footer,
  .js-enabled .slide .badge,
  .js-enabled .slide .logo,
  .js-enabled .slide .logo-lockup {
    opacity: 0;
  }
  .js-enabled .slide.is-active .slide-footer,
  .js-enabled .slide.is-active .badge,
  .js-enabled .slide.is-active .logo,
  .js-enabled .slide.is-active .logo-lockup {
    animation: chromeFade .42s ease .2s both;
  }
  .js-enabled .slide.is-active[data-photo-effect="slow-zoom"] .photo {
    animation: photoDrift 18s ease-out both;
  }
  @keyframes chromeFade {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes photoDrift {
    from { transform: scale(1.01); }
    to { transform: scale(1.06); }
  }
  @media (prefers-reduced-motion: reduce) {
    .js-enabled .slide,
    .js-enabled .slide *,
    .presenter-controls { animation: none !important; transition: none !important; }
  }
  @media print {
    @page { size: 960px 540px; margin: 0; }
    body { background: #fff; display: block !important; }
    .deck { gap: 0; padding: 0; }
    .presenter-controls { display: none !important; }
    .frame { display: block !important; box-shadow: none; break-after: page; outline: none !important; }
    .stage, .slide, .slide * { transform: none !important; }
    .slide, .slide * { animation: none !important; transition: none !important; opacity: 1 !important; }
    .frame, .stage { width: 960px !important; height: 540px !important; }
  }
</style>
</head>
<body>
<div class="deck">
${slides.map((s) => `<div class="frame"><div class="stage">${s}</div></div>`).join('\n')}
</div>
<div class="presenter-controls" aria-label="Presentation controls">
  <button type="button" data-action="prev" title="Previous slide">Prev</button>
  <button type="button" data-action="next" title="Next reveal or slide">Next</button>
  <button type="button" data-action="expand" title="Expand text">Text</button>
  <button type="button" data-action="overview" title="Toggle overview">Grid</button>
  <button type="button" data-action="fullscreen" title="Fullscreen">Full</button>
  <button type="button" data-action="reset" title="Reset slide">Reset</button>
  <span class="status" aria-live="polite"></span>
</div>
<script>
  // Preview only. Print output is always 1:1 and fully revealed.
  (function () {
    document.documentElement.classList.add('js-enabled');

    const frames = Array.from(document.querySelectorAll('.frame'));
    const deck = document.querySelector('.deck');
    const controls = document.querySelector('.presenter-controls');
    const status = controls.querySelector('.status');
    let current = 0;
    let overview = false;

    function clamp(n) {
      return Math.max(0, Math.min(frames.length - 1, n));
    }

    function slideAt(index) {
      return frames[index]?.querySelector('.slide');
    }

    function revealItems(slide) {
      return slide?.dataset.reveal === 'bullets'
        ? Array.from(slide.querySelectorAll('.bullets li'))
        : [];
    }

    function setReveal(slide, count) {
      const items = revealItems(slide);
      const next = Math.max(0, Math.min(items.length, count));
      slide.dataset.revealed = String(next);
      items.forEach((item, i) => item.classList.toggle('is-revealed', i < next));
    }

    function resetSlide(slide) {
      if (!slide) return;
      setReveal(slide, 0);
      slide.classList.remove('is-expanded');
      slide.querySelectorAll('.photo').forEach((photo) => {
        photo.style.animation = 'none';
        void photo.offsetHeight;
        photo.style.animation = '';
      });
    }

    function fit() {
      const presenter = document.body.classList.contains('presenter-mode');
      const padX = presenter ? 48 : 80;
      const padY = presenter ? 96 : 48;
      const fitScale = Math.min((window.innerWidth - padX) / 960, (window.innerHeight - padY) / 540);
      const scale = Math.max(.25, presenter ? fitScale : Math.min(1, fitScale));
      deck.style.width = presenter ? (960 * scale) + 'px' : '';
      deck.style.height = presenter ? (540 * scale) + 'px' : '';
      frames.forEach((f) => {
        f.style.width = (960 * scale) + 'px';
        f.style.height = (540 * scale) + 'px';
        f.querySelector('.stage').style.transform = 'scale(' + scale + ')';
      });
    }

    function updateStatus() {
      status.textContent = (current + 1) + ' / ' + frames.length;
    }

    function activate(index, options = {}) {
      current = clamp(index);
      frames.forEach((frame, i) => {
        const slide = frame.querySelector('.slide');
        const active = overview || i === current;
        frame.classList.toggle('is-current', i === current);
        slide.classList.toggle('is-active', active);
      });
      if (options.reset) resetSlide(slideAt(current));
      updateStatus();
      fit();
      if (overview) frames[current].scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    function advance() {
      const slide = slideAt(current);
      const items = revealItems(slide);
      const revealed = Number(slide?.dataset.revealed || 0);
      if (items.length && revealed < items.length) {
        setReveal(slide, revealed + 1);
        return;
      }
      if (slide?.querySelector('.has-more') && !slide.classList.contains('is-expanded')) {
        slide.classList.add('is-expanded');
        return;
      }
      activate(current + 1);
    }

    function retreat() {
      const slide = slideAt(current);
      const revealed = Number(slide?.dataset.revealed || 0);
      if (slide?.classList.contains('is-expanded')) {
        slide.classList.remove('is-expanded');
        return;
      }
      if (revealed > 0) {
        setReveal(slide, revealed - 1);
        return;
      }
      activate(current - 1);
    }

    function toggleOverview() {
      overview = !overview;
      document.body.classList.toggle('overview-mode', overview);
      document.body.classList.toggle('presenter-mode', !overview);
      activate(current);
    }

    function toggleFullscreen() {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    }

    controls.addEventListener('click', (event) => {
      const action = event.target.closest('button')?.dataset.action;
      if (!action) return;
      if (action === 'prev') retreat();
      if (action === 'next') advance();
      if (action === 'expand') slideAt(current)?.classList.toggle('is-expanded');
      if (action === 'overview') toggleOverview();
      if (action === 'fullscreen') toggleFullscreen();
      if (action === 'reset') activate(current, { reset: true });
    });

    document.addEventListener('click', (event) => {
      if (event.target.closest('.presenter-controls') || event.target.closest('a')) return;
      event.shiftKey ? retreat() : advance();
    });

    document.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) { event.preventDefault(); advance(); }
      if (['ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); retreat(); }
      if (event.key === 'Home') { event.preventDefault(); activate(0); }
      if (event.key === 'End') { event.preventDefault(); activate(frames.length - 1); }
      if (event.key.toLowerCase() === 'f') { event.preventDefault(); toggleFullscreen(); }
      if (event.key.toLowerCase() === 'r') { event.preventDefault(); activate(current, { reset: true }); }
      if (event.key.toLowerCase() === 't') { event.preventDefault(); slideAt(current)?.classList.toggle('is-expanded'); }
      if (event.key.toLowerCase() === 'o') { event.preventDefault(); toggleOverview(); }
    });

    frames.forEach((_, i) => resetSlide(slideAt(i)));
    document.body.classList.add('presenter-mode');
    addEventListener('resize', fit);
    activate(0, { reset: true });
  })();
</script>
</body>
</html>`;

  return { html, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
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
