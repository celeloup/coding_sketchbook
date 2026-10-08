# Coding Sketchbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static GitHub Pages site that presents p5.js sketches as spreads of a sketchbook: notes and controls on the left page, the live sketch on the right.

**Architecture:** No build. `index.html` loads p5 (cdnjs), Google Fonts, `style.css` and the ES module `book.js`. `book.js` reads an ordered list of sketch modules from `sketches/index.js`, routes on the URL hash, renders one spread at a time, builds controls from each sketch's `params`, runs exactly one p5 instance, and animates between spreads (3D page turn on desktop, slide on mobile). `check.mjs` is the only automated test.

**Tech Stack:** HTML, CSS, vanilla ES modules, p5.js 1.11.1 (instance mode), Node ≥ 22 for `check.mjs` (verified on v25.2.1, which imports ESM `.js` files without a `package.json`).

**Spec:** `docs/superpowers/specs/2026-10-08-sketchbook-design.md`

## Global Constraints

- No build step, no npm, no `package.json`, no CI workflow.
- p5: `https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.1/p5.min.js` (verified 200).
- Fonts: Instrument Serif (titles), Newsreader (body) from Google Fonts.
- Colours: desk `#2b2622`, paper `#f4ecdc`, frame `#efe4cf`, ink `#3a2e25`, muted `#8a6f58`, accent `#b5523b`, rule `#cdb89c`.
- No ribbon bookmark. Sketch on the **right** page, notes on the **left**.
- Breakpoint: `max-width: 799px` = mobile, in CSS and JS.
- Only one p5 instance alive at any time.
- No code, textures or fonts copied from MengTo/sketchbook (unlicensed).
- **Commits:** never commit without Celia's explicit approval. Each task ends by showing the diff + proposed message and waiting. One commit per task, no fixups. Messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Mashing →/← (or swiping) during a page turn → ends on the last requested spread, never two sketches running at once. (Task 3, Step 5)
2. Arrow keys while a slider has focus → move the slider, don't turn the page. (Task 3, Step 5)
3. A sketch that throws in `setup`/`draw` → a short message on its page; the book still navigates. (Task 2, Step 6)
4. Resizing the window or rotating a phone → canvas matches its frame, nothing overflows. (Task 2, Step 6; Task 4, Step 4)
5. A hand-edited or stale link (`#/nope`, `#flow-field`, empty hash) → the cover, no error. (Task 2, Step 1 in `check.mjs`)

## File map

| File | Responsibility | Task |
|---|---|---|
| `.gitignore`, `.nojekyll` | repo hygiene, serve files untouched | 1 |
| `sketches/flow-field.js` | example sketch / template | 1 |
| `sketches/index.js` | ordered list of sketches | 1 |
| `check.mjs` | validates sketch modules + pure helpers | 1, 2 |
| `index.html` | page shell + cover template | 2 |
| `style.css` | all styling | 2, 3, 4 |
| `book.js` | routing, rendering, controls, lifecycle, transitions | 2, 3, 4 |
| `README.md` | how to add a sketch, run, deploy | 5 |

---

### Task 1: Repo, sketch format, check script, example sketch

**Files:**
- Create: `.gitignore`, `.nojekyll`, `check.mjs`, `sketches/index.js`, `sketches/flow-field.js`

**Interfaces:**
- Produces: sketch module shape — `export const meta = { slug, title, date }` (slug `/^[a-z0-9-]+$/`, date `YYYY-MM-DD`), `export const notes` (HTML string), `export const params` (object of param defs), `export function sketch(p, params)`. The sketch **never calls `createCanvas`** — `book.js` creates the canvas at the frame's size before calling the sketch's `setup`. `sketches/index.js` default-exports an array of these modules.

- [ ] **Step 1: Init repo**

```bash
cd /Users/celialeloup/Documents/perso/coding_sketchbook
git init -b main
touch .nojekyll
printf '.superpowers/\n.DS_Store\n' > .gitignore
```

- [ ] **Step 2: Write the failing check**

`check.mjs`:

```js
// Run: node check.mjs — validates every sketch before you push.
import assert from 'node:assert/strict';
import sketches from './sketches/index.js';

const slugs = new Set();
for (const s of sketches) {
  const name = s.meta?.slug ?? '(sketch without meta.slug)';
  assert.match(s.meta?.slug ?? '', /^[a-z0-9-]+$/, `${name}: meta.slug must be lowercase-with-dashes`);
  assert.ok(s.meta.title, `${name}: meta.title missing`);
  assert.match(s.meta.date ?? '', /^\d{4}-\d{2}-\d{2}$/, `${name}: meta.date must be YYYY-MM-DD`);
  assert.equal(typeof s.notes, 'string', `${name}: notes must be a string`);
  assert.equal(typeof s.params, 'object', `${name}: params must be an object`);
  assert.equal(typeof s.sketch, 'function', `${name}: sketch must be a function`);
  assert.ok(!slugs.has(s.meta.slug), `${name}: duplicate slug`);
  slugs.add(s.meta.slug);
}

console.log(`ok — ${sketches.length} sketch(es)`);
```

- [ ] **Step 3: Run it, expect failure**

Run: `node check.mjs`
Expected: `ERR_MODULE_NOT_FOUND` for `sketches/index.js`.

- [ ] **Step 4: Write the example sketch and the list**

`sketches/flow-field.js`:

```js
export const meta = { slug: 'flow-field', title: 'Flow field', date: '2026-10-08' };

export const notes = `
  <p>A few hundred particles drift across a field of Perlin noise. Each one reads the
  noise under it, turns it into an angle and takes a small step. With trails on, the
  field slowly draws itself.</p>
  <h3>How it's made</h3>
  <p>One <code>noise(x * scale, y * scale)</code> call per particle per frame. A smaller
  scale gives long lazy curves; a bigger one turns the field into turbulence.</p>
  <h3>Where it came from</h3>
  <p>Wind maps — the ones where a whole country turns into moving hair.</p>`;

export const params = {
  count:  { label: 'particles', min: 10, max: 1000, step: 10, value: 300 },
  scale:  { label: 'noise scale', min: 0.001, max: 0.03, step: 0.001, value: 0.006 },
  ink:    { type: 'color', value: '#3a2e25' },
  trails: { value: true },
  reset:  { type: 'button', label: 'redraw' },
};

export function sketch(p, params) {
  let pts = [];
  const spot = () => p.createVector(p.random(p.width), p.random(p.height));
  const redraw = () => { pts = []; p.background(239, 228, 207); };

  params.reset.onClick = redraw;
  p.setup = redraw;
  p.windowResized = redraw;

  p.draw = () => {
    const n = params.count.value;
    while (pts.length < n) pts.push(spot());
    pts.length = n;

    p.background(239, 228, 207, params.trails.value ? 6 : 255);
    const ink = p.color(params.ink.value);
    ink.setAlpha(params.trails.value ? 50 : 200);
    p.stroke(ink);

    const s = params.scale.value;
    for (const v of pts) {
      const a = p.noise(v.x * s, v.y * s) * p.TWO_PI * 2;
      const x = v.x, y = v.y;
      v.x += Math.cos(a);
      v.y += Math.sin(a);
      p.line(x, y, v.x, v.y);
      if (v.x < 0 || v.x > p.width || v.y < 0 || v.y > p.height) v.set(spot());
    }
  };
}
```

`sketches/index.js`:

```js
// Order here = order of the book.
import * as flowField from './flow-field.js';

export default [flowField];
```

- [ ] **Step 5: Run it, expect pass**

Run: `node check.mjs`
Expected: `ok — 1 sketch(es)`

- [ ] **Step 6: Prove the check catches a bad sketch**

Temporarily change `date: '2026-10-08'` to `date: 'Oct 8'` in `flow-field.js`, run `node check.mjs`, expect `AssertionError … flow-field: meta.date must be YYYY-MM-DD`, then revert and re-run → `ok`.

- [ ] **Step 7: Propose commit — wait for Celia's approval**

Show `git status` + `git diff --cached` after staging, and this message:

```
Add sketch format, example sketch and check script

Also adds the design spec and implementation plan.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

Files: `.gitignore .nojekyll check.mjs sketches/ docs/`. Commit only after "yes".

---

### Task 2: Static book — routing, spreads, controls, sketch lifecycle

**Files:**
- Create: `index.html`, `style.css`, `book.js`
- Modify: `check.mjs` (add helper asserts)

**Interfaces:**
- Consumes: sketch modules from Task 1.
- Produces (in `book.js`):
  - `export const controlType(def) → 'range' | 'color' | 'checkbox' | 'button' | null`
  - `export const indexFromHash(hash, list) → number` (`-1` = cover)
  - internal, used by Tasks 3–4: `fresh(i) → params copy`, `leftPage(i, params) → Element`, `rightPage(i) → Element` (`.frame` for a sketch, `.contents` nav for the cover), `start(i, frame, params) → p5 | null`, `show(i)`, `land(i, right, params)`, `go(i)`, `step(d)`, `hashFor(i)`, `h(tag, props, ...kids)`, module vars `$book $left $right $prev $next`, `cur = { i, p5 }`.
  - DOM: `.book[data-cover]` set while the cover is shown (used by Task 4 CSS).

- [ ] **Step 1: Add failing helper asserts to `check.mjs`**

Add after the existing imports:

```js
import { controlType, indexFromHash } from './book.js';
```

Inside the `for` loop, after the `sketch` assert:

```js
  for (const [k, d] of Object.entries(s.params))
    assert.ok(['range', 'color', 'checkbox', 'button'].includes(controlType(d)),
      `${name}: params.${k} — give it min/max, a boolean value, or type 'color' / 'button'`);
```

Before the final `console.log`:

```js
// Control types
assert.equal(controlType({ min: 0, max: 1, value: 0 }), 'range');
assert.equal(controlType({ value: true }), 'checkbox');
assert.equal(controlType({ type: 'color', value: '#000000' }), 'color');
assert.equal(controlType({ type: 'button' }), 'button');
assert.equal(controlType({ value: 3 }), null);

// Routing: anything that isn't exactly #/<known-slug> is the cover
const first = sketches[0].meta.slug;
assert.equal(indexFromHash('', sketches), -1);
assert.equal(indexFromHash('#/', sketches), -1);
assert.equal(indexFromHash('#/nope', sketches), -1);
assert.equal(indexFromHash(`#/${first}/`, sketches), -1);
assert.equal(indexFromHash(`#/${first}`, sketches), 0);
assert.equal(indexFromHash(`#${first}`, sketches), 0);
```

- [ ] **Step 2: Run it, expect failure**

Run: `node check.mjs`
Expected: `ERR_MODULE_NOT_FOUND` for `book.js`.

- [ ] **Step 3: Write `book.js`**

```js
import sketches from './sketches/index.js';

// Pure helpers — also imported by check.mjs, so no DOM at module level.

export const controlType = d =>
  d.type ?? ('min' in d && 'max' in d ? 'range' : typeof d.value === 'boolean' ? 'checkbox' : null);

export const indexFromHash = (hash, list) =>
  list.findIndex(s => s.meta.slug === hash.replace(/^#\/?/, ''));

const hashFor = i => (i < 0 ? '#/' : `#/${sketches[i].meta.slug}`);
const num = i => String(i + 1).padStart(2, '0');
const fmtDate = iso =>
  new Date(`${iso}T00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// Each visit starts from the declared defaults.
const fresh = i =>
  i < 0 ? {} : Object.fromEntries(Object.entries(sketches[i].params).map(([k, d]) => [k, { ...d }]));

const h = (tag, props = {}, ...kids) => {
  const el = Object.assign(document.createElement(tag), props);
  el.append(...kids);
  return el;
};

let $book, $left, $right, $prev, $next;
let cur = { i: null, p5: null };

// Pages

function controls(params) {
  return Object.entries(params).map(([key, d]) => {
    const type = controlType(d), label = d.label ?? key;
    if (type === 'button') return h('button', { type: 'button', onclick: () => d.onClick?.() }, label);

    const input = h('input', { type });
    const out = h('output');
    if (type === 'range') Object.assign(input, { min: d.min, max: d.max, step: d.step ?? 'any', value: d.value });
    if (type === 'color') input.value = d.value;
    if (type === 'checkbox') input.checked = d.value;
    out.value = type === 'range' ? d.value : '';
    input.oninput = () => {
      d.value = type === 'checkbox' ? input.checked : type === 'range' ? +input.value : input.value;
      if (type === 'range') out.value = d.value;
    };
    return h('label', { className: `ctl ${type}` }, h('span', {}, label), input, out);
  });
}

function leftPage(i, params) {
  if (i < 0) return document.getElementById('cover').content.firstElementChild.cloneNode(true);
  const s = sketches[i];
  return h('div', { className: 'spread-notes' },
    h('p', { className: 'meta' }, `No. ${num(i)} · ${fmtDate(s.meta.date)}`),
    h('h2', {}, s.meta.title),
    h('div', { className: 'controls' }, ...controls(params)),
    h('div', { className: 'notes', innerHTML: s.notes }));
}

function rightPage(i) {
  if (i >= 0) return h('div', { className: 'frame' });
  return h('nav', { className: 'contents' },
    h('h2', {}, 'Contents'),
    h('ol', {}, ...sketches.map((s, j) => h('li', {},
      h('a', { href: hashFor(j) },
        h('span', { className: 'n' }, num(j)),
        h('span', {}, s.meta.title),
        h('span', { className: 'dots' }),
        h('span', { className: 'd' }, fmtDate(s.meta.date)))))));
}

// Sketch lifecycle

function start(i, frame, params) {
  const broke = (p, e) => {
    console.error(`[sketchbook] ${sketches[i].meta.slug}:`, e);
    p?.noLoop();
    frame.replaceChildren(h('p', { className: 'broke' }, 'This sketch broke. See the console for details.'));
  };
  try {
    return new p5(p => {
      sketches[i].sketch(p, params);
      const guard = f => (...args) => { try { f.apply(p, args); } catch (e) { broke(p, e); } };
      const { setup, draw, windowResized } = p;
      // The book owns the canvas size; sketches only read p.width / p.height.
      p.setup = guard(() => { p.createCanvas(frame.clientWidth, frame.clientHeight); setup?.call(p); });
      if (draw) p.draw = guard(draw);
      p.windowResized = guard(() => { p.resizeCanvas(frame.clientWidth, frame.clientHeight); windowResized?.call(p); });
    }, frame);
  } catch (e) {
    broke(null, e);
    return null;
  }
}

// Navigation

function show(i) {
  cur.p5?.remove();
  const params = fresh(i), left = leftPage(i, params), right = rightPage(i);
  $left.replaceChildren(left);
  $right.replaceChildren(right);
  land(i, right, params);
}

function land(i, right, params) {
  $book.toggleAttribute('data-cover', i < 0);
  cur = { i, p5: i < 0 ? null : start(i, right, params) };
  $prev.hidden = i < 0;
  $next.hidden = i >= sketches.length - 1;
  document.title = i < 0 ? 'Coding Sketchbook' : `${sketches[i].meta.title} · Coding Sketchbook`;
}

function go(i) {
  if (i !== cur.i) show(i);
}

// The hash is the source of truth, so repeated presses stack up correctly.
const step = d => {
  const i = indexFromHash(location.hash, sketches) + d;
  if (i >= -1 && i < sketches.length) location.hash = hashFor(i);
};

function boot() {
  [$book, $left, $right, $prev, $next] =
    ['.book', '.page.left', '.page.right', '.nav.prev', '.nav.next'].map(q => document.querySelector(q));
  $prev.onclick = () => step(-1);
  $next.onclick = () => step(1);
  addEventListener('keydown', e => {
    if (e.target.closest?.('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  addEventListener('hashchange', () => go(indexFromHash(location.hash, sketches)));
  go(indexFromHash(location.hash, sketches));
}

if (typeof document !== 'undefined') boot();
```

- [ ] **Step 4: Run the check, expect pass**

Run: `node check.mjs`
Expected: `ok — 1 sketch(es)`

- [ ] **Step 5: Write `index.html` and `style.css`**

`index.html`:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Coding Sketchbook</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&display=swap">
  <link rel="stylesheet" href="style.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.1/p5.min.js" defer></script>
  <script type="module" src="book.js"></script>
</head>
<body>
  <main class="desk">
    <a class="to-contents" href="#/">Contents</a>
    <button class="nav prev" type="button" aria-label="Previous page">‹</button>
    <div class="book">
      <section class="page left"></section>
      <section class="page right"></section>
    </div>
    <button class="nav next" type="button" aria-label="Next page">›</button>
  </main>

  <!-- The cover's left page. Edit freely. -->
  <template id="cover">
    <div class="cover">
      <h1>Coding Sketchbook</h1>
      <p class="intro">Small experiments in p5.js, by Celia.</p>
      <svg class="flourish" viewBox="0 0 200 40" aria-hidden="true">
        <path d="M5 22 C35 2 60 40 100 20 S165 2 195 22" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
      </svg>
    </div>
  </template>
</body>
</html>
```

(The deferred classic script and the module script run in document order, so the `p5` global exists before `book.js` runs.)

`style.css`:

```css
:root {
  --desk: #2b2622;
  --paper: #f4ecdc;
  --frame: #efe4cf;
  --ink: #3a2e25;
  --muted: #8a6f58;
  --accent: #b5523b;
  --rule: #cdb89c;
  --spine: rgba(80, 50, 20, .35);
  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .25 0 0 0 0 .15 0 0 0 .12 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

* { box-sizing: border-box; }
html, body { margin: 0; min-height: 100%; }
body {
  background: radial-gradient(ellipse at 50% 40%, #3a332d, var(--desk) 70%) fixed;
  color: var(--ink);
  font: 17px/1.55 Newsreader, Georgia, serif;
}

/* Desk */
.desk { min-height: 100vh; display: grid; place-items: center; padding: 3rem 4rem; position: relative; }
.to-contents { position: absolute; top: 1rem; left: 1.25rem; color: #d8cbb6; font-style: italic; text-decoration: none; }
.to-contents:hover { color: #fff; }
.nav {
  position: absolute; top: 50%; translate: 0 -50%;
  background: none; border: 0; padding: .5rem; cursor: pointer;
  color: #d8cbb6; font: 2.75rem/1 'Instrument Serif', serif;
}
.nav:hover { color: #fff; }
.nav.prev { left: .75rem; }
.nav.next { right: .75rem; }

/* Book */
.book {
  position: relative;
  display: grid; grid-template-columns: 1fr 1fr;
  width: min(1200px, 100%, calc((100vh - 6rem) * 2 / 1.35));
  aspect-ratio: 2 / 1.35;
  perspective: 2400px;
  border-radius: 3px;
  box-shadow: 0 30px 60px -25px #000, 0 10px 20px -10px rgba(0, 0, 0, .6);
}
.page {
  position: relative; min-width: 0; overflow: hidden;
  padding: clamp(1.25rem, 3.5vw, 2.75rem);
  background: var(--grain), var(--paper);
}
.page.left { overflow-y: auto; border-radius: 3px 0 0 3px; box-shadow: inset -30px 0 30px -30px var(--spine); }
.page.right { display: flex; border-radius: 0 3px 3px 0; box-shadow: inset 30px 0 30px -30px var(--spine); }

/* Type */
h1, h2, h3 { font-family: 'Instrument Serif', serif; font-weight: 400; margin: 0; }
h1 { font-size: clamp(2.5rem, 5vw, 4rem); line-height: 1; }
h2 { font-size: clamp(2rem, 4vw, 3rem); line-height: 1; margin-bottom: 1rem; }
h3 { font-size: 1.4rem; margin: 1.4rem 0 .2rem; }
a { color: var(--accent); }
.meta { font-style: italic; color: var(--muted); font-size: .9rem; margin: 0 0 .4rem; }
.notes p { margin: 0 0 .8rem; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* Cover + contents */
.cover { height: 100%; display: flex; flex-direction: column; justify-content: center; gap: 1rem; text-align: center; }
.cover .intro { font-style: italic; color: var(--muted); margin: 0; }
.flourish { width: 60%; margin: 0 auto; color: var(--accent); }
.contents { width: 100%; }
.contents ol { list-style: none; margin: 0; padding: 0; }
.contents a { display: flex; align-items: baseline; gap: .5rem; padding: .35rem 0; color: var(--ink); text-decoration: none; }
.contents a:hover { color: var(--accent); }
.contents .n { width: 1.6rem; font-style: italic; color: var(--muted); }
.contents .dots { flex: 1; border-bottom: 1px dotted var(--rule); }
.contents .d { font-style: italic; color: var(--muted); font-size: .85rem; }

/* Sketch frame */
.frame { flex: 1; min-width: 0; min-height: 0; position: relative; overflow: hidden; background: var(--frame); box-shadow: inset 0 0 0 1px rgba(58, 46, 37, .15); }
.frame canvas { position: absolute; inset: 0; display: block; touch-action: none; }
.broke { padding: 1rem; font-style: italic; color: var(--accent); }

/* Controls: ink on paper */
.controls { display: grid; gap: .6rem; margin: 1rem 0 1.5rem; }
.ctl { display: grid; grid-template-columns: 7.5rem 1fr 3.5rem; align-items: center; gap: .75rem; font-size: .95rem; }
.ctl.color, .ctl.checkbox { grid-template-columns: 7.5rem auto; justify-content: start; }
.ctl output { text-align: right; font-style: italic; color: var(--muted); }
input[type=range] { appearance: none; width: 100%; height: 1.2rem; margin: 0; background: none; }
input[type=range]::-webkit-slider-runnable-track { height: 1px; background: var(--ink); }
input[type=range]::-moz-range-track { height: 1px; background: var(--ink); }
input[type=range]::-webkit-slider-thumb { appearance: none; width: 13px; height: 13px; margin-top: -6px; border: 0; border-radius: 50%; background: var(--accent); }
input[type=range]::-moz-range-thumb { width: 13px; height: 13px; border: 0; border-radius: 50%; background: var(--accent); }
input[type=color] { width: 2.2rem; height: 1.4rem; padding: 0; border: 1px solid var(--rule); border-radius: 2px; background: none; }
input[type=checkbox] { width: 1rem; height: 1rem; margin: 0; accent-color: var(--accent); }
.controls button {
  justify-self: start; padding: .15rem .9rem; cursor: pointer;
  font: italic 1rem Newsreader, serif; color: var(--accent);
  background: none; border: 1px solid currentColor; border-radius: 999px;
}
.controls button:hover { background: var(--accent); color: var(--paper); }
```

- [ ] **Step 6: Verify in the browser (desktop width)**

Run: `python3 -m http.server 4173` (background), open `http://localhost:4173/`.

Check, and fix anything that fails before moving on:
- Cover: title, intro, flourish on the left; "Contents" list with `01 Flow field ····· 8 October 2026` on the right.
- Click the entry → URL `#/flow-field`, notes + 5 controls on the left, particles drawing on the right.
- Each control works: particles slider changes density, noise scale changes curve size, colour changes ink, trails off → no trails, redraw clears.
- `‹` / `›` and ←/→ keys move between cover and sketch; browser Back works; `#/nope` shows the cover.
- Resize the window → the canvas refits its frame (no overflow, no gap).
- No errors in the console.
- **Broken sketch** (Review Focus 3): create temporary `sketches/broken.js`:
  ```js
  export const meta = { slug: 'broken', title: 'Broken', date: '2026-10-08' };
  export const notes = '<p>Throws on purpose.</p>';
  export const params = {};
  export function sketch(p) { p.draw = () => { throw new Error('boom'); }; }
  ```
  add it to `sketches/index.js`, open `#/broken` → "This sketch broke…" on the right page, error in console, `‹` still works. **Then delete `broken.js` and its line.**
- **Long notes:** temporarily paste 10 paragraphs into `flow-field.js` notes → the left page scrolls, the book doesn't grow. Revert.

Run `node check.mjs` again → `ok — 1 sketch(es)`.

- [ ] **Step 7: Propose commit — wait for Celia's approval**

```
Add the book: routing, spreads, generated controls, sketch lifecycle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

Files: `index.html style.css book.js check.mjs`.

---

### Task 3: Page-turn on desktop

**Files:**
- Modify: `book.js` (replace `go`, add `flip`), `style.css` (append leaf rules)

**Interfaces:**
- Consumes: `fresh leftPage rightPage show land h $book $left $right cur` from Task 2.
- Produces: `go(i)` that turns the page; `flip(i)`; module vars `busy`, `pending`. Task 4 adds one branch to `go`.

- [ ] **Step 1: Replace `go` in `book.js`**

Replace:

```js
function go(i) {
  if (i !== cur.i) show(i);
}
```

with:

```js
let busy = false, pending = null;

function go(i) {
  if (busy) { pending = i; return; }
  if (i === cur.i) return;
  if (cur.i === null || matchMedia('(prefers-reduced-motion: reduce)').matches) return show(i);
  flip(i);
}

// Forward: the right page (current sketch, frozen) turns over; its back is the next notes page.
// Backward: the left page turns; its back is plain paper (a live canvas can't sit on a
// turning leaf), or the contents when going back to the cover.
function flip(i) {
  busy = true;
  const fwd = i > cur.i;
  cur.p5?.noLoop();
  const params = fresh(i), left = leftPage(i, params), right = rightPage(i);
  const front = h('div', { className: `page face front ${fwd ? 'right' : 'left'}` });
  const back = h('div', { className: `page face back ${fwd ? 'left' : 'right'}` });
  const leaf = h('div', { className: `leaf ${fwd ? 'fwd' : 'bwd'}` }, front, back);

  if (fwd) {
    front.append(...$right.childNodes);
    back.append(left);
    $right.replaceChildren(right);
  } else {
    front.append(...$left.childNodes);
    back.append(i < 0 ? right : h('div', { className: 'frame' }));
    $left.replaceChildren(left);
  }

  $book.append(leaf);
  leaf.getBoundingClientRect(); // commit the start pose so the turn animates
  leaf.classList.add('turning');
  leaf.addEventListener('transitionend', function done(e) {
    if (e.target !== leaf) return; // ignore transitions bubbling up from inside the pages
    leaf.removeEventListener('transitionend', done);
    cur.p5?.remove();
    if (fwd) $left.replaceChildren(left); else $right.replaceChildren(right);
    leaf.remove();
    land(i, right, params);
    busy = false;
    if (pending !== null) { const p = pending; pending = null; go(p); }
  });
}
```

- [ ] **Step 2: Append leaf styles to `style.css`**

```css
/* Page turn */
.leaf {
  position: absolute; top: 0; bottom: 0; width: 50%; z-index: 1;
  transform-style: preserve-3d;
  transition: transform .9s cubic-bezier(.45, .05, .25, 1);
}
.leaf.fwd { left: 50%; transform-origin: left center; }
.leaf.bwd { left: 0; transform-origin: right center; }
.leaf.fwd.turning { transform: rotateY(-180deg); }
.leaf.bwd.turning { transform: rotateY(180deg); }
.face { position: absolute; inset: 0; -webkit-backface-visibility: hidden; backface-visibility: hidden; }
.face.back { transform: rotateY(180deg); }
```

- [ ] **Step 3: Run the check**

Run: `node check.mjs` → `ok — 1 sketch(es)`

- [ ] **Step 4: Add a second sketch temporarily so there's something to flip to**

Copy `flow-field.js` to `sketches/flow-field-2.js`, change `slug: 'flow-field-2'`, `title: 'Flow field again'`, add it to `sketches/index.js`. (Removed in Step 6.)

- [ ] **Step 5: Verify in the browser**

- Cover → `›`: the contents page turns over the spine, its back shows "No. 01 · Flow field" notes; when it lands the sketch starts.
- Sketch 1 → `›`: the frozen canvas turns, back shows sketch 2's notes, sketch 2 starts on landing.
- `‹`: the left page turns right, back is plain paper, previous sketch starts on landing.
- Sketch 1 → `‹` to cover: the back of the turning page shows the contents.
- **Review Focus 1:** from the cover press `›` three times quickly → ends on sketch 2; in DevTools console `document.querySelectorAll('canvas').length` → `1`.
- **Review Focus 2:** click the particles slider, press ←/→ → the slider moves, the page doesn't turn.
- With macOS "Reduce motion" on (or DevTools → Rendering → emulate `prefers-reduced-motion`), spreads swap instantly.
- No console errors.

- [ ] **Step 6: Remove the temporary sketch**

Delete `sketches/flow-field-2.js` and its line in `sketches/index.js`. Run `node check.mjs` → `ok — 1 sketch(es)`.

- [ ] **Step 7: Propose commit — wait for Celia's approval**

```
Turn pages with a 3D flip on desktop

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

Files: `book.js style.css`.

---

### Task 4: Mobile layout, slide and swipe

**Files:**
- Modify: `book.js` (`go` branch, `slide`, swipe in `boot`), `style.css` (append media query)

**Interfaces:**
- Consumes: `go show step $book cur` and `.book[data-cover]` from Tasks 2–3.

- [ ] **Step 1: Add the slide to `book.js`**

In `go`, after the reduced-motion line and before `flip(i);`, add:

```js
  if (matchMedia('(max-width: 799px)').matches) return slide(i);
```

After `flip`, add:

```js
function slide(i) {
  const fwd = i > cur.i;
  show(i);
  scrollTo(0, 0);
  $book.animate(
    [{ transform: `translateX(${fwd ? 2 : -2}rem)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 250, easing: 'ease-out' });
}
```

- [ ] **Step 2: Add swipe to `boot`**

Before the `hashchange` listener in `boot`, add:

```js
  // Swipe between spreads, except when the finger starts on the sketch or a control.
  let touch = null;
  $book.addEventListener('touchstart', e => {
    const t = e.touches[0];
    touch = e.target.closest('canvas, input, button') ? null : { x: t.clientX, y: t.clientY };
  }, { passive: true });
  $book.addEventListener('touchend', e => {
    if (!touch) return;
    const t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
    touch = null;
  });
```

- [ ] **Step 3: Append the mobile layout to `style.css`**

```css
/* Phone: one tall sheet, sketch on top */
@media (max-width: 799px) {
  .desk { padding: 3rem 0 4.5rem; place-items: start center; }
  .book { grid-template-columns: 1fr; width: 100%; aspect-ratio: auto; border-radius: 0; box-shadow: none; }
  .page.left, .page.right { border-radius: 0; box-shadow: none; }
  .page.left { overflow: visible; }
  .page.right { order: -1; aspect-ratio: 1; padding: 1rem 1rem 0; }
  .book[data-cover] .page.right { order: 0; aspect-ratio: auto; padding: 1.25rem; }
  .cover { min-height: 50vh; }
  .nav { position: fixed; top: auto; bottom: .75rem; translate: none; }
}
```

- [ ] **Step 4: Verify in the browser at phone width**

Using DevTools device mode (iPhone 14, 390×844) — or Chrome tools `resize_window` to 390×844:

- Cover: title/intro first, contents below; tapping an entry slides to the sketch.
- Sketch spread: square sketch on top, then meta, title, controls, notes; page scrolls vertically.
- Dragging on the canvas doesn't scroll the page.
- Swipe left/right on the notes → next/previous with a slide (DevTools touch emulation). A vertical scroll doesn't trigger it.
- `‹` `›` sit at the bottom corners and work.
- **Review Focus 4:** switch device orientation / drag the viewport from 390 to 1000px wide and back → the canvas refits each time, and the desktop flip works again above 800px.
- No console errors. `node check.mjs` → `ok`.

- [ ] **Step 5: Propose commit — wait for Celia's approval**

```
Add phone layout with slide and swipe navigation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

Files: `book.js style.css`.

---

### Task 5: README and GitHub Pages

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
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
````

- [ ] **Step 2: Propose commit — wait for Celia's approval**

```
Add README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

- [ ] **Step 3: Publish — only with Celia's explicit go-ahead for each action**

Ask Celia: which GitHub account, repo name, and confirm a **public** repo (free Pages needs one). Then, once approved:

```bash
gh repo create <name> --public --source . --push
gh api -X POST repos/<owner>/<name>/pages -f 'source[branch]=main' -f 'source[path]=/'
```

Wait ~1 minute, open `https://<owner>.github.io/<name>/`, and repeat the Task 2 Step 6 smoke checks (cover, open sketch, controls, back button) against the live URL.

---

## Out of scope (from the spec)

Thumbnail grid index, Markdown notes / per-sketch folders, custom per-sketch HTML controls, drag-to-curl physics, magnifier, parallax.
