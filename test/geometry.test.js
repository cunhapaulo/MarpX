'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const g = require('../lib/annotate/geometry.js');

const line = (x0, y0, x1, y1, n, p = 0.5) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, p]);
  }
  return pts;
};
const pen = (points, size = 4) => ({ id: 'a', tool: 'pen', color: '#000', size, points });
const hl = (points, size = 20) => ({ id: 'h', tool: 'highlighter', color: '#ff0', size, points });

test('smoothPoints keeps first and last raw point and drops duplicates', () => {
  const raw = [[0, 0, 0.5], [0, 0, 0.5], [10, 0, 0.5], [20, 0, 0.5]];
  const out = g.smoothPoints(raw, 0.5);
  assert.deepEqual(out[0], [0, 0, 0.5]);
  assert.deepEqual(out[out.length - 1], [20, 0, 0.5]);
  for (let i = 1; i < out.length; i++) assert.ok(g.dist(out[i - 1], out[i]) > 0.1);
});

test('smoothPoints pulls a zig-zag towards its average', () => {
  const raw = [[0, 0, 0.5], [10, 10, 0.5], [20, 0, 0.5], [30, 10, 0.5], [40, 0, 0.5]];
  const out = g.smoothPoints(raw, 0.5);
  const inner = out.slice(1, -1);
  assert.ok(inner.every(p => p[1] > 0 && p[1] < 10));
});

test('strokeRadius: pen scales with pressure, constant at 0.5, highlighter flat', () => {
  const s = pen([], 10);
  assert.equal(g.strokeRadius(s, 0.5), 5);
  assert.ok(g.strokeRadius(s, 1) > 5);
  assert.ok(g.strokeRadius(s, 0) < 5);
  assert.ok(g.strokeRadius(s, 0) > 0);
  assert.equal(g.strokeRadius(hl([], 20), 0.1), 10);
});

test('strokeOutline of a single point is a closed circle of radius size/2', () => {
  const poly = g.strokeOutline([[50, 50, 0.5]], 10);
  assert.ok(poly.length >= 8);
  for (const p of poly) assert.ok(Math.abs(g.dist(p, [50, 50]) - 5) < 1e-6);
});

test('strokeOutline of a horizontal line spans length plus round caps', () => {
  const poly = g.strokeOutline(line(0, 0, 100, 0, 10), 10);
  const xs = poly.map(p => p[0]);
  const ys = poly.map(p => p[1]);
  assert.ok(Math.abs(Math.min(...xs) - -5) < 0.01);
  assert.ok(Math.abs(Math.max(...xs) - 105) < 0.01);
  assert.ok(Math.abs(Math.min(...ys) - -5) < 0.01);
  assert.ok(Math.abs(Math.max(...ys) - 5) < 0.01);
});

test('strokeOutline width follows pressure', () => {
  const pts = [[0, 0, 0.1], [50, 0, 0.1], [100, 0, 1], [150, 0, 1]];
  const poly = g.strokeOutline(pts, 10);
  const halfAt = x => Math.max(...poly.filter(p => Math.abs(p[0] - x) < 1e-6).map(p => Math.abs(p[1])));
  assert.ok(halfAt(50) < halfAt(100));
});

test('strokeOutline keeps width through a sharp reversal', () => {
  const pts = [[0, 0, 0.5], [100, 0, 0.5], [0, 1, 0.5]];
  const poly = g.strokeOutline(pts, 10);
  const maxX = Math.max(...poly.map(p => p[0]));
  assert.ok(maxX > 104, `cap at turn should reach x≈105, got ${maxX}`);
});

test('outlinePath and centerlinePath produce closed / open SVG paths', () => {
  const d = g.outlinePath(g.strokeOutline(line(0, 0, 10, 0, 2), 4));
  assert.match(d, /^M[-\d.]+ [-\d.]+ Q/);
  assert.match(d, /Z$/);
  assert.equal(g.outlinePath([]), '');
  assert.match(g.centerlinePath(line(0, 0, 10, 0, 3)), /^M0 0 .*L10 0$/);
  assert.match(g.centerlinePath([[5, 5, 0.5]]), /^M5 5 l/);
});

test('distance helpers', () => {
  assert.equal(g.distPointSegment([5, 5], [0, 0], [10, 0]), 5);
  assert.equal(g.distPointSegment([-3, 4], [0, 0], [10, 0]), 5);
  assert.equal(g.distSegments([0, 0], [10, 10], [0, 10], [10, 0]), 0);
  assert.equal(g.distSegments([0, 0], [10, 0], [0, 3], [10, 3]), 3);
});

test('strokeBBox includes the stroke radius', () => {
  const b = g.strokeBBox(pen(line(10, 20, 30, 20, 2), 4));
  assert.deepEqual(b, { minX: 8, minY: 18, maxX: 32, maxY: 22 });
});

test('strokeHitsSegment: touching the ink counts, near miss does not', () => {
  const s = pen(line(0, 0, 100, 0, 4), 4); // radius 2
  assert.ok(g.strokeHitsSegment(s, [50, 6], [50, 6], 4.5));
  assert.ok(!g.strokeHitsSegment(s, [50, 7], [50, 7], 4.5));
  // fast eraser swipe crossing the stroke between samples
  assert.ok(g.strokeHitsSegment(s, [50, -50], [50, 50], 1));
  // highlighter uses its full width
  assert.ok(g.strokeHitsSegment(hl(line(0, 0, 100, 0, 4), 20), [50, 12], [50, 12], 3));
});

test('resample inserts points so that no gap exceeds the step', () => {
  const out = g.resample([[0, 0, 0], [10, 0, 1]], 2);
  assert.equal(out.length, 6);
  for (let i = 1; i < out.length; i++) assert.ok(g.dist(out[i - 1], out[i]) <= 2 + 1e-9);
  assert.ok(Math.abs(out[3][2] - 0.6) < 1e-9);
});

test('splitByEraser cuts a straight line into two pieces', () => {
  const s = pen([[0, 0, 0.5], [100, 0, 0.5]], 2); // radius 1
  const pieces = g.splitByEraser(s, [50, 0], [50, 0], 10);
  assert.equal(pieces.length, 2);
  const [left, right] = pieces;
  assert.ok(Math.max(...left.map(p => p[0])) <= 39);
  assert.ok(Math.min(...right.map(p => p[0])) >= 61);
  assert.equal(left[0][0], 0);
  assert.equal(right[right.length - 1][0], 100);
});

test('splitByEraser returns null when untouched and [] when fully erased', () => {
  const s = pen(line(0, 0, 100, 0, 10), 2);
  assert.equal(g.splitByEraser(s, [50, 50], [50, 50], 5), null);
  assert.deepEqual(g.splitByEraser(s, [-10, 0], [110, 0], 5), []);
});

test('splitByEraser trims an end without creating extra pieces', () => {
  const s = pen(line(0, 0, 100, 0, 10), 2);
  const pieces = g.splitByEraser(s, [100, 0], [100, 0], 10);
  assert.equal(pieces.length, 1);
  assert.equal(pieces[0][0][0], 0);
});

test('pointInPolygon and strokesInPolygon', () => {
  const sq = g.rectPolygon([0, 0], [100, 100]);
  assert.ok(g.pointInPolygon([50, 50], sq));
  assert.ok(!g.pointInPolygon([150, 50], sq));
  const inside = { ...pen(line(10, 10, 90, 10, 8)), id: 'in' };
  const outside = { ...pen(line(110, 10, 190, 10, 8)), id: 'out' };
  const half = { ...pen(line(50, 50, 150, 50, 10)), id: 'half' };
  const ids = g.strokesInPolygon([inside, outside, half], sq);
  assert.deepEqual(ids, ['in']);
  // lasso: triangle
  const tri = [[0, 0], [100, 0], [50, 100]];
  assert.deepEqual(g.strokesInPolygon([inside, outside], tri), ['in']);
});

test('isLasso distinguishes a diagonal drag from a loop', () => {
  assert.ok(!g.isLasso(line(0, 0, 200, 100, 20)));
  const loop = [];
  for (let i = 0; i <= 30; i++) {
    const a = (i / 30) * Math.PI * 1.9;
    loop.push([100 + 80 * Math.cos(a), 100 + 80 * Math.sin(a)]);
  }
  assert.ok(g.isLasso(loop));
});

test('translatePoints shifts x/y and keeps pressure', () => {
  assert.deepEqual(g.translatePoints([[1, 2, 0.3]], 10, -2), [[11, 0, 0.3]]);
});

test('splitByEraser keeps the original points plus the two cut ends (no dense resampling)', () => {
  const s = pen([[0, 0, 0.5], [50, 0, 0.5], [100, 0, 0.5]], 2);
  const [left, right] = g.splitByEraser(s, [25, 0], [25, 0], 5);
  assert.equal(left.length, 2);
  assert.deepEqual(left[0], [0, 0, 0.5]);
  assert.ok(left[1][0] > 15 && left[1][0] < 20);
  assert.equal(right.length, 3);
  assert.ok(right[0][0] > 30 && right[0][0] < 35);
  assert.deepEqual(right.slice(1), [[50, 0, 0.5], [100, 0, 0.5]]);
});

test('splitByEraser returns null when the bbox/segment test hits but no ink is removed', () => {
  const s = pen([[0, 0, 0], [100, 0, 1]], 10); // thin start, thick end
  assert.ok(g.strokeHitsSegment(s, [0, 6], [0, 6], 1));
  assert.equal(g.splitByEraser(s, [0, 6], [0, 6], 1), null);
});

test('strokeBBox is cached per (immutable) stroke object', () => {
  const s = pen(line(0, 0, 10, 0, 2));
  assert.equal(g.strokeBBox(s), g.strokeBBox(s));
  assert.ok(Object.isFrozen(g.strokeBBox(s)));
});

test('laserTrail keeps only the newest maxLen and tapers from tail to head', () => {
  const pts = [];
  for (let x = 0; x <= 500; x += 10) pts.push([x, 0]);
  const t = g.laserTrail(pts, 100);
  assert.ok(Math.abs(g.pathLength(t) - 100) < 1e-6);
  assert.deepEqual(t[t.length - 1], [500, 0, 1]);
  assert.equal(t[0][2], 0);
  for (let i = 1; i < t.length; i++) assert.ok(t[i][2] >= t[i - 1][2]);
  assert.equal(g.laserTrail([[5, 5]], 100).length, 1);
});
