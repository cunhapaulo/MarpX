/* Marp Notes - bootstrap and app state
 *
 * Builds one annotation layer per slide, the document model, the tools, the
 * toolbar and the keyboard shortcuts. The running app is exposed as
 * window.MarpNotes.app (used by later modules and the smoke test).
 */
(function (root) {
  'use strict';

  const NS = root.MarpNotes = root.MarpNotes || {};
  const { geometry, model, render, input, tools: T, toolbar: TB } = NS;
  const PREFS_KEY = 'marp-notes-prefs-v1';

  function loadPrefs() {
    const prefs = JSON.parse(JSON.stringify(T.DEFAULT_PREFS));
    try {
      const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
      if (saved && saved.prefs) {
        for (const k in prefs) Object.assign(prefs[k], saved.prefs[k] || {});
      }
      return { prefs, tool: saved && T.TOOLS.some(t => t.id === saved.tool) ? saved.tool : 'pen' };
    } catch (_) {
      return { prefs, tool: 'pen' };
    }
  }

  function savePrefs(app) {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ tool: app.tool, prefs: app.prefs }));
    } catch (_) { /* storage blocked: prefs are a convenience only */ }
  }

  function boot() {
    const body = document.body;
    if (body.dataset.bespokeView === 'next') return; // presenter's next-slide preview
    const svgs = Array.from(document.querySelectorAll('svg[data-marpit-svg]'));
    if (!svgs.length) return;

    const doc = new model.NotesDoc({
      // Marp's presenter window prefixes the title; the deck is the same.
      title: (document.title || '').replace(/^\[Presenter view\]\s*-\s*/, ''),
      slides: svgs.length,
      size: render.viewBoxSize(svgs[0]),
    });
    const slides = svgs.map((svg, i) => ({
      n: i + 1, svg, pageId: doc.slidePageId(i + 1), layer: render.createLayer(svg),
    }));
    // Every drawable surface by page id: slides now, blank pages as pages.js creates them.
    const surfaces = new Map(slides.map(s => [s.pageId, s]));
    const toolInfo = id => T.TOOLS.find(t => t.id === id);
    const { prefs, tool } = loadPrefs();

    const app = {
      doc, slides, surfaces, prefs, tool,
      enabled: false,
      currentBlank: null, // surface of the blank page shown over the slide (pages.js)
      selection: null, // { pageId, ids, box }
      tools: null,
      toolbar: null,
      input: null,

      currentTool() { return app.tools[app.tool]; },
      /** The slide Marp currently shows. */
      bespokeSlide() {
        return slides.find(s => s.svg.classList.contains('bespoke-marp-active')) || slides[0];
      },
      /** The surface being written on: a blank page if one is shown, else the slide. */
      activeSlide() { return app.currentBlank || app.bespokeSlide(); },
      activeStrokes() { return doc.strokes(app.activeSlide().pageId); },

      toggle(on = !app.enabled) {
        if (on === app.enabled) return;
        if (app.input) app.input.cancel();
        app.enabled = on;
        if (!on) {
          if (app.pages) app.pages.leave();
          app.select(null);
          slides.forEach(s => render.laser(s.layer).clear());
          const t = app.currentTool();
          if (t.deactivate) t.deactivate();
        }
        body.classList.toggle('ann-on', on);
        app.refresh();
      },

      setTool(id) {
        if (!app.tools[id]) return;
        if (id !== app.tool) {
          app.input.cancel();
          const old = app.currentTool();
          if (old.deactivate) old.deactivate();
          app.tool = id;
          savePrefs(app);
        }
        body.dataset.annTool = id;
        app.refresh();
      },

      /** Color of the current tool, or of the selection; null if neither has one. */
      currentColor() {
        if (app.tool === 'selector' && app.selection) {
          const colors = new Set(app.selectedStrokes().map(s => s.color));
          return colors.size === 1 ? [...colors][0] : null;
        }
        return toolInfo(app.tool).color ? app.prefs[app.tool].color : null;
      },
      currentSize() {
        if (app.tool === 'selector' && app.selection) {
          const idx = new Set(app.selectedStrokes().map(s => T.SIZES[s.tool].indexOf(s.size)));
          return idx.size === 1 ? [...idx][0] : null;
        }
        return toolInfo(app.tool).size ? app.prefs[app.tool].size : null;
      },

      setColor(color) {
        if (app.tool === 'selector' && app.selection) {
          doc.restyleStrokes(app.selection.pageId, app.selection.ids, { color });
          return;
        }
        if (!toolInfo(app.tool).color) app.setTool('pen');
        app.prefs[app.tool].color = color;
        savePrefs(app);
        app.refresh();
      },

      setSize(i) {
        if (app.tool === 'selector' && app.selection) {
          doc.restyleStrokes(app.selection.pageId, app.selection.ids, { size: s => T.SIZES[s.tool][i] });
          return;
        }
        if (!toolInfo(app.tool).size) app.setTool('pen');
        app.prefs[app.tool].size = i;
        savePrefs(app);
        app.refresh();
      },

      // Selection

      selectedStrokes() {
        if (!app.selection) return [];
        const ids = new Set(app.selection.ids);
        return doc.strokes(app.selection.pageId).filter(s => ids.has(s.id));
      },
      select(sel) {
        const prev = app.selection;
        if (prev && surfaces.has(prev.pageId)) render.setSelectionBox(surfaces.get(prev.pageId).layer, null);
        app.selection = sel ? { pageId: sel.pageId, ids: sel.ids.slice(), box: null } : null;
        app.refreshSelection();
        app.refresh();
      },
      refreshSelection() {
        const sel = app.selection;
        if (!sel) return;
        const strokes = app.selectedStrokes();
        const surface = surfaces.get(sel.pageId);
        if (!strokes.length || !surface) {
          app.selection = null;
          if (surface) render.setSelectionBox(surface.layer, null);
          return;
        }
        sel.ids = strokes.map(s => s.id);
        sel.box = geometry.unionBBox(strokes.map(geometry.strokeBBox));
        render.setSelectionBox(surface.layer, sel.box);
      },
      deleteSelection() {
        const sel = app.selection;
        if (!sel) return;
        app.select(null);
        doc.removeStrokes(sel.pageId, sel.ids);
      },

      // Commands

      // Mid-gesture, Ctrl+Z only finishes the stroke being drawn.
      undo() { if (app.input.busy) app.input.cancel(); else doc.undo(); },
      redo() { if (app.input.busy) app.input.cancel(); else doc.redo(); },
      clearPage() { app.select(null); doc.clearPage(app.activeSlide().pageId); },

      refresh() {
        if (app.toolbar) app.toolbar.update();
        if (app.overview) app.overview.refresh();
      },
    };

    app.tools = T.createTools(app);
    app.input = input.attachInput(app, slides);
    body.dataset.annTool = app.tool;

    doc.onChange((pageId, kind) => {
      if (kind === 'pages') {
        if (app.pages) app.pages.onPagesChanged(pageId);
      } else {
        const surface = surfaces.get(pageId);
        if (surface) render.syncLayer(surface.layer, doc.strokes(pageId));
      }
      if (app.selection && (pageId === null || app.selection.pageId === pageId)) app.refreshSelection();
      app.refresh();
    });
    doc.history.onChange(() => app.refresh());

    // Slide changes (bespoke toggles classes on the svgs): drop transient state.
    let current = app.bespokeSlide();
    const slideWatcher = new MutationObserver(() => {
      const next = app.bespokeSlide();
      if (next === current) return;
      app.input.cancel();
      render.laser(current.layer).clear();
      render.setEraserCursor(current.layer, null);
      current = next;
      app.select(null);
      if (app.pages) app.pages.onSlideChange();
      app.refresh();
    });
    svgs.forEach(svg => slideWatcher.observe(svg, { attributes: true, attributeFilter: ['class'] }));

    app.keymap = TB.defaultKeymap(app);
    // Optional modules (loaded before this file) add state, shortcuts, toolbar groups.
    if (NS.pages) app.pages = NS.pages.install(app);
    // Before bindKeys: its key handler must run before the shortcuts.
    if (NS.overview && app.pages) app.overview = NS.overview.install(app);
    if (NS.io) app.io = NS.io.install(app);
    if (NS.sync) app.sync = NS.sync.install(app);
    TB.bindKeys(app, app.keymap);
    app.toolbar = TB.createToolbar(app);
    app.refresh();

    NS.app = app;
    document.dispatchEvent(new CustomEvent('marp-notes:ready', { detail: app }));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
