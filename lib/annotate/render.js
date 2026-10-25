/* Marp Notes - SVG rendering of annotation layers
 *
 * Each slide <svg data-marpit-svg> gets one <g class="ann-layer"> after its
 * foreignObject, so annotations share the slide's viewBox coordinates.
 *   g.ann-layer
 *     rect.ann-hit    transparent input surface (only active in annotate mode)
 *     g.ann-hl        highlighter strokes (below pen)
 *     g.ann-pen       pen strokes
 *     g.ann-ui        selection box, marquee, eraser cursor, laser (never printed)
 */
(function (root) {
  'use strict';

  const NS = root.MarpNotes = root.MarpNotes || {};
  const geometry = NS.geometry;
  const SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    const node = document.createElementNS(SVGNS, tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  /** Slide size from the viewBox (decks may be 16:9 or 4:3). */
  function viewBoxSize(svg) {
    const vb = svg.viewBox && svg.viewBox.baseVal;
    if (vb && vb.width && vb.height) return [vb.width, vb.height];
    const parts = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
    return parts.length === 4 && parts[2] > 0 ? [parts[2], parts[3]] : [1280, 720];
  }

  function createLayer(svg) {
    const [w, h] = viewBoxSize(svg);
    const root = el('g', { class: 'ann-layer' });
    const layer = {
      svg, root, size: [w, h],
      hit: el('rect', { class: 'ann-hit', x: 0, y: 0, width: w, height: h, fill: 'transparent' }, root),
      hl: el('g', { class: 'ann-hl' }, root),
      pen: el('g', { class: 'ann-pen' }, root),
      ui: el('g', { class: 'ann-ui' }, root),
      els: new Map(),       // stroke id -> { stroke, node }
      laser: null,
    };
    svg.appendChild(root);
    return layer;
  }

  // ── Strokes ────────────────────────────────────────────────────

  function paintStroke(node, stroke) {
    node.removeAttribute('transform');
    if (stroke.tool === 'pen') {
      node.setAttribute('class', 'ann-stroke ann-stroke-pen');
      node.setAttribute('d', geometry.outlinePath(geometry.strokeOutline(stroke.points, stroke.size)));
      node.setAttribute('fill', stroke.color);
    } else {
      node.setAttribute('class', 'ann-stroke ann-stroke-hl');
      node.setAttribute('d', geometry.centerlinePath(stroke.points));
      node.setAttribute('fill', 'none');
      node.setAttribute('stroke', stroke.color);
      node.setAttribute('stroke-width', stroke.size);
      node.setAttribute('stroke-linecap', 'round');
      node.setAttribute('stroke-linejoin', 'round');
    }
    node.dataset.id = stroke.id;
  }

  const groupFor = (layer, stroke) => (stroke.tool === 'pen' ? layer.pen : layer.hl);

  /** Make the layer show exactly `strokes`, in order, reusing unchanged nodes. */
  function syncLayer(layer, strokes) {
    const keep = new Set();
    const cursors = new Map([[layer.hl, layer.hl.firstChild], [layer.pen, layer.pen.firstChild]]);
    for (const stroke of strokes) {
      keep.add(stroke.id);
      const group = groupFor(layer, stroke);
      let entry = layer.els.get(stroke.id);
      if (entry && entry.node.parentNode !== group) {
        entry.node.remove();
        entry = null;
      }
      if (!entry) {
        entry = { stroke, node: el('path', {}) };
        paintStroke(entry.node, stroke);
        layer.els.set(stroke.id, entry);
      } else if (entry.stroke !== stroke) {
        paintStroke(entry.node, stroke);
        entry.stroke = stroke;
      }
      const cursor = cursors.get(group);
      if (entry.node === cursor) cursors.set(group, cursor.nextSibling);
      else group.insertBefore(entry.node, cursor);
    }
    for (const [id, entry] of layer.els) {
      if (!keep.has(id)) {
        entry.node.remove();
        layer.els.delete(id);
      }
    }
  }

  /** A stroke being drawn; rendered in its final group so it looks identical. */
  function liveStroke(layer, tool) {
    const node = el('path', {});
    (tool === 'pen' ? layer.pen : layer.hl).appendChild(node);
    return {
      update(stroke) { paintStroke(node, stroke); node.classList.add('ann-live'); },
      remove() { node.remove(); },
    };
  }

  function translateStrokes(layer, ids, dx, dy) {
    for (const id of ids) {
      const entry = layer.els.get(id);
      if (entry) entry.node.setAttribute('transform', `translate(${dx} ${dy})`);
    }
  }

  // ── UI overlays ────────────────────────────────────────────────

  function uiNode(layer, key, tag, attrs) {
    layer.uiNodes = layer.uiNodes || {};
    let node = layer.uiNodes[key];
    if (!node) node = layer.uiNodes[key] = el(tag, attrs, layer.ui);
    return node;
  }

  function hideUi(layer, key) {
    if (layer.uiNodes && layer.uiNodes[key]) layer.uiNodes[key].setAttribute('display', 'none');
  }

  /** Dashed selection rectangle; null hides it. */
  function setSelectionBox(layer, box, dx = 0, dy = 0) {
    if (!box) return hideUi(layer, 'sel');
    const pad = 6;
    const node = uiNode(layer, 'sel', 'rect', { class: 'ann-selection' });
    node.removeAttribute('display');
    node.setAttribute('x', box.minX - pad + dx);
    node.setAttribute('y', box.minY - pad + dy);
    node.setAttribute('width', box.maxX - box.minX + 2 * pad);
    node.setAttribute('height', box.maxY - box.minY + 2 * pad);
  }

  /** Rectangle or lasso outline while selecting; null hides it. */
  function setMarquee(layer, poly) {
    if (!poly) return hideUi(layer, 'marquee');
    const node = uiNode(layer, 'marquee', 'polygon', { class: 'ann-marquee' });
    node.removeAttribute('display');
    node.setAttribute('points', poly.map(p => `${geometry.round(p[0], 1)},${geometry.round(p[1], 1)}`).join(' '));
  }

  /** Eraser outline following the pointer; null hides it. */
  function setEraserCursor(layer, pt, r) {
    if (!pt) return hideUi(layer, 'eraser');
    const node = uiNode(layer, 'eraser', 'circle', { class: 'ann-eraser-cursor' });
    node.removeAttribute('display');
    node.setAttribute('cx', pt[0]);
    node.setAttribute('cy', pt[1]);
    node.setAttribute('r', r);
  }

  // ── Paper (blank pages) ────────────────────────────────────────

  /**
   * White page with optional ruled lines or grid, drawn as SVG patterns whose
   * spacing scales with the slide width (40 units on a 1280-wide slide).
   * Returns { set(paper) }. Must be created before the annotation layer.
   */
  function createPaper(svg, size, uid) {
    const [w, h] = size;
    const step = w / 32;
    const defs = el('defs', {}, svg);
    const lined = el('pattern', {
      id: `ann-lined-${uid}`, patternUnits: 'userSpaceOnUse', width: w, height: step,
    }, defs);
    el('line', { x1: 0, y1: step - 0.5, x2: w, y2: step - 0.5, class: 'ann-paper-rule' }, lined);
    const grid = el('pattern', {
      id: `ann-grid-${uid}`, patternUnits: 'userSpaceOnUse', width: step, height: step,
    }, defs);
    el('path', { d: `M${step} 0V${step}H0`, class: 'ann-paper-grid', fill: 'none' }, grid);

    const base = el('rect', { class: 'ann-paper', x: 0, y: 0, width: w, height: h, fill: '#ffffff' }, svg);
    const pattern = el('rect', { x: 0, y: step, width: w, height: h - step, fill: 'none' }, svg);
    const margin = el('line', { class: 'ann-paper-margin', x1: step * 3, y1: 0, x2: step * 3, y2: h }, svg);

    return {
      base,
      set(paper) {
        svg.dataset.paper = paper;
        margin.setAttribute('display', paper === 'lined' ? 'inline' : 'none');
        if (paper === 'lined') {
          pattern.setAttribute('y', step);
          pattern.setAttribute('height', h - step);
          pattern.setAttribute('fill', `url(#ann-lined-${uid})`);
        } else if (paper === 'grid') {
          pattern.setAttribute('y', 0);
          pattern.setAttribute('height', h);
          pattern.setAttribute('fill', `url(#ann-grid-${uid})`);
        } else {
          pattern.setAttribute('fill', 'none');
        }
      },
    };
  }

  // ── Laser ──────────────────────────────────────────────────────

  const LASER_MS = 350;   // a point fades out after this long
  const LASER_LEN = 140;   // longest trail, in slide units
  const LASER_SIZE = 8;    // width at the head (tapers to the tail)

  /** Fading red trail. Points live only here: never stored, never undoable. */
  function laser(layer) {
    if (layer.laser) return layer.laser;
    const g = el('g', { class: 'ann-laser' }, layer.ui);
    // one smooth tapered shape instead of separate segments (no beads, no gaps)
    const trail = el('path', { class: 'ann-laser-trail' }, g);
    const dot = el('circle', { class: 'ann-laser-dot', r: 7, display: 'none' }, g);
    let pts = [];
    let frame = 0;

    function draw() {
      const now = performance.now();
      pts = pts.filter(p => now - p.t < LASER_MS);
      const head = pts[pts.length - 1];
      if (!head) {
        trail.removeAttribute('d');
        dot.setAttribute('display', 'none');
        frame = 0;
        return;
      }
      const line = geometry.laserTrail(pts.map(p => [p.x, p.y]), LASER_LEN);
      trail.setAttribute('d', line.length > 1
        ? geometry.outlinePath(geometry.strokeOutline(geometry.smoothPoints(line), LASER_SIZE)) : '');
      const fade = Math.max(0, 1 - (now - head.t) / LASER_MS).toFixed(3);
      trail.setAttribute('opacity', fade);
      dot.removeAttribute('display');
      dot.setAttribute('cx', head.x);
      dot.setAttribute('cy', head.y);
      dot.setAttribute('opacity', fade);
      frame = requestAnimationFrame(draw);
    }

    layer.laser = {
      add(pt) {
        pts.push({ x: pt[0], y: pt[1], t: performance.now() });
        if (!frame) frame = requestAnimationFrame(draw);
      },
      clear() {
        pts = [];
        trail.removeAttribute('d');
        dot.setAttribute('display', 'none');
      },
      get length() { return pts.length; },
    };
    return layer.laser;
  }

  NS.render = {
    SVGNS, el, viewBoxSize, createLayer, paintStroke, syncLayer, liveStroke,
    translateStrokes, setSelectionBox, setMarquee, setEraserCursor, createPaper, laser,
  };
})(typeof window !== 'undefined' ? window : globalThis);
