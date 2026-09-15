# stc-deck

Prompt in, brand-compliant HTML deck and PDF out.

## How it works

```
your content ──▶ Claude ──▶ decks/*.json ──▶ lint ──▶ render ──▶ dist/*.html ──▶ PDF
                (JSON only)                  rules    templates              browser print
```

The model chooses a layout and fills slots. It never writes HTML or CSS,
so the design cannot drift and the output is small enough to generate in
a couple of seconds.

## Setup

```bash
npm install
npx playwright install chromium     # only needed for the PDF step
```

Drop your photographs in `images/` and list them in
`images/manifest.json`. Any id without a file on disk renders as a
tinted placeholder, so you can author before the assets arrive.

The logo icon (`images/logo-icon.png`) is the real asset and is inlined
as a data URI, so `dist/*.html` stays portable. The top-right lockup is
currently the icon set beside a Lexend wordmark. If you have the
official lockup, drop it in as `images/logo-lockup.svg` and it is used
whole, with no code change.

Lexend loads from Google Fonts. For offline or print-critical work,
download the woff2 files into `images/fonts/` and swap the `@import`
in `src/design/tokens.css` for `@font-face` rules.

## Build

```bash
npm run build                                    # lint + render the example
node src/render.js decks/mydeck.json dist/mydeck.html
npm run pdf dist/mydeck.html dist/mydeck.pdf     # overflow check + PDF
```

The linter is the fast gate: character and word budgets per layout, deck
structure, brand colours. The PDF step is the slow gate: it measures the
real rendered boxes in Chromium and fails if anything overflows its slide.

## Preview effects

Rendered HTML opens in presenter mode with preview-only effects and scales
the current slide to the available browser space. Click, Space, ArrowRight,
or the Next control advances bullet reveals first, then moves to the next
slide with a smooth transition. ArrowLeft goes back. Use `F` for fullscreen,
`O` for overview, `R` to reset the current slide, and `T` to expand text.

PDF and print output ignore the preview runtime: every slide is rendered
at 960 x 540 px with all bullets and expandable text fully visible.

Decks can set defaults at the top level, and any slide can override them:

```json
{
  "effect": "fade",
  "photoEffect": "slow-zoom",
  "slides": [
    {
      "layout": "L13",
      "title": "Rail is winning the long weekend",
      "reveal": "bullets",
      "photoEffect": "none",
      "bullets": [
        "Three-day trips up 18% year on year",
        {
          "text": "Panoramic routes sell out first",
          "more": "Expanded presenter note that starts faint and becomes fully visible."
        }
      ],
      "image": "bernina-winter"
    }
  ]
}
```

Supported slide entrance effects are `none`, `fade`, `fade-up`,
`slide-left`, and `scale`. Supported reveal modes are `none` and `bullets`.
Supported photo effects are `none` and `slow-zoom`.

## Canvas

960 × 540 px, which is the 16:9 slide in points. Every size from the
guidelines maps 1:1 — a 32 pt headline is `font-size: 32px` here. The
grid is 51 px margins, 22 px gutters, six 124.67 px columns.

## Files

| path | what it is |
|---|---|
| `src/design/tokens.css` | the brand: colours, type scale, grid, shapes |
| `src/design/layouts.css` | geometry of the ten layouts |
| `src/layouts.js` | the only place HTML is produced |
| `src/render.js` | JSON → HTML |
| `src/lint.js` | brand rules |
| `src/export.js` | overflow check + PDF |
| `prompts/content-to-deck.md` | the authoring prompt |
| `CLAUDE.md` | instructions for Claude Code |
