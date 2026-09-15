/* ---------------------------------------------------------------
   Layout components. The model never writes HTML; it picks one of
   these ids and fills the slots. Adding a layout is a human change.
   --------------------------------------------------------------- */

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Only **bold** is allowed inside copy — highlights per guideline p.4. */
const rich = (s = '') => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

const textParts = (value = '') => {
  if (!value || typeof value !== 'object') return { text: value, more: '' };
  return {
    text: value.text ?? value.label ?? '',
    more: value.more ?? value.expand ?? value.details ?? '',
  };
};

const expandMore = (more = '') => {
  if (!more) return '';
  const text = Array.isArray(more) ? more.join(' ') : more;
  return ` <span class="text-more">${rich(text)}</span>`;
};

const paras = (arr = [], cls = '') =>
  (Array.isArray(arr) ? arr : [arr]).map((t) => {
    const parts = textParts(t);
    const hasMore = parts.more ? ' has-more' : '';
    return `<p class="copy ${cls}${hasMore}">${rich(parts.text)}${expandMore(parts.more)}</p>`;
  }).join('');

const bullets = (items = [], cls = '') =>
  `<ul class="bullets ${cls}">${items.map((b) => {
    const parts = textParts(b);
    const hasMore = parts.more ? ' class="has-more"' : '';
    return `<li${hasMore}>${rich(parts.text)}${expandMore(parts.more)}</li>`;
  }).join('')}</ul>`;

/* Images are resolved against images/manifest.json. An unknown id
   renders as a visible placeholder and is reported by the linter. */
function photo(id, ctx) {
  if (!id) return `<div class="photo-missing">no image</div>`;
  const entry = ctx.images[id];
  if (!entry) {
    ctx.warn(`unknown image id "${id}"`);
    return `<div class="photo-missing">missing: ${esc(id)}</div>`;
  }
  if (entry.missing) {
    const tints = ['water-light', 'stone-light', 'forest-light', 'sun-light', 'berry-light'];
    const tint = tints[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % tints.length];
    return `<div class="photo-placeholder ${tint}">${esc(entry.alt || id)}</div>`;
  }
  const focus = entry.focus || '50% 50%';
  return `<img class="photo" src="${esc(entry.src)}" alt="${esc(entry.alt || '')}" style="object-position:${esc(focus)}">`;
}

const colorClass = (name, fallback) => `bg-${esc(name || fallback)}`;

/* ---- chrome ---------------------------------------------------- */

/* Real brand assets, injected by render.js as data URIs so the output
   HTML is a single portable file. */
const badge = () => `<div class="badge" role="presentation"></div>`;

const logo = (ctx) => {
  if (ctx.assets.lockup) return `<div class="logo logo-image" role="img" aria-label="Switzerland Travel Centre"></div>`;
  return `<div class="logo-lockup">
      <div class="mark"></div>
      <div class="type"><span>switzerland</span><span>travel centre</span><em>Book. Travel. Enjoy.</em></div>
    </div>`;
};

function footer(ctx) {
  if (!ctx.page) return '';
  return `<div class="slide-footer"><span class="pagenum">${ctx.page}</span>` +
    `<span class="footer-text">${esc(ctx.footerText || '')}</span><span class="spacer"></span></div>${badge()}`;
}

const titleBlock = (s) =>
  `<div class="title-block"><h1 class="headline">${rich(s.title)}</h1>` +
  (s.subline ? `<p class="subline">${rich(s.subline)}</p>` : '') + `</div>`;

/* ---- layouts ---------------------------------------------------- */

export const layouts = {

  /* Opening title. Once, at the very beginning. */
  L1: (s, ctx) => `
    ${logo(ctx)}
    <div class="hero">${photo(s.image, ctx)}
      <div class="hero-text">
        <h1 class="headline">${rich(s.title)}</h1>
        ${s.subline ? `<p class="subline">${rich(s.subline)}</p>` : ''}
      </div>
    </div>`,

  /* Chapter opener: colour field beside a photograph. */
  L2: (s, ctx) => `
    <div class="pair">
      <div class="field ${colorClass(s.color, 'sun-light')}">
        <h1 class="headline">${rich(s.title)}</h1>
        ${s.body ? paras(s.body) : ''}
      </div>
      <div class="shot">${photo(s.image, ctx)}</div>
    </div>`,

  /* Agenda. Once per deck, straight after the title. */
  L6: (s, ctx) => {
    let n = 0;
    const rows = (s.items || []).map((it) => {
      const isBreak = it.break === true;
      const idx = isBreak ? '' : `${++n}.`;
      return `<li class="${isBreak ? 'break' : ''}"><span class="idx">${idx}</span>` +
        `<span class="what">${rich(it.label)}</span>` +
        `<span class="when">${esc(it.time || '')}</span></li>`;
    }).join('');
    return `${titleBlock(s)}<div class="grid agenda"><ol>${rows}</ol></div>${footer(ctx)}`;
  },

  /* Large amount of running text, two columns. */
  L8: (s, ctx) => `
    ${titleBlock(s)}
    <div class="grid cols">
      <div class="col-a">${paras(s.left)}</div>
      <div class="col-b">${paras(s.right)}</div>
    </div>${footer(ctx)}`,

  /* Text with two stacked photographs. Use sparingly, for rhythm. */
  L11: (s, ctx) => `
    ${titleBlock(s)}
    <div class="grid body">
      <div class="col-a">${paras(s.left)}</div>
      <div class="col-b">${paras(s.right)}</div>
      <div class="shots">
        <div class="shot">${photo((s.images || [])[0], ctx)}</div>
        <div class="shot">${photo((s.images || [])[1], ctx)}</div>
      </div>
    </div>${footer(ctx)}`,

  /* The workhorse: short bullets beside one tall photograph. */
  L13: (s, ctx) => `
    ${titleBlock(s)}
    <div class="grid body">
      <div class="list">${bullets(s.bullets)}</div>
      <div class="shot">${photo(s.image, ctx)}</div>
    </div>${footer(ctx)}`,

  /* Variation of L13: photograph left, longer bullets right. */
  L14: (s, ctx) => `
    ${titleBlock(s)}
    <div class="grid body">
      <div class="shot">${photo(s.image, ctx)}</div>
      <div class="list">${bullets(s.bullets)}</div>
    </div>${footer(ctx)}`,

  /* Chapter opener on a plain colour field. */
  L15: (s, ctx) => `
    <div class="field ${colorClass(s.color, 'forest-light')}">
      <h1 class="headline">${rich(s.title)}</h1>
      ${s.subline ? `<p class="subline">${rich(s.subline)}</p>` : ''}
    </div>${footer(ctx)}`,

  /* Data slide. Table and/or bar chart, optional side panel. */
  L18: (s, ctx) => {
    const table = s.table ? `<table class="data-table">
        <thead><tr>${s.table.head.map((h, i) => `<th class="${i ? 'num' : ''}">${esc(h)}</th>`).join('')}</tr></thead>
        <tbody>${s.table.rows.map((r) =>
          `<tr>${r.map((c, i) => `<td class="${i ? 'num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>` : '';

    const chart = s.chart ? (() => {
      const max = Math.max(...s.chart.series.map((d) => d.value));
      return `<div class="bar-chart">${s.chart.series.map((d) =>
        `<div class="bar-group">
           <span class="bar-label">${esc(d.display ?? d.value)}</span>
           <div class="bar ${colorClass(d.color, 'water')}" style="height:${(d.value / max) * 82}%"></div>
           <span class="bar-label">${esc(d.label)}</span>
         </div>`).join('')}</div>
         ${s.chart.caption ? `<p class="small" style="margin-top:12px">${rich(s.chart.caption)}</p>` : ''}`;
    })() : '';

    const side = s.side ? `<div class="side">
        ${s.side.image ? `<div class="shot">${photo(s.side.image, ctx)}</div>` : ''}
        ${s.side.heading ? `<h2 class="subline">${rich(s.side.heading)}</h2>` : ''}
        ${s.side.body ? paras(s.side.body, 'is-small') : ''}
        ${s.side.cta ? `<a class="cta-button" href="${esc(s.side.cta.href || '#')}">${esc(s.side.cta.label)}</a>` : ''}
      </div>` : '';

    return `${titleBlock(s)}
      <div class="grid body">
        <div class="main ${side ? '' : 'full'}">${chart}${chart && table ? '<div style="height:20px"></div>' : ''}${table}</div>
        ${side}
      </div>${footer(ctx)}`;
  },

  /* Closing slide. Every deck ends here. */
  L22: (s, ctx) => `
    ${logo(ctx)}
    <div class="closing">
      <h1 class="headline">${rich(s.headline || 'more on\nswitzerlandtravelcentre.com').replace(/\n/g, '<br>')}</h1>
      <div class="address">${(s.address || [
        'Switzerland Travel Centre AG', 'Kalanderplatz 5', 'CH–8045 Zürich',
        '+41 43 210 55 00', 'info@stc.ch', 'switzerlandtravelcentre.com',
      ]).map((l) => `<p class="copy">${rich(l)}</p>`).join('')}</div>
    </div>${footer(ctx)}`,
};

/* Slides that carry the logo instead of a footer, and are never numbered. */
export const noFooter = new Set(['L1', 'L2', 'L22']);
