/* Marp Notes - blank pages and page navigation
 *
 * A blank page is shown as an <svg class="ann-blank"> overlay with the slide's
 * viewBox, stacked over the slides inside Marp's parent element, so it lines
 * up with the slide in every view. It has paper (plain / lined / grid) and its
 * own annotation layer. Reading order: slide n, its blank pages, slide n+1.
 * Marp keeps doing its own navigation whenever no blank page is involved.
 */
(function (root) {
  'use strict';

  const NS = root.MarpNotes = root.MarpNotes || {};
  const { render } = NS;

  const PAPERS = [
    { id: 'plain', label: 'Plain paper', icon: 'pagePlain' },
    { id: 'lined', label: 'Lined paper', icon: 'pageLined' },
    { id: 'grid', label: 'Grid paper', icon: 'pageGrid' },
  ];

  // Toolbar group (toolbar.js uses this instead of its placeholder).
  (NS.toolbarGroups = NS.toolbarGroups || {}).pages = app => ({
    id: 'pages', label: 'Pages',
    items: [
      { id: 'page-prev', title: 'Previous page (←, two-finger swipe right)', icon: 'prev', edge: 'start', onClick: () => app.pages.step(-1),
        disabled: () => !app.pages.canStep(-1) },
      { id: 'page-label', text: () => (app.overview && app.overview.prompt()) || app.pages.label(),
        title: 'Slide overview: click to jump to a slide (or G, a number, Enter)',
        onClick: () => app.overview && app.overview.open() },
      { id: 'page-next', title: 'Next page (→, two-finger swipe left)', icon: 'next', edge: 'end', onClick: () => app.pages.step(1),
        disabled: () => !app.pages.canStep(1) },
      { id: 'page-insert', title: 'Insert blank page after this page (B)', icon: 'pageInsert',
        onClick: () => app.pages.insert() },
      ...PAPERS.map(p => ({
        id: `paper-${p.id}`, title: `${p.label} (for this and new blank pages)`, icon: p.icon,
        onClick: () => app.pages.setPaper(p.id),
        active: () => app.pages.paper() === p.id,
      })),
      { id: 'page-delete', title: 'Delete this blank page', icon: 'pageDelete',
        onClick: () => app.pages.deleteCurrent(), disabled: () => !app.currentBlank },
    ],
  });

  /**
   * Compact page counter (thin spaces around the slash): "3 / 44" on a slide, "3 / 44 · +2 blank" on a slide
   * followed by blank pages, "3 / 44 · blank 1/2" on its first blank page.
   * pos is doc.position() ({ slide, index, count }, index 1 = the slide itself);
   * total counts Marp slides only.
   */
  function formatLabel(pos, total) {
    const base = `${pos.slide}\u2009/\u2009${total}`; // thin spaces: the bar is dense
    const blanks = pos.count - 1;
    if (blanks < 1) return base;
    if (pos.index <= 1) return `${base} · +${blanks} blank`;
    return `${base} · blank ${pos.index - 1}/${blanks}`;
  }

  /** Slide number typed after G: digits only, clamped to 1..total; null if none. */
  function parseSlideNumber(text, total) {
    if (!/^\d+$/.test(text || '')) return null;
    return Math.max(1, Math.min(total, Number(text)));
  }

  function install(app) {
    const { doc } = app;
    const size = doc.deck.size;
    const parent = document.querySelector('.bespoke-marp-parent') || app.slides[0].svg.parentNode;
    let defaultPaper = 'grid';
    const viewListeners = [];
    const viewChanged = () => viewListeners.forEach(fn => fn(app.currentBlank ? app.currentBlank.pageId : null));
    let paperUid = 0; // pattern ids for url(#…) must not depend on page ids

    function surfaceFor(id) {
      let surface = app.surfaces.get(id);
      if (surface) return surface;
      const page = doc.getPage(id);
      const svg = render.el('svg', {
        class: 'ann-blank', viewBox: `0 0 ${size[0]} ${size[1]}`, 'data-page': id,
      });
      const paper = render.createPaper(svg, size, `p${++paperUid}`);
      surface = { n: page.after, svg, pageId: id, paper, layer: render.createLayer(svg), blank: true };
      paper.set(page.paper);
      render.syncLayer(surface.layer, doc.strokes(id));
      parent.appendChild(svg);
      app.input.attach(surface);
      app.surfaces.set(id, surface);
      return surface;
    }

    function dropSurface(id) {
      const surface = app.surfaces.get(id);
      if (!surface || !surface.blank) return;
      surface.svg.remove();
      app.surfaces.delete(id);
    }

    function show(id) {
      const surface = surfaceFor(id);
      if (app.currentBlank === surface) return;
      app.input.cancel();
      app.select(null);
      if (app.currentBlank) app.currentBlank.svg.classList.remove('is-current');
      surface.svg.classList.add('is-current');
      app.currentBlank = surface;
      viewChanged();
      app.refresh();
    }

    /** silent: do not announce it (the peer follows the slide change by itself). */
    function leave(silent = false) {
      if (!app.currentBlank) return;
      app.input.cancel();
      if (app.selection && app.selection.pageId === app.currentBlank.pageId) app.select(null);
      render.laser(app.currentBlank.layer).clear();
      app.currentBlank.svg.classList.remove('is-current');
      app.currentBlank = null;
      if (!silent) viewChanged();
      app.refresh();
    }

    const currentPageId = () => app.activeSlide().pageId;

    /** Let Marp move one slide, exactly as its own next/prev buttons do. False if it can't. */
    function marpStep(dir) {
      const btn = document.querySelector(`[data-bespoke-marp-osc="${dir > 0 ? 'next' : 'prev'}"]`);
      if (!btn) return false;
      btn.click();
      return true;
    }

    /** Last resort without Marp's buttons: its hash navigation (#<slide number>). */
    function hashStep(dir) {
      const n = app.bespokeSlide().n + dir;
      if (n >= 1 && n <= app.slides.length) location.hash = `#${n}`;
    }

    /**
     * Go to slide n at its first step through Marp's hash navigation, as if the
     * user typed #n: bespoke state, URL, presenter sync and fragments follow.
     * Marp only listens for a *change*, so for the slide already shown (e.g.
     * back from step 3 to its first step) the event is dispatched by hand.
     */
    function marpGoto(n) {
      const from = app.bespokeSlide().n;
      const hash = `#${n}`;
      if (location.hash !== hash) location.hash = hash;
      else window.dispatchEvent(new HashChangeEvent('hashchange'));
      // Without Marp's hash plugin nothing moved: step whole slides with its
      // buttons instead (Shift+click skips fragments). Skipped if anything else
      // moved the deck in the meantime.
      if (n === from) return;
      setTimeout(() => {
        if (app.bespokeSlide().n !== from) return;
        const btn = document.querySelector(`[data-bespoke-marp-osc="${n > from ? 'next' : 'prev'}"]`);
        for (let i = 0; btn && i < Math.abs(n - from); i++) {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
        }
      }, 150);
    }

    const fragments = state =>
      !!app.bespokeSlide().svg.querySelector(`[data-bespoke-marp-fragment="${state}"]`);

    /**
     * Move one page in reading order. Returns false when Marp should handle it
     * natively (no blank page involved, or fragments still to step through).
     */
    function go(dir) {
      const blank = app.currentBlank;
      if (blank) {
        const target = doc.neighbor(blank.pageId, dir);
        if (target && doc.getPage(target).kind === 'blank') { show(target); return true; }
        leave();
        if (dir < 0 || !target) return true;       // back to the owning slide / end of deck
        return marpStep(1);                        // past the last blank page; else Marp handles the key
      }
      const slide = app.bespokeSlide();
      if (dir > 0) {
        if (fragments('inactive')) return false;
        const blanks = doc.blanksAfter(slide.n);
        if (!blanks.length) return false;
        show(blanks[0]);
        return true;
      }
      if (fragments('active') || slide.n === 1) return false;
      const before = doc.blanksAfter(slide.n - 1);
      if (!before.length || !marpStep(-1)) return false;
      show(before[before.length - 1]);
      return true;
    }

    const api = {
      onView(fn) { viewListeners.push(fn); },
      leave,
      show,
      go,
      step(dir) { if (!go(dir) && !marpStep(dir)) hashStep(dir); },
      canStep(dir) { return doc.neighbor(currentPageId(), dir) !== null; },

      label() { return formatLabel(doc.position(currentPageId()), app.slides.length); },

      /** Jump to slide n (clamped), shown at its first step; leaves any blank page. */
      jump(n) {
        if (!Number.isFinite(n)) return;
        const target = Math.max(1, Math.min(app.slides.length, Math.round(n)));
        if (app.currentBlank) leave();
        marpGoto(target);
      },

      paper() { return app.currentBlank ? doc.getPage(app.currentBlank.pageId).paper : defaultPaper; },

      setPaper(paper) {
        defaultPaper = paper;
        if (app.currentBlank) doc.setPaper(app.currentBlank.pageId, paper);
        app.refresh();
      },

      insert(paper = api.paper()) {
        const cmd = doc.insertBlankPage(currentPageId(), paper);
        show(cmd.pageId);
      },

      deleteCurrent() {
        const blank = app.currentBlank;
        if (!blank) return;
        const prev = doc.neighbor(blank.pageId, -1);
        doc.deletePage(blank.pageId);
        if (prev && doc.getPage(prev).kind === 'blank') show(prev);
      },

      /** Model changed pages (insert/delete/paper/undo/load): update overlays. */
      onPagesChanged() {
        for (const [id, surface] of [...app.surfaces]) {
          if (!surface.blank) continue;
          const page = doc.getPage(id);
          if (!page) {
            if (app.currentBlank === surface) leave();
            dropSurface(id);
          } else {
            surface.n = page.after; // a peer may have moved it
            surface.paper.set(page.paper);
            render.syncLayer(surface.layer, doc.strokes(id));
          }
        }
        api.onSlideChange();
      },

      /** Marp changed slides by itself: a blank page of another slide must go. */
      onSlideChange() {
        const active = app.slides.find(s => s.svg.classList.contains('bespoke-marp-active'));
        if (active && app.currentBlank && app.currentBlank.n !== active.n) leave(true);
      },

      surfaceFor,
    };

    // Navigation keys while annotate mode is on; fall through to Marp when not needed.
    const nav = (keys, dir, shift) => ({
      test: e => keys.includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey &&
        (shift === undefined || e.shiftKey === shift),
      run: () => go(dir),
    });
    app.keymap.push(
      nav(['ArrowRight', 'ArrowDown', 'PageDown'], 1),
      nav(['ArrowLeft', 'ArrowUp', 'PageUp'], -1),
      nav([' '], 1, false),
      nav([' '], -1, true),
      { test: e => e.code === 'KeyB' && !e.ctrlKey && !e.metaKey && !e.altKey, run: () => api.insert() },
    );
    return api;
  }

  NS.pages = { PAPERS, formatLabel, parseSlideNumber, install };
})(typeof window !== 'undefined' ? window : globalThis);
