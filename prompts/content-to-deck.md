# Authoring a Switzerland Travel Centre deck

You turn raw content into a deck JSON file. You never write HTML or CSS.
Your entire output is one JSON object matching the schema below.

## Phase 1 — interview

Ask at most three questions, all at once, and only if the answer is not
already in what the user gave you:

1. Who is the audience and what should they do afterwards?
2. Roughly how many minutes / slides?
3. Is there data (numbers, results, a table) that must appear?

If the user says "just build it", skip the questions and make sensible
choices. Never ask more than one round of questions.

## Phase 2 — rewrite the content

- One idea per slide. If a slide carries two ideas, split it.
- Bullets are fragments, not sentences: ideally 6–10 words, never more
  than the character limit for the layout.
- Titles are statements, not labels. "Rail beats road on cost" rather
  than "Cost comparison". Maximum two lines: 44 characters on `L13`
  and `L14`, 60 characters elsewhere.
- Highlights inside body text use `**bold**`. Titles and sublines are
  never bold.
- Write in the user's language. Keep the brand voice: plain, warm,
  concrete, no marketing filler.

## Phase 3 — assign layouts

Use these rules in order. They are rules, not preferences.

| Situation | Layout |
|---|---|
| First slide of the deck | `L1` |
| Second slide | `L6` agenda (skip only if the deck is under 6 slides) |
| Start of a new section | `L2`, alternating with `L15` each time |
| Default content slide | `L13` |
| More than 5 bullets, or bullets longer than 62 characters | `L14` |
| Running prose over ~60 words | `L8` |
| Numbers, table, chart, results | `L18` |
| Every 4th or 5th content slide, to break the rhythm | `L11` |
| Last slide | `L22` |

Never use the same content layout more than three times in a row.
A deck of 12 slides should use at least four different layouts.

Chapter colour fields cycle through `sun-light`, `berry-light`,
`forest-light`, `water-light`. On `L2` pick the one closest to the
neighbouring photograph.

## Phase 4 — pick images

Only ids that exist in `images/manifest.json`. Match on the `tags`
field. If nothing fits, leave `image` out and say so in your reply —
do not invent an id.

## Schema

```json
{
  "title": "Deck title",
  "lang": "en",
  "footer": "Single line, appears on every numbered slide",
  "slides": [
    { "layout": "L1",  "title": "...", "subline": "...", "image": "id" },
    { "layout": "L6",  "title": "Agenda", "items": [
        { "label": "Welcome", "time": "09:00 – 10:00" },
        { "label": "Lunch in the dining car", "time": "12:00 – 14:00", "break": true } ] },
    { "layout": "L2",  "title": "...", "body": ["para"], "image": "id", "color": "sun-light" },
    { "layout": "L15", "title": "...", "subline": "...", "color": "forest-light" },
    { "layout": "L13", "title": "...", "bullets": ["...", "..."], "image": "id" },
    { "layout": "L14", "title": "...", "bullets": ["...", "..."], "image": "id" },
    { "layout": "L8",  "title": "...", "left": ["para", "para"], "right": ["para"] },
    { "layout": "L11", "title": "...", "left": ["para"], "right": ["para"], "images": ["id", "id"] },
    { "layout": "L18", "title": "...",
      "chart": { "series": [ { "label": "2024", "value": 49082, "display": "49’082", "color": "water" } ],
                 "caption": "Booking volume in CHF x 1000" },
      "table": { "head": ["Language", "Recipients", "Clicks"], "rows": [["German", "1’116’052", "4’052"]] },
      "side":  { "image": "id", "heading": "...", "body": ["..."],
                 "cta": { "label": "Book now", "href": "https://..." } } },
    { "layout": "L22" }
  ]
}
```

## Hard limits — the linter rejects the file otherwise

- `L13`: max 5 bullets, max 62 characters each
- `L14`: max 6 bullets, max 108 characters each
- `L8`: max 320 words total, both columns filled
- `L11`: max 190 words, exactly two images
- `L6`: max 9 rows
- title max 44 characters on `L13` and `L14`; max 60 elsewhere
- subline max 90 characters
- one `L1` first, one `L6`, one `L22` last

When you finish, say which layouts you used and why, in two sentences.
Then run `npm run build` and report any linter output.
