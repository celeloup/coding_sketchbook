// Run: node check.mjs — validates every sketch before you push.
import assert from 'node:assert/strict';
import sketches from './sketches/index.js';
import { controlType, indexFromHash } from './book.js';

const slugs = new Set();
for (const s of sketches) {
  const name = s.meta?.slug ?? '(sketch without meta.slug)';
  assert.match(s.meta?.slug ?? '', /^[a-z0-9-]+$/, `${name}: meta.slug must be lowercase-with-dashes`);
  assert.ok(s.meta.title, `${name}: meta.title missing`);
  assert.match(s.meta.date ?? '', /^\d{4}-\d{2}-\d{2}$/, `${name}: meta.date must be YYYY-MM-DD`);
  assert.equal(typeof s.notes, 'string', `${name}: notes must be a string`);
  assert.equal(typeof s.params, 'object', `${name}: params must be an object`);
  assert.equal(typeof s.sketch, 'function', `${name}: sketch must be a function`);
  for (const [k, d] of Object.entries(s.params))
    assert.ok(['range', 'color', 'checkbox', 'button'].includes(controlType(d)),
      `${name}: params.${k} — give it min/max, a boolean value, or type 'color' / 'button'`);
  assert.ok(!slugs.has(s.meta.slug), `${name}: duplicate slug`);
  slugs.add(s.meta.slug);
}

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

console.log(`ok — ${sketches.length} sketch(es)`);
