/* Marp Notes - tool behaviours
 *
 * A tool is { id, down, move, up, cancel, hover, leave, deactivate }; every
 * handler gets (slide, pt, event) with pt = [x, y, pressure] in slide units.
 * Tools edit the document only through NotesDoc commands, so every finished
 * gesture is one undo step. The laser never touches the document.
 */
(function (root) {
  'use strict';

  const NS = root.MarpNotes = root.MarpNotes || {};
  const { geometry, model, render } = NS;

  const COLORS = [
    { id: 'black', value: '#000000', label: 'Black' },
    { id: 'white', value: '#ffffff', label: 'White' },
    { id: 'red', value: '#be1e3c', label: 'Red' },
    { id: 'blue', value: '#1e64c8', label: 'Blue' },
    { id: 'green', value: '#2e8b3a', label: 'Green' },
    { id: 'orange', value: '#f08c00', label: 'Orange' },
    { id: 'yellow', value: '#ffd200', label: 'Yellow' },
    { id: 'purple', value: '#7a3c96', label: 'Purple' },
  ];

  const SIZE_LABELS = ['S', 'M', 'L', 'XL'];
  const SIZES = {               // slide units (viewBox), per tool
    pen: [2, 4, 7, 12],         // stroke width
    highlighter: [12, 20, 32, 48],
    eraser: [8, 16, 32, 64],    // eraser radius
    partial: [8, 16, 32, 64],
  };

  const DEFAULT_PREFS = {
    pen: { color: '#000000', size: 1 },
    highlighter: { color: '#ffd200', size: 1 },
    eraser: { size: 1 },
    partial: { size: 1 },
    selector: {},
    laser: {},
  };

  const sizeOf = (app, tool) => SIZES[tool][app.prefs[tool].size];

  // ── Pen / highlighter ──────────────────────────────────────────

  function inkTool(app, id) {
    let raw = null, live = null, frame = 0, straight = false;

    const current = () => {
      const pts = straight ? [raw[0], raw[raw.length - 1]] : geometry.smoothPoints(raw);
      return { tool: id, color: app.prefs[id].color, size: sizeOf(app, id), points: pts };
    };
    // Redraw the live stroke at most once per frame (moves only collect points).
    const draw = () => {
      frame = 0;
      if (raw) live.update({ id: 'live', ...current() });
    };
    const stopFrame = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    return {
      id,
      down(slide, pt, e) {
        raw = [pt];
        straight = !!(e && e.shiftKey);
        live = render.liveStroke(slide.layer, id);
        draw();
      },
      move(slide, pt, e) {
        if (!raw) return;
        raw.push(pt);
        straight = !!(e && e.shiftKey);
        if (!frame) frame = requestAnimationFrame(draw);
      },
      /** Commits the stroke; pt and e are null when ended by cancel/blur/etc. */
      up(slide, pt, e) {
        if (!raw) return;
        stopFrame();
        // Pens report pressure 0 on release: keep the last real pressure.
        if (pt) raw.push([pt[0], pt[1], raw[raw.length - 1][2]]);
        if (e) straight = !!e.shiftKey;
        const stroke = model.createStroke(current());
        live.remove();
        raw = live = null;
        app.doc.addStroke(slide.pageId, stroke);
      },
      cancel() {
        stopFrame();
        if (live) live.remove();
        raw = live = null;
      },
    };
  }

  // ── Erasers ────────────────────────────────────────────────────

  /** Works on a private copy of the page; one command on release. */
  function eraserTool(app, id, partial) {
    let working = null, last = null;

    const radius = () => sizeOf(app, id);

    function eraseAlong(slide, a, b) {
      const r = radius();
      let changed = false;
      const next = [];
      for (const s of working) {
        if (!partial) {
          if (geometry.strokeHitsSegment(s, a, b, r)) changed = true;
          else next.push(s);
          continue;
        }
        const pieces = geometry.splitByEraser(s, a, b, r);
        if (pieces === null) { next.push(s); continue; }
        changed = true;
        for (const points of pieces) next.push(model.createStroke({ ...s, id: null, points }));
      }
      if (changed) {
        working = next;
        render.syncLayer(slide.layer, working);
      }
    }

    return {
      id,
      down(slide, pt) {
        working = app.doc.strokes(slide.pageId).slice();
        last = pt;
        render.setEraserCursor(slide.layer, pt, radius());
        eraseAlong(slide, pt, pt);
      },
      move(slide, pt) {
        if (!working) return;
        render.setEraserCursor(slide.layer, pt, radius());
        eraseAlong(slide, last, pt);
        last = pt;
      },
      up(slide) {
        if (!working) return;
        const result = working;
        working = last = null;
        app.doc.replaceStrokes(slide.pageId, result, partial ? 'partial-erase' : 'erase');
      },
      cancel(slide) {
        working = last = null;
        render.syncLayer(slide.layer, app.doc.strokes(slide.pageId));
        render.setEraserCursor(slide.layer, null);
      },
      hover(slide, pt) { render.setEraserCursor(slide.layer, pt, radius()); },
      leave(slide) { render.setEraserCursor(slide.layer, null); },
      deactivate() { app.surfaces.forEach(s => render.setEraserCursor(s.layer, null)); },
    };
  }

  // ── Selector ───────────────────────────────────────────────────

  function selectorTool(app) {
    let mode = null, path = null, start = null, offset = [0, 0];

    const sel = () => app.selection;
    const insideSelection = (slide, pt) => {
      const s = sel();
      if (!s || s.pageId !== slide.pageId || !s.box) return false;
      const pad = 10;
      return pt[0] >= s.box.minX - pad && pt[0] <= s.box.maxX + pad &&
             pt[1] >= s.box.minY - pad && pt[1] <= s.box.maxY + pad;
    };

    return {
      id: 'selector',
      down(slide, pt) {
        if (insideSelection(slide, pt)) {
          mode = 'move';
          start = pt;
          offset = [0, 0];
          return;
        }
        app.select(null);
        mode = 'select';
        path = [pt];
      },
      move(slide, pt) {
        if (mode === 'move') {
          offset = [pt[0] - start[0], pt[1] - start[1]];
          render.translateStrokes(slide.layer, sel().ids, offset[0], offset[1]);
          render.setSelectionBox(slide.layer, sel().box, offset[0], offset[1]);
        } else if (mode === 'select') {
          path.push(pt);
          render.setMarquee(slide.layer, geometry.isLasso(path) ? path : geometry.rectPolygon(path[0], pt));
        }
      },
      up(slide, pt) {
        if (mode === 'move') {
          const s = sel();
          mode = null;
          if (!app.doc.moveStrokes(slide.pageId, s.ids, offset[0], offset[1])) {
            render.translateStrokes(slide.layer, s.ids, 0, 0);
            render.setSelectionBox(slide.layer, s.box);
          }
          return;
        }
        if (mode !== 'select') return;
        mode = null;
        if (pt) path.push(pt);
        render.setMarquee(slide.layer, null);
        const strokes = app.doc.strokes(slide.pageId);
        let ids;
        if (geometry.pathLength(path) < 4) {
          // A tap selects the topmost stroke under the pointer.
          const hit = strokes.slice().reverse().find(s => geometry.strokeHitsSegment(s, path[0], path[0], 4));
          ids = hit ? [hit.id] : [];
        } else {
          const poly = geometry.isLasso(path) ? path : geometry.rectPolygon(path[0], path[path.length - 1]);
          ids = geometry.strokesInPolygon(strokes, poly);
        }
        path = null;
        app.select(ids.length ? { pageId: slide.pageId, ids } : null);
      },
      cancel(slide) {
        if (mode === 'move' && sel()) {
          render.translateStrokes(slide.layer, sel().ids, 0, 0);
          render.setSelectionBox(slide.layer, sel().box);
        }
        render.setMarquee(slide.layer, null);
        mode = path = null;
      },
      deactivate() { app.select(null); },
    };
  }

  // ── Laser ──────────────────────────────────────────────────────

  function laserTool(app) {
    const trace = (slide, pt) => {
      render.laser(slide.layer).add(pt);
      if (app.sync) app.sync.laser(slide.pageId, pt); // mirror to the presenter/audience window
    };
    return { id: 'laser', down: trace, move: trace, hover: trace };
  }

  // ── Registry ───────────────────────────────────────────────────

  const TOOLS = [
    { id: 'pen', label: 'Pen', key: 'P', color: true, size: true },
    { id: 'highlighter', label: 'Highlighter', key: 'H', color: true, size: true },
    { id: 'selector', label: 'Select (drag: box, circle: lasso)', key: 'S', color: false, size: false },
    { id: 'laser', label: 'Laser pointer', key: 'L', color: false, size: false },
    { id: 'eraser', label: 'Stroke eraser: removes whole strokes', key: 'E', caption: 'stroke', color: false, size: true },
    { id: 'partial', label: 'Partial eraser: erases only what it touches', key: 'Shift+E', caption: 'part', color: false, size: true },
  ];

  function createTools(app) {
    return {
      pen: inkTool(app, 'pen'),
      highlighter: inkTool(app, 'highlighter'),
      selector: selectorTool(app),
      laser: laserTool(app),
      eraser: eraserTool(app, 'eraser', false),
      partial: eraserTool(app, 'partial', true),
    };
  }

  NS.tools = { COLORS, SIZES, SIZE_LABELS, DEFAULT_PREFS, TOOLS, createTools };
})(typeof window !== 'undefined' ? window : globalThis);
