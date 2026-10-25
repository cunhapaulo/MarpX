/* Marp Notes - slide overview and jump-to-slide
 *
 * A full-screen grid of slide thumbnails (opened from the page counter, the
 * collapsed bar's grid button, or G + Enter). Clicking one jumps there through
 * Marp's own navigation (pages.jump) and closes the overview; Esc closes it.
 * Thumbnails are scaled clones of the slide <svg data-marpit-svg>, built
 * lazily the first time they scroll into view, with every fragment shown,
 * videos replaced by their poster, ids renamed and the notes included.
 *
 * Marp scopes the theme CSS to its container (div#\:\$p > svg > …), so the
 * matching rules are copied once with that prefix replaced by the thumbnail
 * tile; nothing in the overview is printed, saved or drawn on, and it is
 * local to its window (presenter view sync only sees the resulting jump).
 *
 * Keyboard (annotate mode on): G, a slide number, Enter jumps; G, Enter opens
 * the overview. While it is open, arrows move between thumbnails.
 */
(function (root) {
  'use strict';

  const NS = root.MarpNotes = root.MarpNotes || {};
  const ROOT_ID = 'ann-ov';
  const TILE = `#${ROOT_ID} .ann-ov-tile`;
  const GOTO_TIMEOUT = 5000;

  const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const isTyping = t =>
    t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  const noMods = e => !e.ctrlKey && !e.metaKey && !e.altKey;

  /**
   * Copy the CSS rules scoped to Marp's container, rescoped to the thumbnail
   * tiles. Grouping rules (@media, @supports, …) keep only matching children.
   */
  function scopedThemeCss(container) {
    if (!container || !container.id || typeof CSS === 'undefined') return '';
    const scope = new RegExp(`(?:div)?#${escapeRe(CSS.escape(container.id))}(?![\\w-])`, 'g');
    const rewrite = rule => {
      if (rule.selectorText !== undefined) {
        scope.lastIndex = 0;
        return scope.test(rule.cssText) ? rule.cssText.replace(scope, TILE) : '';
      }
      if (!rule.cssRules) return '';
      const inner = Array.from(rule.cssRules, rewrite).join('');
      if (!inner) return '';
      const text = rule.cssText;
      return `${text.slice(0, text.indexOf('{'))}{${inner}}`;
    };
    const out = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules; } catch (_) { continue; } // cross-origin
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        try { out.push(rewrite(rule)); } catch (_) { /* skip odd rules */ }
      }
    }
    return out.join('\n');
  }

  /** Make a slide clone inert and self-contained (see the header comment). */
  function cleanClone(svg, prefix) {
    svg.removeAttribute('class');
    svg.removeAttribute('id');
    for (const a of Array.from(svg.attributes)) {
      if (a.name.startsWith('data-bespoke')) svg.removeAttribute(a.name);
    }
    svg.querySelectorAll('[data-bespoke-marp-fragment]').forEach(n => n.removeAttribute('data-bespoke-marp-fragment'));
    svg.querySelectorAll('[data-bespoke-marp-current-fragment]').forEach(n => n.removeAttribute('data-bespoke-marp-current-fragment'));
    svg.querySelectorAll('script, audio, iframe, object, embed, .ann-hit, .ann-ui').forEach(n => n.remove());
    svg.querySelectorAll('video').forEach(v => {
      const poster = v.getAttribute('poster');
      if (!poster) { v.remove(); return; }
      const img = document.createElement('img');
      img.src = poster;
      img.alt = '';
      for (const a of ['class', 'style', 'width', 'height']) {
        if (v.hasAttribute(a)) img.setAttribute(a, v.getAttribute(a));
      }
      v.replaceWith(img);
    });
    renameIds(svg, prefix);
    return svg;
  }

  /** Prefix every id in the clone and the references to them (href, url(#…)). */
  function renameIds(node, prefix) {
    const ids = new Map();
    node.querySelectorAll('[id]').forEach(el => {
      const id = el.getAttribute('id');
      const fresh = `${prefix}${id}`;
      ids.set(id, fresh);
      el.setAttribute('id', fresh);
    });
    if (!ids.size) return;
    const urlRef = /url\(\s*(['"]?)#([^'")\s]+)\1\s*\)/g;
    node.querySelectorAll('*').forEach(el => {
      for (const a of Array.from(el.attributes)) {
        const v = a.value;
        if ((a.localName === 'href') && v[0] === '#' && ids.has(v.slice(1))) {
          el.setAttributeNS(a.namespaceURI, a.name, `#${ids.get(v.slice(1))}`);
        } else if (v.includes('url(')) {
          const next = v.replace(urlRef, (m, q, id) => (ids.has(id) ? `url(${q}#${ids.get(id)}${q})` : m));
          if (next !== v) el.setAttribute(a.name, next);
        } else if (a.name === 'aria-labelledby' || a.name === 'aria-describedby') {
          el.setAttribute(a.name, v.split(/\s+/).map(id => ids.get(id) || id).join(' '));
        }
      }
    });
  }

  function install(app) {
    const { doc } = app;
    const size = doc.deck.size;
    const total = app.slides.length;
    let ui = null;         // { root, grid, items: [] }, built on first open
    let open = false;
    let observer = null;
    const dirty = new Set(); // slides whose thumbnail notes are stale
    let goto = null;       // { digits, timer } while typing G + number

    // ── DOM ──

    function build() {
      const rootEl = document.createElement('div');
      rootEl.id = ROOT_ID;
      rootEl.className = 'ann-ov';
      rootEl.hidden = true;
      rootEl.setAttribute('role', 'dialog');
      rootEl.setAttribute('aria-modal', 'true');
      rootEl.setAttribute('aria-label', 'Slide overview');
      rootEl.style.setProperty('--ann-ov-ratio', `${size[0]} / ${size[1]}`);

      const style = document.createElement('style');
      style.textContent = scopedThemeCss(app.slides[0].svg.parentElement);

      const head = document.createElement('div');
      head.className = 'ann-ov-head';
      head.innerHTML = `<span class="ann-ov-title">Slides <span class="ann-ov-count">${total}</span></span>` +
        '<span class="ann-ov-hint">Tap a slide to go there · Esc closes</span>';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'ann-ov-close';
      close.title = 'Close overview (Esc)';
      close.setAttribute('aria-label', 'Close overview');
      close.innerHTML = NS.toolbar ? NS.toolbar.icon('close') : '×';
      close.addEventListener('click', () => api.close());
      head.appendChild(close);

      const grid = document.createElement('div');
      grid.className = 'ann-ov-grid';
      const items = app.slides.map(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ann-ov-item';
        btn.dataset.n = s.n;
        const tile = document.createElement('div');
        tile.className = 'ann-ov-tile';
        tile.inert = true;
        tile.setAttribute('inert', '');
        const num = document.createElement('span');
        num.className = 'ann-ov-num';
        num.textContent = s.n;
        const badges = document.createElement('span');
        badges.className = 'ann-ov-badges';
        btn.append(tile, num, badges);
        btn.addEventListener('click', () => { api.close(); app.pages.jump(s.n); });
        grid.appendChild(btn);
        return { n: s.n, btn, tile, badges, svg: null, badgeKey: '' };
      });

      rootEl.append(style, head, grid);
      // Clicks and touches stay in the overview (never reach bespoke or the slides).
      for (const type of ['pointerdown', 'click', 'wheel', 'touchstart', 'touchmove', 'touchend']) {
        rootEl.addEventListener(type, e => e.stopPropagation(), { passive: true });
      }
      document.body.appendChild(rootEl);
      ui = { root: rootEl, grid, items };

      if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(entries => {
          for (const en of entries) {
            if (!en.isIntersecting) continue;
            const item = items[Number(en.target.dataset.n) - 1];
            observer.unobserve(en.target);
            fill(item);
          }
        }, { root: grid, rootMargin: '400px 0px' });
        items.forEach(it => observer.observe(it.btn));
      } else {
        items.forEach(fill);
      }
    }

    /** Build (or rebuild the notes of) one thumbnail. */
    function fill(item) {
      const src = app.slides[item.n - 1].svg;
      if (!item.svg) {
        item.svg = cleanClone(src.cloneNode(true), `ann-ov${item.n}-`);
        item.tile.appendChild(item.svg);
      } else {
        const layer = src.querySelector(':scope > .ann-layer');
        const old = item.svg.querySelector(':scope > .ann-layer');
        if (layer) {
          const fresh = layer.cloneNode(true);
          fresh.querySelectorAll('.ann-hit, .ann-ui').forEach(n => n.remove());
          if (old) old.replaceWith(fresh); else item.svg.appendChild(fresh);
        }
      }
      dirty.delete(item.n);
    }

    const hasNotes = n => doc.strokes(app.slides[n - 1].pageId).length > 0 ||
      doc.blanksAfter(n).some(id => doc.strokes(id).length > 0);

    function update() {
      const cur = app.bespokeSlide().n;
      for (const item of ui.items) {
        const current = item.n === cur;
        item.btn.classList.toggle('is-current', current);
        if (current) item.btn.setAttribute('aria-current', 'page'); else item.btn.removeAttribute('aria-current');
        const notes = hasNotes(item.n);
        const blanks = doc.blanksAfter(item.n).length;
        const key = `${notes}|${blanks}|${current}`;
        if (key !== item.badgeKey) {
          item.badgeKey = key;
          const icon = NS.toolbar ? NS.toolbar.icon : () => '';
          item.badges.innerHTML =
            (notes ? `<span class="ann-ov-badge" title="Has notes">${icon('pen')}</span>` : '') +
            (blanks ? `<span class="ann-ov-badge" title="${blanks} blank page${blanks > 1 ? 's' : ''}">${icon('pagePlain')}${blanks}</span>` : '');
          item.btn.setAttribute('aria-label', [`Slide ${item.n}`, current && 'current',
            notes && 'has notes', blanks && `${blanks} blank page${blanks > 1 ? 's' : ''}`].filter(Boolean).join(', '));
        }
        if (item.svg && dirty.has(item.n)) fill(item);
      }
    }

    function columns() {
      const items = ui.items;
      const top = items[0].btn.offsetTop;
      let c = 0;
      while (c < items.length && items[c].btn.offsetTop === top) c++;
      return Math.max(1, c);
    }

    function focusItem(i) {
      const item = ui.items[Math.max(0, Math.min(ui.items.length - 1, i))];
      item.btn.focus({ preventScroll: true });
      const { grid } = ui;
      const top = item.btn.offsetTop, bottom = top + item.btn.offsetHeight;
      if (top < grid.scrollTop) grid.scrollTop = top - 18;
      else if (bottom > grid.scrollTop + grid.clientHeight) grid.scrollTop = bottom - grid.clientHeight + 18;
    }

    // ── G + number ──

    function endGoto() {
      if (!goto) return;
      clearTimeout(goto.timer);
      goto = null;
      app.refresh();
    }
    function touchGoto() {
      clearTimeout(goto.timer);
      goto.timer = setTimeout(endGoto, GOTO_TIMEOUT);
      app.refresh();
    }

    function gotoKey(e) {
      const m = /^(?:Digit|Numpad)(\d)$/.exec(e.code || '') || /^(\d)$/.exec(e.key);
      if (m && noMods(e)) {
        if (goto.digits.length < 4) goto.digits += m[1];
        touchGoto();
        return true;
      }
      if (e.key === 'Backspace') { goto.digits = goto.digits.slice(0, -1); touchGoto(); return true; }
      if (e.key === 'Enter') {
        const n = NS.pages.parseSlideNumber(goto.digits, total);
        endGoto();
        if (n === null) api.open(); else app.pages.jump(n);
        return true;
      }
      if (e.key === 'Escape' || (e.code === 'KeyG' && noMods(e))) { endGoto(); return true; }
      if (/^(Shift|Control|Alt|Meta|CapsLock)$/.test(e.key)) return true; // e.g. Shift for digits on AZERTY
      endGoto();
      return false; // any other key cancels and does its usual thing
    }

    function openKey(e) {
      const items = ui.items;
      const i = items.findIndex(it => it.btn === document.activeElement);
      const at = i === -1 ? app.bespokeSlide().n - 1 : i;
      switch (e.key) {
        case 'Escape': api.close(); return true;
        case 'ArrowRight': focusItem(at + (i === -1 ? 0 : 1)); return true;
        case 'ArrowLeft': focusItem(at - (i === -1 ? 0 : 1)); return true;
        case 'ArrowDown': focusItem(at + columns()); return true;
        case 'ArrowUp': focusItem(at - columns()); return true;
        case 'Home': focusItem(0); return true;
        case 'End': focusItem(items.length - 1); return true;
        default: return false;
      }
    }

    // Window capture, installed before toolbar.bindKeys: runs before the
    // shortcuts and before bespoke's document listeners.
    window.addEventListener('keydown', e => {
      if (typeof e.key !== 'string' || e.isComposing) return;
      if (open) {
        if (e.ctrlKey || e.metaKey) return; // Ctrl/Cmd+S etc. keep working
        if (openKey(e)) e.preventDefault();
        e.stopImmediatePropagation(); // Enter/Space/Tab keep their default on the focused thumbnail
        return;
      }
      if (isTyping(e.target)) return;
      let handled = false;
      if (goto) handled = gotoKey(e);
      else if (app.enabled && e.code === 'KeyG' && noMods(e) && !e.shiftKey && !e.repeat) {
        goto = { digits: '', timer: 0 };
        touchGoto();
        handled = true;
      }
      if (handled) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);

    doc.onChange((pageId, kind) => {
      if (kind === 'saved') return;
      if (pageId === null) app.slides.forEach(s => dirty.add(s.n));
      else {
        const n = doc.ownerSlide(pageId);
        if (n) dirty.add(n);
      }
      if (open) update(); // e.g. notes mirrored from the presenter window
    });

    const api = {
      isOpen: () => open,
      /** Text for the page counter while typing G + number, else null. */
      prompt: () => (goto ? `Go to ${goto.digits}_` : null),

      open() {
        endGoto();
        if (!ui) build();
        if (app.input) app.input.cancel();
        open = true;
        ui.root.hidden = false;
        document.body.classList.add('ann-ov-open');
        update();
        const cur = ui.items[app.bespokeSlide().n - 1];
        // Scroll only the grid (scrollIntoView could also scroll Marp's page).
        ui.grid.scrollTop = cur.btn.offsetTop - (ui.grid.clientHeight - cur.btn.offsetHeight) / 2;
        cur.btn.focus({ preventScroll: true });
      },

      close() {
        if (!open) return;
        open = false;
        if (ui.root.contains(document.activeElement)) document.activeElement.blur();
        ui.root.hidden = true;
        document.body.classList.remove('ann-ov-open');
      },

      toggle() { if (open) api.close(); else api.open(); },

      /** Called from app.refresh(): keep the open overview current (slide, notes). */
      refresh() { if (open) update(); },

      /** For tests: thumbnail elements, null before the first open. */
      get items() { return ui ? ui.items : null; },
    };
    return api;
  }

  NS.overview = { install, cleanClone, renameIds, scopedThemeCss };
})(typeof window !== 'undefined' ? window : globalThis);
