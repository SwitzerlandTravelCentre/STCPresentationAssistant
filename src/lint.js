#!/usr/bin/env node
/* Static brand rules. Runs in milliseconds, no browser needed.
   Usage: node src/lint.js decks/example.json                    */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderDeck } from './render.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8'));

/* Capacity figures measured against Lexend at the spec sizes on the
   960 px canvas. Keep them conservative; the browser check in
   export.js is the authority. */
const LIMITS = {
  titleChars: 60,        // headline over two lines at 32/36 across 4 columns
  sublineChars: 90,
  L13: { bullets: 5, chars: 62 },
  L14: { bullets: 6, chars: 108 },
  L8:  { words: 320 },
  L11: { words: 190 },
  L6:  { items: 9 },
  L18: { sideHeading: 40, sideChars: 180, bars: 8, rows: 8 },
  footerChars: 120,
};

export function lintDeck(deck, images) {
  const errors = [];
  const warns = [];
  const at = (i, msg, list = errors) => list.push(`slide ${i + 1}: ${msg}`);

  const s = deck.slides || [];
  const kinds = s.map((x) => x.layout);

  /* deck-level structure */
  if (kinds[0] !== 'L1') errors.push('deck must open with L1');
  if (kinds.filter((k) => k === 'L1').length > 1) errors.push('only one L1 per deck');
  if (kinds.filter((k) => k === 'L6').length > 1) errors.push('only one agenda (L6) per deck');
  if (kinds[kinds.length - 1] !== 'L22') errors.push('deck must close with L22');
  if (kinds.filter((k) => k === 'L22').length > 1) errors.push('only one L22 per deck');

  /* rhythm: warn if the same content layout repeats four times running */
  for (let i = 3; i < kinds.length; i++) {
    if (['L13', 'L14', 'L8'].includes(kinds[i]) &&
        kinds[i] === kinds[i - 1] && kinds[i] === kinds[i - 2] && kinds[i] === kinds[i - 3]) {
      at(i, `${kinds[i]} four times in a row — vary the layout`, warns);
    }
  }

  const words = (v) => (Array.isArray(v) ? v.join(' ') : v || '').split(/\s+/).filter(Boolean).length;

  s.forEach((sl, i) => {
    if (sl.title && sl.title.length > LIMITS.titleChars)
      at(i, `title is ${sl.title.length} chars, over ${LIMITS.titleChars} — would exceed 2 lines`);
    if (sl.title && /\*\*/.test(sl.title))
      at(i, 'headlines and sublines may not be bold');
    if (sl.subline && sl.subline.length > LIMITS.sublineChars)
      at(i, `subline too long (${sl.subline.length} chars)`);
    const f = sl.footer ?? deck.footer ?? '';
    if (f.length > LIMITS.footerChars) at(i, 'footer must stay single-line');

    switch (sl.layout) {
      case 'L13':
      case 'L14': {
        const L = LIMITS[sl.layout];
        const b = sl.bullets || [];
        if (!b.length) at(i, 'no bullets');
        if (b.length > L.bullets) at(i, `${b.length} bullets, max ${L.bullets} — split the slide or use L8`);
        b.forEach((t, j) => {
          if (t.replace(/\*\*/g, '').length > L.chars)
            at(i, `bullet ${j + 1} is ${t.length} chars, max ${L.chars}`);
        });
        if (!sl.image) at(i, 'needs an image');
        break;
      }
      case 'L8': {
        const w = words(sl.left) + words(sl.right);
        if (w > LIMITS.L8.words) at(i, `${w} words, max ${LIMITS.L8.words} — split into two slides`);
        if (!sl.left || !sl.right) at(i, 'both columns must be filled — single wide text column is not permitted');
        break;
      }
      case 'L11': {
        const w = words(sl.left) + words(sl.right);
        if (w > LIMITS.L11.words) at(i, `${w} words, max ${LIMITS.L11.words}`);
        if ((sl.images || []).length !== 2) at(i, 'L11 needs exactly two images');
        break;
      }
      case 'L18': {
        const L = LIMITS.L18;
        const side = sl.side || {};
        if (side.heading && side.heading.length > L.sideHeading)
          at(i, `side heading is ${side.heading.length} chars, max ${L.sideHeading}`);
        const chars = (Array.isArray(side.body) ? side.body.join(' ') : side.body || '').length;
        if (chars > L.sideChars)
          at(i, `side text is ${chars} chars, max ${L.sideChars} — the panel would push the button off the slide`);
        if (sl.chart && sl.chart.series.length > L.bars)
          at(i, `${sl.chart.series.length} bars, max ${L.bars}`);
        if (sl.table && sl.table.rows.length > L.rows)
          at(i, `${sl.table.rows.length} table rows, max ${L.rows}`);
        if (sl.chart && sl.table && sl.side)
          at(i, 'chart plus table plus side panel does not fit — drop one');
        break;
      }
      case 'L6':
        if ((sl.items || []).length > LIMITS.L6.items) at(i, `agenda has ${sl.items.length} rows, max ${LIMITS.L6.items}`);
        break;
      case 'L2':
      case 'L15':
        if (sl.color && !/^(sun|sun-light|berry|berry-light|forest|forest-light|water|water-light|stone|stone-light|stone-medium|black)$/.test(sl.color))
          at(i, `"${sl.color}" is not a brand colour`);
        break;
    }
  });

  /* image ids are checked by the renderer */
  warns.push(...renderDeck(deck, images).warnings);
  return { errors, warns };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const deck = read(process.argv[2] || 'decks/example.json');
  const { errors, warns } = lintDeck(deck, read('images/manifest.json'));
  warns.forEach((w) => console.warn('warn ', w));
  errors.forEach((e) => console.error('ERROR', e));
  console.log(errors.length ? `\n${errors.length} error(s)` : '\nlint clean');
  process.exit(errors.length ? 1 : 0);
}
