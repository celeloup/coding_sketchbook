# Coding Sketchbook — Design

Date: 2026-10-08

## Goal

A small, pretty, lightweight website to share quick p5.js experiments, styled as a
sketchbook. Each double page shows one sketch: notes and controls on the left, the
live sketch on the right. Hosted on GitHub Pages.

Inspired by [MengTo/sketchbook](https://github.com/MengTo/sketchbook). That repo has
no license, so we borrow ideas only — all code, textures and fonts are our own or
openly licensed (Google Fonts).

## Constraints

- No build step, no npm, no CI workflow. GitHub Pages serves `main` as-is.
- Plain HTML/CSS/ES modules. p5.js 1.11 pinned from cdnjs. Fonts from Google Fonts.
- Adding a sketch = one new file + one line in the list.
- Only the visible sketch runs.

## Files

```
index.html               shell: desk, book, "contents" link; loads p5, fonts, book.js
style.css                paper look, spread layout, flip, controls, mobile layout
book.js                  router, spread rendering, flip, controls, sketch lifecycle
sketches/index.js        ordered array of sketch modules = order of the book
sketches/flow-field.js   example sketch (template to copy)
check.mjs                `node check.mjs` validates every sketch module's exports
.nojekyll
.gitignore               includes .superpowers/
README.md                how to add a sketch, run locally, deploy
```

## Sketch module format

One file per sketch, p5 instance mode:

```js
export const meta = { slug: 'flow-field', title: 'Flow field', date: '2026-10-08' };

export const notes = `
  <p>Perlin noise steers a few hundred particles…</p>
  <h3>Where it came from</h3>
  <p>…</p>`;

export const params = {
  count:  { label: 'particles', min: 10, max: 500, step: 1, value: 240 },
  scale:  { label: 'noise scale', min: 0.001, max: 0.05, step: 0.001, value: 0.006 },
  ink:    { type: 'color', value: '#b5523b' },
  trails: { value: true },
  reset:  { type: 'button', label: 'redraw', onClick: null }, // sketch assigns onClick
};

export function sketch(p, params) { /* p.setup, p.draw, … */ }
```

`sketches/index.js`:

```js
import * as flowField from './flow-field.js';
export default [flowField];
```

Numbering ("No. 01") comes from position in this array.

### Params → controls

Type is inferred unless given:

| Declaration | Control |
|---|---|
| has `min`/`max` | `<input type="range">` + value shown in italics |
| `type: 'color'` | `<input type="color">` |
| boolean `value` | `<input type="checkbox">` |
| `type: 'button'` | `<button>` calling `params.x.onClick()` |

`label` defaults to the key. Controls write straight into `params.x.value`; the sketch
reads it each frame (or reacts in `onClick`). No change events, no framework.
Params reset to their declared defaults each time a spread is opened (book.js keeps
a copy of the defaults).

## Routing

- `#/` (or empty) → cover + contents spread.
- `#/<slug>` → that sketch's spread. Unknown slug → cover.
- `hashchange` drives everything, so back/forward and shared links work.
- Navigation: click the turning page edge or on-page arrows, ←/→ keys, swipe on
  touch. A "contents" link on the desk goes to `#/`.

## Spread rendering

- **Left page:** "No. 03 · 8 October 2026", title, controls, then `notes`.
- **Right page:** a framed container; the p5 canvas is sized to fill it.
- **Cover spread:** left = name, one-line intro, small ink flourish; right = contents
  list (number, title, dotted leader, date), each a link to `#/<slug>`.

## Sketch lifecycle

- On landing on a spread: `new p5(p => sketch(p, params), container)`.
- On leaving: `instance.remove()` before the next one starts. One instance at a time.
- On window resize: book.js calls `instance.resizeCanvas(w, h)` to the container size.
  Sketches use `p.width`/`p.height`, never hard-coded sizes.
- A sketch that throws shows a short "this sketch broke" message on its page instead of
  breaking the book (try/catch around construction, `console.error` the cause).

## Flip (desktop ≥ 800px)

- The right page (sketch) turns around the spine with a CSS 3D `rotateY` transition.
- Its back face shows the next spread's left page (title + notes), so the reader sees
  the real next page while it turns.
- The current sketch is paused (`noLoop()`) during the turn; the next sketch starts
  when the page lands (`transitionend`).
- Backwards: mirrored — the left page turns right, its back shows the previous
  spread's right page as plain paper (a live canvas can't be on the back of a leaf).
- `prefers-reduced-motion`: swap instantly, no turn.

## Mobile (< 800px)

- Single tall sheet: sketch on top (square, full width), then title, controls, notes.
- Spread change = short horizontal slide; swipe or arrows to navigate.
- `touch-action: none` on the canvas so dragging in a sketch doesn't scroll the page.

## Visual style (option A, "watercolour sketchbook")

- Desk: dark warm `#2b2622`; book drops a soft shadow.
- Paper `#f4ecdc` with an inline SVG `feTurbulence` grain overlay; spine = soft shaded
  gradient between the pages.
- Ink `#3a2e25`, muted `#8a6f58`, accent terracotta `#b5523b` (slider knob, links,
  hover).
- Type: Instrument Serif (titles), Newsreader (body, italic for meta/values).
- Controls styled as ink on paper: thin rule track, round knob, italic value.
- The sketch sits in a slightly inset frame (`#efe4cf`, hairline border).
- No ribbon bookmark.

## Testing

- `node check.mjs`: imports `sketches/index.js`, asserts every module has `meta`
  (slug, title, date), `notes` string, `params` object, `sketch` function, and that
  slugs are unique. Exits non-zero on failure.
- Manual browser pass: desktop + phone width, flip both ways, keys, swipe, deep link,
  back button, each control type, resize, reduced motion.

## Deploy

GitHub Pages → "Deploy from a branch" → `main` / root. `.nojekyll` so files are served
untouched.

## Out of scope (for now)

- Thumbnail grid index (planned later, option C).
- Markdown notes / per-sketch folders.
- Custom per-sketch HTML controls.
- Drag-to-curl page physics, magnifier, parallax.
