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
