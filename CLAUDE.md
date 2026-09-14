# Working in this repo

This repo turns prompted content into a brand-compliant slide deck.
The design is fixed by `DesignGuidelines.pdf` and is not yours to change.

## What you do

Read `prompts/content-to-deck.md` and follow it. Your job is to write
**one JSON file** in `decks/`. Then run the build and fix anything the
linter reports.

```
npm run lint  decks/<name>.json      # brand rules, instant
node src/render.js decks/<name>.json dist/<name>.html
npm run pdf   dist/<name>.html dist/<name>.pdf   # overflow check + PDF
```

## What you do not do

- Do not write or edit HTML in `dist/` — it is generated output.
- Do not edit `src/design/tokens.css` or `src/design/layouts.css`.
  If a slide does not fit, change the content, not the design.
- Do not add a layout. The ten in `src/layouts.js` are the approved set.
- Do not invent image ids. Only what is in `images/manifest.json`.
- Do not touch `images/logo-icon.png` or `images/logo-lockup.svg`.

If a piece of content genuinely cannot be expressed in any of the ten
layouts, say so and propose how to split it. Do not improvise a layout.

## The layouts

| id | from the PDF | use |
|---|---|---|
| L1 | p.1 | opening title on a photograph, once |
| L2 | p.2 | chapter opener, colour field beside a photograph |
| L6 | p.6 | agenda, once per deck |
| L8 | p.8 | large amount of running text, two columns |
| L11 | p.11 | text with two photographs, for rhythm |
| L13 | p.13 | default content slide, bullets plus one photograph |
| L14 | p.14 | variation of L13, photograph left, longer bullets |
| L15 | p.15 | chapter opener on a plain colour field |
| L18 | p.18 | data: chart, table, optional side panel |
| L22 | p.22 | closing slide, every deck |

## Non-negotiable brand rules (enforced by `src/lint.js`)

- Headlines maximum two lines; headlines and sublines are never bold.
- Body text never spans more than four of the six columns.
- Footer stays on one line.
- Links are black and underlined.
- Only the twelve brand colours; white type only on water, stone, black.
