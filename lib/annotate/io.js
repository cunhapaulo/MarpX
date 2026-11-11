/* Marp Notes - save / load, drag-and-drop, unsaved-changes guard, print to PDF
 *
 * Notes are saved as "<deck-title>-notes.json" (the model's JSON format).
 * For printing, every blank page becomes a real <svg data-marpit-svg> page
 * after its slide, so Marp's print CSS gives it its own PDF page.
 */
(function (root) {
  'use strict';

  const NS = root.MarpNotes = root.MarpNotes || {};
  const { render } = NS;

  (NS.toolbarGroups = NS.toolbarGroups || {}).file = app => ({
    id: 'file', label: 'File',
    items: [
      { id: 'save', title: 'Save notes as .json (Ctrl/Cmd+S)', icon: 'save', onClick: () => app.io.save() },
      { id: 'load', title: 'Load notes from .json (or drop a file on the window)', icon: 'load', onClick: () => app.io.pick() },
      { id: 'pdf', title: 'Export slides with notes as PDF (print → Save as PDF)', icon: 'pdf', onClick: () => app.io.exportPdf() },
    ],
  });

  function slug(title) {
    return (title || '').normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'slides';
  }

  // ── Banner (non-blocking messages) ─────────────────────────────

  function banner(message, kind = 'info') {
    const el = document.createElement('div');
    el.className = `ann-banner ann-banner-${kind}`;
    el.setAttribute('role', kind === 'info' ? 'status' : 'alert');
    const text = document.createElement('div');
    text.className = 'ann-banner-text';
    text.textContent = message;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ann-banner-close';
    close.setAttribute('aria-label', 'Dismiss');
    close.textContent = '×';
    close.addEventListener('click', () => el.remove());
    el.append(text, close);
    let stack = document.querySelector('.ann-banners');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'ann-banners';
      document.body.appendChild(stack);
    }
    stack.appendChild(el);
    if (kind === 'info') setTimeout(() => el.remove(), 4000);
    return el;
  }

  function install(app) {
    const { doc } = app;

    // ── Save ──

    function save() {
      const name = `${slug(doc.deck.title)}-notes.json`;
      const blob = new Blob([JSON.stringify(doc.toJSON(), null, 1)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      try {
        a.click();
      } catch (e) {
        banner(`Could not save ${name}: ${e.message}`, 'error');
        return null;
      } finally {
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
      doc.markSaved(); // only once the download was handed to the browser
      app.refresh();
      banner(`Saved ${name}`);
      return name;
    }

    // ── Load ──

    function loadText(text, name = 'file') {
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        banner(`Could not read ${name}: not valid JSON`, 'error');
        return null;
      }
      try {
        NS.model.checkFormat(data); // reject a wrong file before asking anything
      } catch (e) {
        banner(`Could not load ${name}: ${e.message}`, 'error');
        return null;
      }
      if (doc.isDirty() && !window.confirm('Loading replaces your unsaved notes. Continue?')) return null;
      if (app.pages) app.pages.leave();
      app.select(null);
      let res;
      try {
        res = doc.load(data);
      } catch (e) {
        banner(`Could not load ${name}: ${e.message}`, 'error');
        return null;
      }
      if (res.warnings.length) {
        banner(`Loaded ${name} with warnings:\n• ${res.warnings.join('\n• ')}`, 'warn');
      } else {
        banner(`Loaded ${name}`);
      }
      app.refresh();
      return res;
    }

    async function loadFile(file) {
      if (!file) return null;
      return loadText(await file.text(), file.name);
    }

    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.json,application/json';
    picker.className = 'ann-file-input';
    picker.hidden = true;
    picker.addEventListener('change', () => {
      const file = picker.files && picker.files[0];
      picker.value = '';
      loadFile(file);
    });
    document.body.appendChild(picker);

    // Drag-and-drop a notes file anywhere on the window.
    // Dragging an image out of the page also reports 'Files'; only react to
    // drags that start outside the window.
    let internalDrag = false;
    window.addEventListener('dragstart', () => { internalDrag = true; });
    window.addEventListener('dragend', () => { internalDrag = false; });
    const hasFiles = e => !internalDrag && e.dataTransfer &&
      Array.from(e.dataTransfer.types || []).includes('Files');
    let dragDepth = 0;
    window.addEventListener('dragenter', e => {
      if (!hasFiles(e)) return;
      dragDepth++;
      document.body.classList.add('ann-dropping');
    });
    window.addEventListener('dragleave', e => {
      if (!hasFiles(e)) return;
      if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('ann-dropping'); }
    });
    window.addEventListener('dragover', e => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    });
    window.addEventListener('drop', e => {
      if (!hasFiles(e)) { internalDrag = false; return; }
      e.preventDefault();
      dragDepth = 0;
      document.body.classList.remove('ann-dropping');
      const files = Array.from(e.dataTransfer.files || []);
      const file = files.find(f => /\.json$/i.test(f.name) || f.type === 'application/json');
      if (file) loadFile(file);
      else banner('Drop a .json notes file to load it', 'error');
    });

    // Unsaved changes: ask before leaving.
    window.addEventListener('beforeunload', e => {
      if (!doc.isDirty()) return;
      e.preventDefault();
      e.returnValue = '';
    });

    // ── Print / PDF ──

    let printNodes = null;
    let printUid = 0;

    function printPage(page) {
      const [w, h] = doc.deck.size;
      const svg = render.el('svg', {
        'data-marpit-svg': '', class: 'ann-print-page', viewBox: `0 0 ${w} ${h}`, 'data-page': page.id,
      });
      // An empty section keeps Marp's print rules (page break per section) in play;
      // the paper drawn after it covers whatever the theme paints there.
      const fo = render.el('foreignObject', { width: w, height: h }, svg);
      const section = document.createElement('section');
      section.className = 'ann-print-section';
      fo.appendChild(section);
      render.createPaper(svg, [w, h], `print${++printUid}`).set(page.paper);
      render.syncLayer(render.createLayer(svg), page.strokes);
      return svg;
    }

    function preparePrint() {
      restorePrint(); // a missed afterprint must not leave stale or doubled pages
      app.input.cancel();
      app.select(null);
      for (const surface of app.surfaces.values()) {
        render.laser(surface.layer).clear();
        render.setEraserCursor(surface.layer, null);
        render.syncLayer(surface.layer, doc.strokes(surface.pageId)); // every slide, visited or not
      }
      printNodes = [];
      for (const slide of app.slides) {
        let anchor = slide.svg;
        for (const id of doc.blanksAfter(slide.n)) {
          const node = printPage(doc.getPage(id));
          anchor.after(node);
          anchor = node;
          printNodes.push(node);
        }
      }
      document.body.classList.add('ann-printing');
    }

    function restorePrint() {
      if (!printNodes) return;
      printNodes.forEach(n => n.remove());
      printNodes = null;
      document.body.classList.remove('ann-printing');
    }

    window.addEventListener('beforeprint', preparePrint);
    window.addEventListener('afterprint', restorePrint);
    // Safari may skip afterprint; the print media query ending is the backup.
    if (window.matchMedia) {
      const mq = window.matchMedia('print');
      const onChange = e => { if (!e.matches) restorePrint(); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    app.keymap.push({
      test: e => (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key.toLowerCase() === 's' || e.code === 'KeyS'),
      run: () => { save(); },
    });

    return {
      save,
      pick() { picker.click(); },
      loadText,
      loadFile,
      preparePrint,
      restorePrint,
      exportPdf() { preparePrint(); window.print(); },
      filename: () => `${slug(doc.deck.title)}-notes.json`,
      banner,
    };
  }

  NS.io = { slug, banner, install };
})(typeof window !== 'undefined' ? window : globalThis);
