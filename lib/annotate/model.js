/* Marp Notes - document model, commands and (de)serialization (pure, no DOM)
 *
 * Strokes are immutable: every edit replaces a page's stroke array (and any
 * changed stroke object), so a command only needs the before/after arrays.
 */
(function (root) {
  'use strict';

  const NS = root.MarpNotes = root.MarpNotes || {};
  const geometry = NS.geometry ||
    (typeof require === 'function' ? require('./geometry.js') : null);

  const FORMAT = 'marp-notes';
  const VERSION = 1;
  const TOOLS = ['pen', 'highlighter'];
  const PAPERS = ['plain', 'lined', 'grid'];

  let idCounter = 0;
  // Unique per window, so two windows (presenter + audience) never mint the same id.
  const idPrefix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const newId = () => `${idPrefix}-${(idCounter++).toString(36)}`;

  function createStroke({ id, tool, color, size, points }) {
    if (!TOOLS.includes(tool)) throw new Error(`Unknown stroke tool: ${tool}`);
    if (!Array.isArray(points)) throw new Error('Stroke points must be an array');
    if (!(size > 0)) throw new Error('Stroke size must be positive');
    const finite = v => typeof v === 'number' && Number.isFinite(v);
    return {
      id: id || newId(),
      tool,
      color: String(color),
      size: Number(size),
      points: points.map(p => {
        const pressure = p && p[2] == null ? 0.5 : p && p[2];
        if (!p || !finite(p[0]) || !finite(p[1]) || !finite(pressure)) {
          throw new Error('Stroke points must be finite numbers');
        }
        return [p[0], p[1], pressure];
      }),
    };
  }

  // ── History ────────────────────────────────────────────────────

  /** Command stack; a command is { do(), undo(), label }. */
  class History {
    constructor(limit = 500) {
      this.limit = limit;
      this.undoStack = [];
      this.redoStack = [];
      this.listeners = [];
    }
    execute(cmd) {
      cmd.do();
      this.undoStack.push(cmd);
      if (this.undoStack.length > this.limit) this.undoStack.shift();
      this.redoStack.length = 0;
      this.emit();
      return cmd;
    }
    /** Run cmd[method]; a command that fails is dropped (logged), never rethrown. */
    step(from, to, method) {
      const cmd = from[from.length - 1];
      if (!cmd) return null;
      try {
        cmd[method]();
      } catch (e) {
        from.pop();
        if (typeof console !== 'undefined') console.warn(`Marp Notes: dropped a failing ${cmd.label || 'command'}`, e);
        this.emit();
        return null;
      }
      from.pop();
      to.push(cmd);
      this.emit();
      return cmd;
    }
    undo() { return this.step(this.undoStack, this.redoStack, 'undo'); }
    redo() { return this.step(this.redoStack, this.undoStack, 'do'); }
    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }
    top() { return this.undoStack[this.undoStack.length - 1] || null; }
    clear() {
      this.undoStack.length = 0;
      this.redoStack.length = 0;
      this.emit();
    }
    onChange(fn) { this.listeners.push(fn); }
    emit() { this.listeners.forEach(fn => fn(this)); }
  }

  // ── Document ───────────────────────────────────────────────────

  const sameArray = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

  class NotesDoc {
    constructor(deck) {
      this.deck = {
        title: deck.title || '',
        slides: deck.slides || 0,
        size: deck.size ? deck.size.slice(0, 2) : [1280, 720],
      };
      this.pages = new Map();
      this.blankOrder = [];   // blank page ids, in sequence order (sorted by .after)
      this.blankCounter = 0;
      this.blankPrefix = Math.random().toString(36).slice(2, 8); // per window
      this.history = new History();
      this.listeners = [];
      this.savedTop = null;
      this.remoteDirty = false; // unsaved changes that arrived from another window
    }

    // Pages

    slidePageId(n) {
      const id = `s${n}`;
      if (!this.pages.has(id)) this.pages.set(id, { id, kind: 'slide', slide: n, strokes: [] });
      return id;
    }
    getPage(id) { return this.pages.get(id) || null; }

    /** Slide pages exist implicitly: create "s<n>" the first time it is written. */
    pageOnDemand(id) {
      const m = /^s(\d+)$/.exec(id || '');
      const n = m ? Number(m[1]) : 0;
      return n >= 1 && n <= this.deck.slides ? this.pages.get(this.slidePageId(n)) : null;
    }

    blanksAfter(n) { return this.blankOrder.filter(id => this.pages.get(id).after === n); }

    /** All pages in reading order: slide 1, its blank pages, slide 2, … */
    sequence() {
      const out = [];
      for (let n = 1; n <= this.deck.slides; n++) out.push(`s${n}`, ...this.blanksAfter(n));
      return out;
    }

    ownerSlide(pageId) {
      const page = this.pages.get(pageId);
      if (page) return page.kind === 'slide' ? page.slide : page.after;
      const m = /^s(\d+)$/.exec(pageId);
      return m ? Number(m[1]) : null;
    }

    /** { slide, index, count }: index within [slide, ...its blank pages], 1-based. */
    position(pageId) {
      const slide = this.ownerSlide(pageId);
      const group = [`s${slide}`, ...this.blanksAfter(slide)];
      return { slide, index: group.indexOf(pageId) + 1, count: group.length };
    }

    neighbor(pageId, dir) {
      const seq = this.sequence();
      const i = seq.indexOf(pageId);
      return i === -1 ? null : seq[i + dir] || null;
    }

    /** Insert a blank page directly after `afterId` (a slide or blank page). */
    insertBlankPage(afterId, paper = 'plain') {
      checkPaper(paper);
      const after = this.ownerSlide(afterId);
      if (!(after >= 1 && after <= this.deck.slides)) throw new Error(`No page ${afterId}`);
      let id;
      do { id = `b-${this.blankPrefix}-${++this.blankCounter}`; } while (this.pages.has(id));
      const page = { id, kind: 'blank', after, paper, strokes: [] };
      const idx = this.pages.get(afterId) && this.pages.get(afterId).kind === 'blank'
        ? this.blankOrder.indexOf(afterId) + 1
        : this.blankOrder.filter(b => this.pages.get(b).after < after).length;
      return this.history.execute({
        label: 'insert-page', pageId: id,
        do: () => { this.pages.set(id, page); this.blankOrder.splice(idx, 0, id); this.emit(id, 'pages'); },
        undo: () => { this.removeBlank(id); this.emit(id, 'pages'); },
      });
    }

    removeBlank(id) {
      this.pages.delete(id);
      const idx = this.blankOrder.indexOf(id);
      if (idx !== -1) this.blankOrder.splice(idx, 1); // may already be gone (removed by a peer)
    }

    /** Delete a blank page with its strokes; slide pages cannot be deleted. */
    deletePage(id) {
      const page = this.pages.get(id);
      if (!page || page.kind !== 'blank') return null;
      const idx = this.blankOrder.indexOf(id);
      return this.history.execute({
        label: 'delete-page', pageId: id,
        do: () => { this.removeBlank(id); this.emit(id, 'pages'); },
        undo: () => { this.pages.set(id, page); this.blankOrder.splice(idx, 0, id); this.emit(id, 'pages'); },
      });
    }

    setPaper(id, paper) {
      checkPaper(paper);
      const page = this.pages.get(id);
      if (!page || page.kind !== 'blank' || page.paper === paper) return null;
      const before = page.paper;
      const set = v => { page.paper = v; this.emit(id, 'pages'); };
      return this.history.execute({ label: 'paper', pageId: id, do: () => set(paper), undo: () => set(before) });
    }
    strokes(pageId) {
      const page = this.pages.get(pageId);
      return page ? page.strokes : [];
    }

    // Changes

    onChange(fn) { this.listeners.push(fn); }
    /** kind: 'strokes' (a page's strokes changed) or 'pages' (pages added/removed/restyled). */
    emit(pageId, kind = 'strokes') { this.listeners.forEach(fn => fn(pageId, kind)); }

    /** Apply fn to a page's stroke list; a page that is gone (deleted by a peer) is skipped. */
    mutate(pageId, fn) {
      const page = this.pages.get(pageId) || this.pageOnDemand(pageId);
      if (!page) return;
      page.strokes = fn(page.strokes.slice());
      this.emit(pageId);
    }

    /**
     * Change a page from its current strokes to `after` in one undoable step
     * (null if nothing changes). The command stores only the delta - strokes
     * removed (with their z-index), added (with their index) and replaced
     * (same id) - so undo/redo leave strokes added meanwhile by another
     * window untouched.
     */
    replaceStrokes(pageId, after, label = 'edit') {
      const page = this.pages.get(pageId) || this.pageOnDemand(pageId);
      if (!page) throw new Error(`No page ${pageId}`);
      const before = page.strokes;
      if (sameArray(before, after)) return null;
      const beforeById = new Map(before.map(s => [s.id, s]));
      const afterIds = new Set(after.map(s => s.id));
      const removedIds = new Set(before.filter(s => !afterIds.has(s.id)).map(s => s.id));
      const added = [];
      const oldById = new Map(), newById = new Map();
      after.forEach((s, index) => {
        const old = beforeById.get(s.id);
        if (!old) added.push({ stroke: s, index });
        else if (old !== s) { oldById.set(s.id, old); newById.set(s.id, s); }
      });
      if (!removedIds.size && !added.length && !newById.size) return null; // order-only change
      const addedIds = new Set(added.map(a => a.stroke.id));
      const insertAll = (list, items) => {
        for (const { stroke, index } of items) {
          if (!list.some(s => s.id === stroke.id)) list.splice(Math.min(index, list.length), 0, stroke);
        }
        return list;
      };
      let removedAt = [];
      return this.history.execute({
        label, pageId,
        do: () => this.mutate(pageId, list => {
          removedAt = [];
          list.forEach((s, index) => { if (removedIds.has(s.id)) removedAt.push({ stroke: s, index }); });
          const kept = list.filter(s => !removedIds.has(s.id)).map(s => newById.get(s.id) || s);
          return insertAll(kept, added);
        }),
        undo: () => this.mutate(pageId, list => {
          const kept = list.filter(s => !addedIds.has(s.id)).map(s => oldById.get(s.id) || s);
          return insertAll(kept, removedAt);
        }),
      });
    }

    addStroke(pageId, stroke) {
      return this.replaceStrokes(pageId, [...this.strokes(pageId), stroke], 'draw');
    }

    removeStrokes(pageId, ids, label = 'delete') {
      const gone = new Set(ids);
      return this.replaceStrokes(pageId, this.strokes(pageId).filter(s => !gone.has(s.id)), label);
    }

    clearPage(pageId) {
      if (!this.pages.has(pageId)) return null;
      return this.replaceStrokes(pageId, [], 'clear');
    }

    updateStrokes(pageId, ids, fn, label) {
      const set = new Set(ids);
      return this.replaceStrokes(pageId,
        this.strokes(pageId).map(s => (set.has(s.id) ? fn(s) : s)), label);
    }

    moveStrokes(pageId, ids, dx, dy) {
      if (!dx && !dy) return null;
      return this.updateStrokes(pageId, ids,
        s => ({ ...s, points: geometry.translatePoints(s.points, dx, dy) }), 'move');
    }

    /** style: { color?, size?: number | (stroke) => number } */
    restyleStrokes(pageId, ids, style) {
      return this.updateStrokes(pageId, ids, s => {
        const next = { ...s };
        if (style.color != null) next.color = style.color;
        if (style.size != null) next.size = typeof style.size === 'function' ? style.size(s) : style.size;
        return next.color === s.color && next.size === s.size ? s : next;
      }, 'restyle');
    }

    undo() { return this.history.undo(); }
    redo() { return this.history.redo(); }

    isDirty() { return this.remoteDirty || this.history.top() !== this.savedTop; }
    markSaved() {
      this.savedTop = this.history.top();
      this.remoteDirty = false;
      this.emit(null, 'saved');
    }

    // Changes from another window (presenter view). They bypass the local
    // undo stack; each window undoes only its own commands.

    blankMeta() {
      return this.blankOrder.map(id => {
        const p = this.pages.get(id);
        return { id, after: p.after, paper: p.paper };
      });
    }

    /** Returns false if the page is unknown here (e.g. its blank page has not arrived yet). */
    applyRemoteStrokes(pageId, strokes) {
      const page = this.pages.get(pageId) || this.pageOnDemand(pageId);
      if (!page) return false;
      page.strokes = strokes.map(createStroke);
      this.remoteDirty = true;
      this.emit(pageId);
      return true;
    }

    /**
     * Upsert the peer's blank pages and delete those in `removed`. Local blank
     * pages the peer does not know yet are kept.
     */
    applyRemoteBlanks(list, removed = []) {
      const listed = [];
      const seen = new Set();
      for (const meta of list) {
        const after = Number(meta.after);
        if (!Number.isInteger(after) || after < 1 || after > this.deck.slides || seen.has(meta.id)) continue;
        seen.add(meta.id);
        let page = this.pages.get(meta.id);
        if (!page) {
          page = { id: meta.id, kind: 'blank', after, paper: 'plain', strokes: [] };
          this.pages.set(meta.id, page);
        }
        page.after = after;
        page.paper = PAPERS.includes(meta.paper) ? meta.paper : 'plain';
        listed.push(page);
      }
      for (const id of removed) {
        const page = this.pages.get(id);
        if (page && page.kind === 'blank' && !seen.has(id)) this.pages.delete(id);
      }
      const localOnly = this.blankOrder.filter(id => !seen.has(id) && this.pages.has(id)).map(id => this.pages.get(id));
      this.blankOrder = [...listed, ...localOnly].sort((a, b) => a.after - b.after).map(p => p.id); // stable
      this.remoteDirty = true;
      this.emit(null, 'pages');
    }

    /** Replace all content with a peer's full state (save-file format). */
    applyRemoteState(data, dirty = true) {
      checkFormat(data);
      const pages = (data.pages || []).filter(p => p && typeof p.id === 'string');
      const blanks = pages.filter(p => p.kind === 'blank');
      const listed = new Set(blanks.map(p => p.id));
      this.applyRemoteBlanks(blanks, this.blankOrder.filter(id => !listed.has(id)));
      const filled = new Set();
      for (const p of pages) {
        if (this.applyRemoteStrokes(p.id, p.strokes || [])) filled.add(p.id);
      }
      for (const [id, page] of this.pages) {
        if (!filled.has(id) && page.strokes.length) this.applyRemoteStrokes(id, []);
      }
      // Local commands refer to content that was just replaced.
      this.history.clear();
      this.savedTop = null;
      this.remoteDirty = !!dirty;
    }

    // Serialization

    toJSON() {
      const pages = [];
      for (const id of this.sequence()) {
        const page = this.pages.get(id);
        if (!page || (page.kind === 'slide' && !page.strokes.length)) continue;
        const out = { id: page.id, kind: page.kind };
        if (page.kind === 'slide') out.slide = page.slide;
        else { out.after = page.after; out.paper = page.paper; }
        out.strokes = page.strokes.map(serializeStroke);
        pages.push(out);
      }
      return { format: FORMAT, version: VERSION, deck: { ...this.deck, size: this.deck.size.slice() }, pages };
    }

    /** Replace all content with a parsed save file. Returns { warnings }. */
    load(data) {
      checkFormat(data);
      const warnings = deckWarnings(data.deck, this.deck);
      const pages = new Map();
      for (let n = 1; n <= this.deck.slides; n++) pages.set(`s${n}`, { id: `s${n}`, kind: 'slide', slide: n, strokes: [] });
      const blanks = [];
      const strokeIds = new Set();
      const seenPages = new Set();
      for (const raw of data.pages || []) {
        const page = parsePage(raw, this.deck, warnings, strokeIds);
        if (!page) continue;
        if (seenPages.has(page.id)) { warnings.push(`Skipped duplicate page ${page.id}`); continue; }
        seenPages.add(page.id);
        if (page.kind === 'blank') {
          if (pages.has(page.id)) { warnings.push(`Skipped duplicate page ${page.id}`); continue; }
          blanks.push(page);
        }
        pages.set(page.id, page);
      }
      const touched = new Set([...this.pages.keys(), ...pages.keys()]);
      this.pages = pages;
      this.blankOrder = blanks.sort((a, b) => a.after - b.after).map(p => p.id); // stable sort
      this.blankCounter = 0;
      this.history.clear();
      this.savedTop = null;
      this.remoteDirty = false;
      touched.forEach(id => this.emit(id));
      this.emit(null, 'pages');
      return { warnings };
    }
  }

  function checkPaper(paper) {
    if (!PAPERS.includes(paper)) throw new Error(`Unknown paper: ${paper}`);
  }

  function serializeStroke(s) {
    return {
      id: s.id, tool: s.tool, color: s.color, size: s.size,
      points: s.points.map(p => [geometry.round(p[0], 2), geometry.round(p[1], 2), geometry.round(p[2], 3)]),
    };
  }

  function checkFormat(data) {
    if (!data || data.format !== FORMAT) throw new Error(`Not a ${FORMAT} file (format mismatch)`);
    if (typeof data.version !== 'number' || data.version > VERSION) {
      throw new Error(`Unsupported notes version: ${data.version}`);
    }
  }

  function deckWarnings(fileDeck, deck) {
    const w = [];
    if (!fileDeck) return ['File has no deck information'];
    if (fileDeck.title !== deck.title) w.push(`Notes were made for "${fileDeck.title}", not "${deck.title}"`);
    if (fileDeck.slides !== deck.slides) w.push(`Notes deck has ${fileDeck.slides} slides, this deck has ${deck.slides}`);
    const fs = fileDeck.size || [], ds = deck.size;
    if (fs[0] !== ds[0] || fs[1] !== ds[1]) w.push(`Slide size differs (${fs.join('x')} vs ${ds.join('x')})`);
    return w;
  }

  function parsePage(raw, deck, warnings, strokeIds = new Set()) {
    if (!raw || typeof raw.id !== 'string') { warnings.push('Skipped a page without id'); return null; }
    let page;
    if (raw.kind === 'slide') {
      const n = Number(raw.slide);
      if (!Number.isInteger(n) || n < 1 || n > deck.slides) {
        warnings.push(`Skipped notes for slide ${raw.slide} (deck has ${deck.slides})`);
        return null;
      }
      page = { id: `s${n}`, kind: 'slide', slide: n, strokes: [] };
    } else if (raw.kind === 'blank') {
      const after = Number(raw.after);
      if (!Number.isInteger(after) || after < 1 || after > deck.slides) {
        warnings.push(`Skipped blank page ${raw.id} after slide ${raw.after} (deck has ${deck.slides})`);
        return null;
      }
      const paper = PAPERS.includes(raw.paper) ? raw.paper : 'plain';
      page = { id: raw.id, kind: 'blank', after, paper, strokes: [] };
    } else {
      warnings.push(`Skipped page ${raw.id} of unknown kind ${raw.kind}`);
      return null;
    }
    for (const s of raw.strokes || []) {
      try {
        const stroke = createStroke(strokeIds.has(s && s.id) ? { ...s, id: null } : s);
        strokeIds.add(stroke.id);
        page.strokes.push(stroke);
      } catch (e) {
        warnings.push(`Skipped a malformed stroke on page ${raw.id}: ${e.message}`);
      }
    }
    return page;
  }

  const api = { FORMAT, VERSION, TOOLS, PAPERS, newId, checkFormat, createStroke, History, NotesDoc, deckWarnings };

  NS.model = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
