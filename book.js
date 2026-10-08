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
    if (p) { p.noLoop(); p.windowResized = null; } // log once, not on every resize
    frame.replaceChildren(h('p', { className: 'broke' }, 'This sketch broke. See the console for details.'));
  };
  try {
    return new p5(p => {
      sketches[i].sketch(p, params);
      const guard = f => (...args) => { try { f.apply(p, args); } catch (e) { broke(p, e); } };
      const { setup, draw, windowResized } = p;
      let ready = false; // p5 waits for window load; a resize can arrive before setup
      // The book owns the canvas size; sketches only read p.width / p.height.
      p.setup = guard(() => { p.createCanvas(frame.clientWidth, frame.clientHeight); ready = true; setup?.call(p); });
      if (draw) p.draw = guard(draw);
      p.windowResized = guard(() => {
        if (!ready) return;
        p.resizeCanvas(frame.clientWidth, frame.clientHeight);
        windowResized?.call(p);
      });
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
  $left.scrollTop = 0;
  cur = { i, p5: i < 0 ? null : start(i, right, params) };
  $prev.hidden = i < 0;
  $next.hidden = i >= sketches.length - 1;
  document.title = i < 0 ? 'Coding Sketchbook' : `${sketches[i].meta.title} · Coding Sketchbook`;
}

let busy = false, pending = null;

function go(i) {
  if (busy) { pending = i; return; }
  if (i === cur.i) return;
  if (cur.i === null || matchMedia('(prefers-reduced-motion: reduce)').matches) return show(i);
  if (matchMedia('(max-width: 799px), (max-height: 500px)').matches) return slide(i);
  flip(i);
}

function slide(i) {
  const fwd = i > cur.i;
  show(i);
  scrollTo(0, 0);
  $book.animate(
    [{ transform: `translateX(${fwd ? 2 : -2}rem)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 250, easing: 'ease-out' });
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
  addEventListener('hashchange', () => go(indexFromHash(location.hash, sketches)));
  go(indexFromHash(location.hash, sketches));
}

if (typeof document !== 'undefined') boot();
