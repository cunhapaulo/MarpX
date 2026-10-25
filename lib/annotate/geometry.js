/* Marp Notes - geometry (pure, no DOM)
 *
 * Points are [x, y, pressure] arrays in slide coordinates (viewBox units).
 * Strokes are { id, tool: 'pen'|'highlighter', color, size, points }.
 */
(function (root) {
  'use strict';

  const PEN_THINNING = 0.6;   // how much pressure changes pen width
  const STREAMLINE = 0.5;     // input smoothing (0 = raw, 1 = frozen)
  const CAP_STEPS = 8;        // segments per half circle (caps, joins)
  const MIN_GAP = 0.5;        // drop input points closer than this

  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const lerp = (a, b, t) => a + (b - a) * t;
  const round = (v, d) => {
    const f = 10 ** d;
    return Math.round(v * f) / f;
  };

  // ── Smoothing ──────────────────────────────────────────────────

  /** Exponential smoothing of raw input; keeps the first and last raw point. */
  function smoothPoints(raw, streamline = STREAMLINE) {
    if (!raw.length) return [];
    const t = 1 - streamline;
    const out = [raw[0].slice(0, 3)];
    for (let i = 1; i < raw.length; i++) {
      const prev = out[out.length - 1];
      const p = raw[i];
      if (dist(prev, p) < MIN_GAP) continue;
      out.push([lerp(prev[0], p[0], t), lerp(prev[1], p[1], t), lerp(prev[2], p[2], t)]);
    }
    const last = raw[raw.length - 1].slice(0, 3);
    const tail = out[out.length - 1];
    if (out.length > 1 && dist(tail, last) < MIN_GAP) out[out.length - 1] = last;
    else if (dist(tail, last) > 0) out.push(last);
    return out;
  }

  // ── Width ──────────────────────────────────────────────────────

  function penRadius(size, p) {
    return Math.max(0.25, size * (0.5 - PEN_THINNING * (0.5 - p)));
  }

  /** Half the ink width of a stroke at pressure p. */
  function strokeRadius(stroke, p) {
    return stroke.tool === 'pen' ? penRadius(stroke.size, p) : stroke.size / 2;
  }

  // Strokes are immutable, so derived values can be cached per stroke object.
  const radiusCache = new WeakMap();
  const bboxCache = new WeakMap();

  function maxStrokeRadius(stroke) {
    if (stroke.tool !== 'pen') return stroke.size / 2;
    let r = radiusCache.get(stroke);
    if (r === undefined) {
      let p = 0;
      for (const pt of stroke.points) if (pt[2] > p) p = pt[2];
      r = penRadius(stroke.size, p);
      radiusCache.set(stroke, r);
    }
    return r;
  }

  // ── Outline (perfect-freehand style) ───────────────────────────

  function arc(out, c, r, from, sweep) {
    for (let k = 1; k <= CAP_STEPS; k++) {
      const a = from + (sweep * k) / CAP_STEPS;
      out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]);
    }
  }

  function unit(a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    return [dx / len, dy / len];
  }

  /**
   * Filled outline polygon around a centerline with pressure-dependent width
   * and round caps / joins. Returns [[x, y], ...].
   */
  function strokeOutline(points, size) {
    const pts = [];
    for (const p of points) {
      if (!pts.length || dist(pts[pts.length - 1], p) > 1e-6) pts.push(p);
    }
    if (!pts.length) return [];
    const r = pts.map(p => penRadius(size, p[2] == null ? 0.5 : p[2]));

    if (pts.length === 1) {
      const out = [[pts[0][0] + r[0], pts[0][1]]];
      arc(out, pts[0], r[0], 0, Math.PI);
      arc(out, pts[0], r[0], Math.PI, Math.PI);
      out.pop();
      return out;
    }

    const left = [], right = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const dIn = i > 0 ? unit(pts[i - 1], p) : null;
      const dOut = i < n - 1 ? unit(p, pts[i + 1]) : null;
      if (dIn && dOut && dIn[0] * dOut[0] + dIn[1] * dOut[1] < 0) {
        // Sharp turn: round join on both sides (inner one folds inside the ink).
        const a1 = Math.atan2(dIn[0], -dIn[1]);   // angle of normal (-dy, dx)
        let a2 = Math.atan2(dOut[0], -dOut[1]);
        let sweep = a2 - a1;
        while (sweep > Math.PI) sweep -= 2 * Math.PI;
        while (sweep < -Math.PI) sweep += 2 * Math.PI;
        const l = [[p[0] + Math.cos(a1) * r[i], p[1] + Math.sin(a1) * r[i]]];
        const rr = [[p[0] - Math.cos(a1) * r[i], p[1] - Math.sin(a1) * r[i]]];
        arc(l, p, r[i], a1, sweep);
        arc(rr, p, r[i], a1 + Math.PI, sweep);
        left.push(...l);
        right.push(...rr);
        continue;
      }
      const d = dIn && dOut ? unit([0, 0], [dIn[0] + dOut[0], dIn[1] + dOut[1]]) : (dIn || dOut);
      const nx = -d[1] * r[i], ny = d[0] * r[i];
      left.push([p[0] + nx, p[1] + ny]);
      right.push([p[0] - nx, p[1] - ny]);
    }

    const out = left.slice();
    // End cap: from the left side around the tip to the right side.
    const dEnd = unit(pts[n - 2], pts[n - 1]);
    arc(out, pts[n - 1], r[n - 1], Math.atan2(dEnd[0], -dEnd[1]), -Math.PI);
    out.pop();
    for (let i = right.length - 1; i >= 0; i--) out.push(right[i]);
    // Start cap: from the right side around the back to the left side.
    const dStart = unit(pts[0], pts[1]);
    arc(out, pts[0], r[0], Math.atan2(dStart[0], -dStart[1]) + Math.PI, -Math.PI);
    out.pop();
    return out;
  }

  // ── SVG path strings ───────────────────────────────────────────

  const fmt = v => String(round(v, 2));

  /** Closed path through midpoints with quadratic curves (smooth outline). */
  function outlinePath(poly) {
    const n = poly.length;
    if (n < 3) return '';
    const mid = i => {
      const a = poly[i % n], b = poly[(i + 1) % n];
      return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    };
    const m0 = mid(0);
    let d = `M${fmt(m0[0])} ${fmt(m0[1])}`;
    for (let i = 1; i <= n; i++) {
      const p = poly[i % n], m = mid(i);
      d += ` Q${fmt(p[0])} ${fmt(p[1])} ${fmt(m[0])} ${fmt(m[1])}`;
    }
    return d + ' Z';
  }

  /** Open smooth path along the centerline (for stroked rendering). */
  function centerlinePath(points) {
    if (!points.length) return '';
    const p0 = points[0];
    let d = `M${fmt(p0[0])} ${fmt(p0[1])}`;
    if (points.length === 1) return d + ' l0.01 0';
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i], q = points[i + 1];
      d += ` Q${fmt(p[0])} ${fmt(p[1])} ${fmt((p[0] + q[0]) / 2)} ${fmt((p[1] + q[1]) / 2)}`;
    }
    const last = points[points.length - 1];
    return d + ` L${fmt(last[0])} ${fmt(last[1])}`;
  }

  // ── Bounding boxes ─────────────────────────────────────────────

  function pointsBBox(points, pad = 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p[0] < minX) minX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] > maxY) maxY = p[1];
    }
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  function strokeBBox(stroke) {
    let box = bboxCache.get(stroke);
    if (!box) {
      box = Object.freeze(pointsBBox(stroke.points, maxStrokeRadius(stroke)));
      bboxCache.set(stroke, box);
    }
    return box;
  }

  function unionBBox(boxes) {
    if (!boxes.length) return null;
    return boxes.reduce((a, b) => ({
      minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY),
      maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY),
    }));
  }

  const boxesOverlap = (a, b) =>
    a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;

  // ── Distances / hit tests ──────────────────────────────────────

  function distPointSegment(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  function segmentsIntersect(a, b, c, d) {
    const d1 = cross(c, d, a), d2 = cross(c, d, b);
    const d3 = cross(a, b, c), d4 = cross(a, b, d);
    return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
           ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
  }

  function distSegments(a, b, c, d) {
    if (segmentsIntersect(a, b, c, d)) return 0;
    return Math.min(
      distPointSegment(a, c, d), distPointSegment(b, c, d),
      distPointSegment(c, a, b), distPointSegment(d, a, b),
    );
  }

  /** Does an eraser of `radius` moving from a to b touch the stroke's ink? */
  function strokeHitsSegment(stroke, a, b, radius) {
    const pts = stroke.points;
    if (!pts.length) return false;
    const eb = pointsBBox([a, b], radius);
    if (!boxesOverlap(eb, strokeBBox(stroke))) return false;
    if (pts.length === 1) {
      return distPointSegment(pts[0], a, b) <= radius + strokeRadius(stroke, pts[0][2]);
    }
    for (let i = 1; i < pts.length; i++) {
      const r = Math.max(strokeRadius(stroke, pts[i - 1][2]), strokeRadius(stroke, pts[i][2]));
      if (distSegments(pts[i - 1], pts[i], a, b) <= radius + r) return true;
    }
    return false;
  }

  /** Insert interpolated points so that consecutive points are <= step apart. */
  function resample(points, step) {
    if (points.length < 2) return points.map(p => p.slice());
    const out = [points[0].slice()];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const n = Math.max(1, Math.ceil(dist(a, b) / step - 1e-9));
      for (let k = 1; k <= n; k++) {
        const t = k / n;
        out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]);
      }
    }
    return out;
  }

  /**
   * Partial erase. Returns null if the eraser (radius, moving a→b) removes no
   * ink; otherwise the remaining pieces as point arrays ([] when nothing is
   * left). The stroke is sampled densely to find the cut, but each piece keeps
   * only the original points plus its two cut ends.
   */
  function splitByEraser(stroke, a, b, radius) {
    if (!strokeHitsSegment(stroke, a, b, radius)) return null;
    const step = Math.max(0.5, Math.min(radius, maxStrokeRadius(stroke)) / 2);
    const src = stroke.points;
    const pieces = [];
    let run = null, removed = false;

    const flush = () => {
      if (run && run.length >= 2) {
        const keep = run.filter((s, i) => s.orig || i === 0 || i === run.length - 1);
        pieces.push(keep.map(s => s.p));
      }
      run = null;
    };
    const visit = (p, orig) => {
      if (distPointSegment(p, a, b) <= radius + strokeRadius(stroke, p[2])) {
        removed = true;
        flush();
      } else {
        (run = run || []).push({ p, orig });
      }
    };

    visit(src[0].slice(), true);
    for (let i = 1; i < src.length; i++) {
      const p = src[i - 1], q = src[i];
      const n = Math.max(1, Math.ceil(dist(p, q) / step - 1e-9));
      for (let k = 1; k < n; k++) {
        const t = k / n;
        visit([lerp(p[0], q[0], t), lerp(p[1], q[1], t), lerp(p[2], q[2], t)], false);
      }
      visit(q.slice(), true);
    }
    flush();
    return removed ? pieces : null;
  }

  // ── Selection ──────────────────────────────────────────────────

  function pointInPolygon(p, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) &&
          p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) {
        inside = !inside;
      }
    }
    return inside;
  }

  function rectPolygon(a, b) {
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
    const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  }

  /** Ids of strokes with at least `threshold` of their points inside poly. */
  function strokesInPolygon(strokes, poly, threshold = 0.75) {
    if (poly.length < 3) return [];
    const box = pointsBBox(poly);
    const ids = [];
    for (const s of strokes) {
      if (!s.points.length || !boxesOverlap(box, pointsBBox(s.points))) continue;
      let inside = 0;
      for (const p of s.points) if (pointInPolygon(p, poly)) inside++;
      if (inside / s.points.length >= threshold) ids.push(s.id);
    }
    return ids;
  }

  function pathLength(points) {
    let len = 0;
    for (let i = 1; i < points.length; i++) len += dist(points[i - 1], points[i]);
    return len;
  }

  /** A drag that travels much farther than its chord is a lasso, not a rectangle. */
  function isLasso(path) {
    if (path.length < 3) return false;
    const len = pathLength(path);
    return len > 40 && len > 1.8 * dist(path[0], path[path.length - 1]);
  }

  function translatePoints(points, dx, dy) {
    return points.map(p => [p[0] + dx, p[1] + dy, p[2]]);
  }

  /**
   * Laser trail: the newest part of [[x, y], ...] (oldest first) no longer
   * than maxLen, as [x, y, p] with p rising from 0 at the tail to 1 at the
   * head, so strokeOutline draws it tapered.
   */
  function laserTrail(points, maxLen) {
    const out = [];
    let len = 0;
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      if (out.length) {
        const step = dist(out[out.length - 1], p);
        if (len + step > maxLen) {
          const t = (maxLen - len) / step; // cut the last segment at exactly maxLen
          const q = out[out.length - 1];
          if (t > 0) out.push([lerp(q[0], p[0], t), lerp(q[1], p[1], t), 0]);
          len = maxLen;
          break;
        }
        len += step;
      }
      out.push([p[0], p[1], 0]);
    }
    out.reverse();
    // pressure by distance from the tail
    let acc = 0;
    for (let i = 0; i < out.length; i++) {
      if (i) acc += dist(out[i - 1], out[i]);
      out[i][2] = len ? acc / len : 1;
    }
    return out;
  }

  const api = {
    PEN_THINNING, STREAMLINE,
    dist, round, smoothPoints,
    strokeRadius, maxStrokeRadius, strokeOutline,
    outlinePath, centerlinePath,
    pointsBBox, strokeBBox, unionBBox, boxesOverlap,
    distPointSegment, distSegments, strokeHitsSegment,
    resample, splitByEraser,
    pointInPolygon, rectPolygon, strokesInPolygon, pathLength, isLasso,
    translatePoints, laserTrail,
  };

  (root.MarpNotes = root.MarpNotes || {}).geometry = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
