/* Marp Notes - live sync between windows of the same deck
 *
 * Marp's presenter view (?view=presenter) is a separate window with its own
 * document, so it has its own NotesDoc. This module mirrors notes, blank
 * pages, the shown blank page, the laser and the saved state between all
 * windows showing the same deck, over a BroadcastChannel (works on file://).
 * Each window keeps its own undo stack; an undo is mirrored as its result.
 */
(function (root) {
  'use strict';

  const NS = root.MarpNotes = root.MarpNotes || {};
  const { render } = NS;

  function install(app) {
    if (typeof BroadcastChannel !== 'function') return null;
    const { doc } = app;
    const key = `marp-notes:${location.pathname}:${doc.deck.title}:${doc.deck.slides}`;
    const channel = new BroadcastChannel(key);
    let applying = false; // true while applying a peer's message: do not echo it back

    const post = msg => channel.postMessage(msg);
    const remote = fn => {
      applying = true;
      try { fn(); } finally { applying = false; }
    };

    // Batch changes per task, in an order the peer can apply: blank-page list,
    // then page strokes, then which blank page is shown.
    let pending = null;
    const queue = () => {
      if (!pending) {
        pending = { ids: new Set(), removed: new Set(), pages: false, full: false, view: undefined };
        queueMicrotask(flush);
      }
      return pending;
    };
    function flush() {
      const { ids, removed, pages, full, view } = pending;
      pending = null;
      if (full) post({ type: 'state', json: doc.toJSON(), dirty: doc.isDirty() });
      else {
        const gone = [...removed].filter(id => !doc.getPage(id));
        if (pages) post({ type: 'blanks', blanks: doc.blankMeta(), removed: gone });
        for (const id of ids) {
          if (doc.getPage(id)) post({ type: 'strokes', id, strokes: doc.strokes(id) });
        }
      }
      if (view !== undefined) post({ type: 'view', blank: view });
    }

    doc.onChange((id, kind) => {
      if (applying) return;
      if (kind === 'saved') return post({ type: 'saved' });
      const q = queue();
      if (kind === 'pages') {
        if (id === null) q.full = true; // a file was loaded
        q.pages = true;
        // An inserted / restored page also needs its strokes (e.g. undoing a delete).
        if (id) { q.ids.add(id); q.removed.add(id); }
      } else if (id) {
        q.ids.add(id);
      }
    });

    if (app.pages) {
      app.pages.onView(blankId => { if (!applying) queue().view = blankId; });
    }

    channel.onmessage = ({ data: msg }) => {
      if (!msg || typeof msg.type !== 'string') return;
      try {
        remote(() => handle(msg));
      } catch (e) {
        console.warn('Marp Notes: ignored a sync message', e);
      }
    };

    function handle(msg) {
      switch (msg.type) {
        case 'strokes': doc.applyRemoteStrokes(msg.id, msg.strokes || []); break;
        case 'blanks': doc.applyRemoteBlanks(msg.blanks || [], msg.removed || []); break;
        case 'state': doc.applyRemoteState(msg.json, msg.dirty); break;
        case 'saved': doc.markSaved(); break;
        case 'view':
          if (!app.pages) break;
          if (msg.blank && doc.getPage(msg.blank)) app.pages.show(msg.blank);
          else app.pages.leave();
          break;
        case 'laser': {
          const surface = app.surfaces.get(msg.pageId);
          if (surface && Array.isArray(msg.pt)) render.laser(surface.layer).add(msg.pt);
          break;
        }
        case 'hello':
          // A window just opened: give it what we have.
          if (doc.toJSON().pages.length) post({ type: 'state', json: doc.toJSON(), dirty: doc.isDirty() });
          if (app.currentBlank) post({ type: 'view', blank: app.currentBlank.pageId });
          break;
        default:
      }
      app.refresh();
    }

    post({ type: 'hello' });

    return {
      key,
      laser(pageId, pt) { post({ type: 'laser', pageId, pt: [pt[0], pt[1]] }); },
      close() { channel.close(); },
    };
  }

  NS.sync = { install };
})(typeof window !== 'undefined' ? window : globalThis);
