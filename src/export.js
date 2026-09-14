#!/usr/bin/env node
/* Measures real overflow in a browser, then writes the PDF.
   Usage: node src/export.js dist/index.html dist/deck.pdf        */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const htmlPath = path.resolve(root, process.argv[2] || 'dist/index.html');
const pdfPath = path.resolve(root, process.argv[3] || 'dist/deck.pdf');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

await page.evaluate(() => {
  document.body.classList.remove('presenter-mode');
  document.body.classList.add('overview-mode');
  document.querySelectorAll('.frame').forEach((frame) => {
    frame.style.display = 'block';
  });
  document.querySelectorAll('.slide').forEach((slide) => {
    slide.classList.add('is-active', 'is-expanded');
    slide.querySelectorAll('.bullets li').forEach((item) => item.classList.add('is-revealed'));
  });
});

/* Anything that sticks out of its slide box is a layout failure.
   Elements that are meant to bleed are excluded by class.        */
const overflows = await page.evaluate(() => {
  const SKIP = ['hero', 'photo', 'field', 'badge', 'slide-footer', 'logo', 'shot', 'stage', 'frame'];
  const out = [];
  document.querySelectorAll('.slide').forEach((slide) => {
    const box = slide.getBoundingClientRect();
    slide.querySelectorAll('*').forEach((el) => {
      if (SKIP.some((c) => el.classList.contains(c))) return;
      const r = el.getBoundingClientRect();
      if (!r.height) return;
      const over = Math.max(r.bottom - (box.bottom - 6), r.right - (box.right - 6));
      if (over > 1) {
        out.push({
          n: slide.dataset.n,
          layout: slide.dataset.layout,
          px: Math.round(over),
          text: (el.textContent || '').trim().slice(0, 48),
        });
      }
    });
  });
  /* keep the worst offender per slide */
  const best = new Map();
  out.forEach((o) => { if (!best.has(o.n) || best.get(o.n).px < o.px) best.set(o.n, o); });
  return [...best.values()];
});

overflows.forEach((o) =>
  console.error(`OVERFLOW slide ${o.n} (${o.layout}) by ${o.px}px — "${o.text}…"`));

await page.emulateMedia({ media: 'print' });
await page.pdf({ path: pdfPath, width: '960px', height: '540px', printBackground: true, pageRanges: '' });
await browser.close();

console.log(`pdf -> ${path.relative(root, pdfPath)}`);
if (overflows.length) { console.error(`\n${overflows.length} slide(s) overflow — fix the JSON and re-run`); process.exit(1); }
