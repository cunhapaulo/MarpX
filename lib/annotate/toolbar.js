/* Marp Notes - fully expanded toolbar and keyboard shortcuts
 *
 * The bar is built from groups in GROUP_ORDER. Each group builder lives in
 * MarpNotes.toolbarGroups[id] and returns { id, label, items: [...] } where an
 * item is { id, title, icon | swatch | dot, onClick, active(), disabled() }.
 * Modules loaded earlier (pages.js, io.js) may register their own builders for
 * 'pages' and 'file'; otherwise the disabled placeholders below are used.
 */
(function (root) {
  'use strict';

  const NS = root.MarpNotes = root.MarpNotes || {};
  const { tools: T } = NS;

  // ── Icons (24×24, stroked with currentColor) ───────────────────

  const ICONS = {
    annotate: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    pen: '<path d="M3 21l3.5-1L19 7.5 16.5 5 4 17.5z"/><path d="M14.5 7l2.5 2.5"/>',
    highlighter: '<path d="M9 14l-3 3v3h3l3-3"/><path d="M9 14l7-9 4 4-9 7z"/><path d="M3 21h6" stroke-width="3"/>',
    selector: '<rect x="3" y="3" width="13" height="13" stroke-dasharray="3 2.5"/><path d="M12 12l9 3.5-4 1.5-1.5 4z" fill="currentColor"/>',
    laser: '<circle cx="12" cy="12" r="3.2" fill="currentColor"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    // Stroke eraser: eraser over a whole squiggle that disappears (crossed out).
    eraser: '<path d="M6 11l6-6 5 5-6 6H8z"/><path d="M9 8l5 5"/><path d="M2.5 20c3-2.5 5-2.5 7 0s5 2.5 7 0 3.5-1.5 5-1"/>',
    // Partial eraser: eraser biting a gap out of a line.
    partial: '<path d="M9 13l5-5 4 4-5 5z" fill="currentColor"/><path d="M2 20h7M16 20h6"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
    redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',
    clear: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    prev: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    pageInsert: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M12.5 10.5v7M9 14h7"/>',
    pagePlain: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/>',
    pageLined: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 14h7M9 17h7"/>',
    pageGrid: '<path d="M6 3h9l4 4v14H6z"/><path d="M10 9v12M14 9v12M6 13h13M6 17h13"/>',
    pageDelete: '<path d="M6 3h9l4 4v14H6z"/><path d="M9.5 12.5l5 5M14.5 12.5l-5 5"/>',
    save: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>',
    load: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 17v3h16v-3"/>',
    dockTop: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18" stroke-width="3.2"/>',
    dockRight: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M16 4v16" stroke-width="3.2"/>',
    dockBottom: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15h18" stroke-width="3.2"/>',
    dockLeft: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16" stroke-width="3.2"/>',
    overview: '<rect x="3" y="4" width="7.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="7.5" height="6.5" rx="1"/><rect x="3" y="13.5" width="7.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="7.5" height="6.5" rx="1"/>',
    pdf: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="1.5"/><path d="M7 14h10v7H7z"/>',
  };

  const icon = name =>
    `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" ` +
    `stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

  // ── Groups ─────────────────────────────────────────────────────

  const GROUP_ORDER = ['mode', 'tools', 'colors', 'sizes', 'history', 'pages', 'file'];
  const groups = NS.toolbarGroups = NS.toolbarGroups || {};

  const DOCKS = ['top', 'right', 'bottom', 'left'];
  const DOCK_KEY = 'marp-notes-dock-v1';
  const cap = w => w[0].toUpperCase() + w.slice(1);

  function loadDock() {
    try {
      const d = localStorage.getItem(DOCK_KEY);
      return DOCKS.includes(d) ? d : 'top';
    } catch (_) { return 'top'; }
  }

  function setDock(dock) {
    document.body.dataset.annDock = dock;
    try { localStorage.setItem(DOCK_KEY, dock); } catch (_) { /* convenience only */ }
  }

  groups.mode = groups.mode || (app => ({
    id: 'mode', label: 'Annotate', items: [{
      id: 'toggle', title: 'Annotate mode (A)',
      icon: () => (app.enabled ? 'close' : 'annotate'),
      onClick: () => app.toggle(),
      active: () => app.enabled,
    }, {
      id: 'dock', title: () => `Move toolbar (now ${document.body.dataset.annDock}; next ${nextDock()})`,
      icon: () => `dock${cap(document.body.dataset.annDock || 'top')}`,
      onClick: () => { setDock(nextDock()); app.refresh(); },
    },
    // Only shown while annotate mode is off (the page counter opens it when on).
    ...(app.overview ? [{
      id: 'overview', title: 'Slide overview', icon: 'overview', onClick: () => app.overview.open(),
    }] : [])],
  }));

  const nextDock = () => DOCKS[(DOCKS.indexOf(document.body.dataset.annDock) + 1) % DOCKS.length];

  groups.tools = groups.tools || (app => ({
    id: 'tools', label: 'Tools',
    items: T.TOOLS.map(t => ({
      id: t.id, title: `${t.label} (${t.key})`, icon: t.id, caption: t.caption,
      onClick: () => app.setTool(t.id),
      active: () => app.tool === t.id,
    })),
  }));

  groups.colors = groups.colors || (app => ({
    id: 'colors', label: 'Colors',
    items: T.COLORS.map(c => ({
      id: `color-${c.id}`, title: c.label, swatch: c.value,
      onClick: () => app.setColor(c.value),
      active: () => app.currentColor() === c.value,
    })),
  }));

  groups.sizes = groups.sizes || (app => ({
    id: 'sizes', label: 'Sizes',
    items: T.SIZE_LABELS.map((label, i) => ({
      id: `size-${i}`, title: `Size ${label} (${i + 1})`, dot: i,
      onClick: () => app.setSize(i),
      active: () => app.currentSize() === i,
    })),
  }));

  groups.history = groups.history || (app => ({
    id: 'history', label: 'History',
    items: [
      { id: 'undo', title: 'Undo (Ctrl/Cmd+Z)', icon: 'undo', onClick: () => app.undo(), disabled: () => !app.doc.history.canUndo() },
      { id: 'redo', title: 'Redo (Ctrl/Cmd+Shift+Z)', icon: 'redo', onClick: () => app.redo(), disabled: () => !app.doc.history.canRedo() },
      { id: 'clear', title: 'Clear page (undoable)', icon: 'clear', onClick: () => app.clearPage(), disabled: () => !app.activeStrokes().length },
    ],
  }));

  // Phase B placeholders: replaced by pages.js / io.js when they register.
  const soon = (id, title, iconName) => ({ id, title: `${title} (coming soon)`, icon: iconName, disabled: () => true });

  groups.pages = groups.pages || (() => ({
    id: 'pages', label: 'Pages', placeholder: true,
    items: [
      soon('page-prev', 'Previous page', 'prev'),
      soon('page-next', 'Next page', 'next'),
      soon('blank-plain', 'Insert plain page (B)', 'pagePlain'),
      soon('blank-lined', 'Insert lined page', 'pageLined'),
      soon('blank-grid', 'Insert grid page', 'pageGrid'),
      soon('page-delete', 'Delete blank page', 'pageDelete'),
    ],
  }));

  groups.file = groups.file || (() => ({
    id: 'file', label: 'File', placeholder: true,
    items: [
      soon('save', 'Save notes (Ctrl/Cmd+S)', 'save'),
      soon('load', 'Load notes', 'load'),
      soon('pdf', 'Export PDF', 'pdf'),
    ],
  }));

  // ── DOM ────────────────────────────────────────────────────────

  function buildLabel(item) {
    if (item.onClick) return buildButton(item, 'ann-label');
    const span = document.createElement('span');
    span.className = 'ann-label';
    span.dataset.id = item.id;
    span.title = item.title || '';
    span.setAttribute('aria-live', 'polite');
    return span;
  }

  /** A text item with onClick becomes a button with the label's look (extraClass). */
  function buildButton(item, extraClass) {
    if (item.text && !extraClass) return buildLabel(item);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = extraClass ? `ann-btn ${extraClass}` : 'ann-btn';
    btn.dataset.id = item.id;
    const title = typeof item.title === 'function' ? item.title() : item.title;
    btn.title = title;
    // A text button is named by its text; the title describes it.
    if (extraClass) btn.setAttribute('aria-live', 'polite');
    else btn.setAttribute('aria-label', title);
    if (item.caption) btn.classList.add('has-cap');
    if (item.swatch) {
      btn.classList.add('ann-swatch');
      btn.style.setProperty('--swatch', item.swatch);
      btn.innerHTML = '<span></span>';
    } else if (item.dot != null) {
      btn.classList.add('ann-size');
      btn.innerHTML = `<span style="--dot:${[4, 8, 13, 19][item.dot]}px"></span>`;
    }
    // Do not take focus: a focused button would swallow Space meant for bespoke.
    btn.addEventListener('pointerdown', e => e.preventDefault());
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (item.onClick && !btn.disabled) item.onClick();
    });
    return btn;
  }

  function createToolbar(app) {
    const bar = document.createElement('div');
    bar.className = 'ann-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Lecture notes');
    const entries = [];
    // Previous/next page sit large at the two ends of the bar, easy to hit
    // on a tablet; every other button stays in its group.
    const edge = {};
    for (const side of ['start', 'end']) {
      edge[side] = document.createElement('div');
      edge[side].className = `ann-group ann-edge ann-edge-${side}`;
      edge[side].setAttribute('role', 'group');
      edge[side].setAttribute('aria-label', side === 'start' ? 'Previous page' : 'Next page');
    }
    bar.appendChild(edge.start);

    for (const gid of GROUP_ORDER) {
      if (!groups[gid]) continue;
      const def = groups[gid](app);
      const g = document.createElement('div');
      g.className = `ann-group ann-group-${gid}`;
      if (def.placeholder) g.classList.add('ann-placeholder');
      g.setAttribute('role', 'group');
      g.setAttribute('aria-label', def.label);
      for (const item of def.items) {
        const btn = buildButton(item);
        (item.edge ? edge[item.edge] : g).appendChild(btn);
        entries.push({ item, btn });
      }
      bar.appendChild(g);
    }
    bar.appendChild(edge.end);
    for (const el of Object.values(edge)) if (!el.childElementCount) el.remove();
    // Keys on focused toolbar buttons must not reach bespoke's navigation.
    bar.addEventListener('keydown', e => e.stopPropagation());
    document.body.appendChild(bar);

    // Offset Marp content by the real bar height (the bar may wrap).
    const setOffset = () => {
      const style = document.documentElement.style;
      style.setProperty('--ann-bar-h', `${bar.offsetHeight}px`);
      style.setProperty('--ann-bar-w', `${bar.offsetWidth}px`);
    };
    if (!document.body.dataset.annDock) document.body.dataset.annDock = loadDock();
    if ('ResizeObserver' in window) new ResizeObserver(setOffset).observe(bar);
    setOffset();

    function update() {
      for (const { item, btn } of entries) {
        if (item.text) {
          const t = item.text();
          if (btn.textContent !== t) btn.textContent = t;
          if (!item.onClick) continue;
        }
        if (typeof item.title === 'function') {
          btn.title = item.title();
          btn.setAttribute('aria-label', btn.title);
        }
        if (item.icon) {
          const name = typeof item.icon === 'function' ? item.icon() : item.icon;
          if (btn.dataset.icon !== name) {
            btn.innerHTML = icon(name) + (item.caption ? `<span class="ann-cap">${item.caption}</span>` : '');
            btn.dataset.icon = name;
          }
        }
        const on = item.active ? !!item.active() : false;
        btn.classList.toggle('is-active', on);
        if (item.active) btn.setAttribute('aria-pressed', String(on));
        btn.disabled = item.disabled ? !!item.disabled() : false;
      }
      setOffset();
    }
    update();
    return { el: bar, update };
  }

  // ── Keyboard ───────────────────────────────────────────────────

  const isTyping = t =>
    t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

  /** Shortcut table; later phases can push entries ({ test(e), run(e) }). */
  /**
   * Letter shortcuts match the physical key (e.code), so they work with any
   * keyboard layout; undo/redo follow the key label like the OS does, with
   * the physical key as fallback on non-Latin layouts.
   */
  const noMods = e => !e.ctrlKey && !e.metaKey && !e.altKey;
  const letter = (e, k) => e.code === `Key${k.toUpperCase()}`;
  const labelOrCode = (e, k) =>
    e.key.toLowerCase() === k || (!/^[a-z]$/i.test(e.key) && letter(e, k));

  function defaultKeymap(app) {
    const mod = e => (e.ctrlKey || e.metaKey) && !e.altKey;
    const tool = (k, id, shift = false) => ({
      test: e => letter(e, k) && noMods(e) && e.shiftKey === shift,
      run: () => app.setTool(id),
    });
    return [
      { test: e => mod(e) && labelOrCode(e, 'z') && !e.shiftKey, run: () => app.undo() },
      { test: e => mod(e) && ((labelOrCode(e, 'z') && e.shiftKey) || labelOrCode(e, 'y')), run: () => app.redo() },
      tool('p', 'pen'), tool('h', 'highlighter'), tool('s', 'selector'),
      tool('l', 'laser'), tool('e', 'eraser'), tool('e', 'partial', true),
      ...[0, 1, 2, 3].map(i => ({
        test: e => (e.code === `Digit${i + 1}` || e.code === `Numpad${i + 1}`) && noMods(e),
        run: () => app.setSize(i),
      })),
      { test: e => (e.key === 'Delete' || e.key === 'Backspace') && !!app.selection, run: () => app.deleteSelection() },
      { test: e => e.key === 'Escape' && !!app.selection, run: () => app.select(null) },
    ];
  }

  function bindKeys(app, keymap) {
    // Capture on window so we run before bespoke's document listeners
    // ('p' would otherwise open the presenter view, Space/arrows navigate).
    window.addEventListener('keydown', e => {
      if (typeof e.key !== 'string' || isTyping(e.target) || e.isComposing) return;
      let handled = false;
      if (letter(e, 'a') && noMods(e) && !e.shiftKey) {
        if (!e.repeat) app.toggle(); // holding A must not flicker the mode
        handled = true;
      } else if (app.enabled) {
        // A shortcut whose run() returns false leaves the key to Marp.
        const hit = keymap.find(k => k.test(e));
        if (hit) handled = hit.run(e) !== false;
      }
      if (handled) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
  }

  NS.toolbar = { ICONS, GROUP_ORDER, DOCKS, icon, setDock, createToolbar, defaultKeymap, bindKeys, letter, noMods };
})(typeof window !== 'undefined' ? window : globalThis);
