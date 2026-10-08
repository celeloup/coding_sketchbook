# Coding Sketchbook

Small p5.js experiments, bound as a sketchbook. Each spread: notes and controls on
the left, the live sketch on the right.

## Add a sketch

1. Copy `sketches/flow-field.js` to `sketches/<slug>.js` and edit it:
   - `meta` — `slug` (used in the URL `#/<slug>`), `title`, `date` (`YYYY-MM-DD`)
   - `notes` — HTML shown under the controls
   - `params` — one entry per control:
     - `{ min, max, step, value }` → slider
     - `{ value: true }` → checkbox
     - `{ type: 'color', value: '#b5523b' }` → colour picker
     - `{ type: 'button' }` → button; set `params.x.onClick` inside the sketch
     - optional `label` on any of them
   - `sketch(p, params)` — p5 instance mode. Don't call `createCanvas`: the book sizes
     the canvas to the page. Read `p.width` / `p.height`, and `params.x.value` each frame.
2. Add it to `sketches/index.js` — the array order is the book's order.
3. `node check.mjs` → `ok`.

## Run locally

```sh
python3 -m http.server 4173
```

Open http://localhost:4173.

## Deploy

GitHub Pages → Settings → Pages → Deploy from a branch → `main`, `/ (root)`.
Every push to `main` is live a minute later.
