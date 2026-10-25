'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../lib/annotate/model.js');

const deck = { title: 'Test deck', slides: 5, size: [1280, 720] };
const stroke = (over = {}) => m.createStroke({
  tool: 'pen', color: '#000000', size: 4, points: [[0, 0, 0.5], [10, 10, 0.5]], ...over,
});

test('createStroke assigns unique ids and copies points', () => {
  const pts = [[1, 2, 0.5]];
  const a = m.createStroke({ tool: 'pen', color: '#000', size: 2, points: pts });
  const b = m.createStroke({ tool: 'pen', color: '#000', size: 2, points: pts });
  assert.notEqual(a.id, b.id);
  assert.notEqual(a.points, pts);
  assert.throws(() => m.createStroke({ tool: 'laser', color: '#f00', size: 1, points: pts }));
});

test('addStroke, undo, redo', () => {
  const doc = new m.NotesDoc(deck);
  const id = doc.slidePageId(2);
  const s = stroke();
  doc.addStroke(id, s);
  assert.equal(doc.strokes(id).length, 1);
  assert.ok(doc.history.canUndo());
  doc.undo();
  assert.equal(doc.strokes(id).length, 0);
  assert.ok(doc.history.canRedo());
  doc.redo();
  assert.equal(doc.strokes(id)[0], s);
});

test('a new command clears the redo stack', () => {
  const doc = new m.NotesDoc(deck);
  const id = doc.slidePageId(1);
  doc.addStroke(id, stroke());
  doc.undo();
  doc.addStroke(id, stroke());
  assert.ok(!doc.history.canRedo());
});

test('removeStrokes and clearPage are undoable and keep z-order', () => {
  const doc = new m.NotesDoc(deck);
  const id = doc.slidePageId(1);
  const [a, b, c] = [stroke(), stroke(), stroke()];
  [a, b, c].forEach(s => doc.addStroke(id, s));
  doc.removeStrokes(id, [b.id]);
  assert.deepEqual(doc.strokes(id), [a, c]);
  doc.undo();
  assert.deepEqual(doc.strokes(id), [a, b, c]);
  doc.clearPage(id);
  assert.equal(doc.strokes(id).length, 0);
  doc.undo();
  assert.deepEqual(doc.strokes(id), [a, b, c]);
});

test('clearPage on an empty page is a no-op (no history entry)', () => {
  const doc = new m.NotesDoc(deck);
  assert.equal(doc.clearPage(doc.slidePageId(1)), null);
  assert.ok(!doc.history.canUndo());
});

test('replaceStrokes models a partial erase as one command', () => {
  const doc = new m.NotesDoc(deck);
  const id = doc.slidePageId(1);
  const a = stroke();
  doc.addStroke(id, a);
  const pieces = [stroke({ points: [[0, 0, 0.5]] }), stroke({ points: [[10, 10, 0.5]] })];
  doc.replaceStrokes(id, pieces, 'partial-erase');
  assert.deepEqual(doc.strokes(id), pieces);
  doc.undo();
  assert.deepEqual(doc.strokes(id), [a]);
  doc.redo();
  assert.deepEqual(doc.strokes(id), pieces);
});

test('moveStrokes translates only the selected strokes, keeps ids', () => {
  const doc = new m.NotesDoc(deck);
  const id = doc.slidePageId(1);
  const a = stroke(), b = stroke();
  doc.addStroke(id, a); doc.addStroke(id, b);
  doc.moveStrokes(id, [a.id], 5, -5);
  const [a2, b2] = doc.strokes(id);
  assert.equal(a2.id, a.id);
  assert.deepEqual(a2.points[0], [5, -5, 0.5]);
  assert.equal(b2, b);
  assert.deepEqual(a.points[0], [0, 0, 0.5], 'original is not mutated');
  doc.undo();
  assert.equal(doc.strokes(id)[0], a);
});

test('restyleStrokes recolors / resizes the selection', () => {
  const doc = new m.NotesDoc(deck);
  const id = doc.slidePageId(1);
  const a = stroke();
  doc.addStroke(id, a);
  doc.restyleStrokes(id, [a.id], { color: '#be1e3c' });
  assert.equal(doc.strokes(id)[0].color, '#be1e3c');
  doc.restyleStrokes(id, [a.id], { size: () => 12 });
  assert.equal(doc.strokes(id)[0].size, 12);
  doc.undo(); doc.undo();
  assert.equal(doc.strokes(id)[0], a);
});

test('change listeners fire with the page id', () => {
  const doc = new m.NotesDoc(deck);
  const seen = [];
  doc.onChange(pid => seen.push(pid));
  const id = doc.slidePageId(3);
  doc.addStroke(id, stroke());
  doc.undo();
  assert.deepEqual(seen, [id, id]);
});

test('dirty tracking follows the history position', () => {
  const doc = new m.NotesDoc(deck);
  assert.ok(!doc.isDirty());
  doc.addStroke(doc.slidePageId(1), stroke());
  assert.ok(doc.isDirty());
  doc.markSaved();
  assert.ok(!doc.isDirty());
  doc.undo();
  assert.ok(doc.isDirty());
  doc.redo();
  assert.ok(!doc.isDirty());
});

test('history is capped', () => {
  const h = new m.History(3);
  let n = 0;
  for (let i = 0; i < 5; i++) h.execute({ do: () => n++, undo: () => n-- });
  let undos = 0;
  while (h.canUndo()) { h.undo(); undos++; }
  assert.equal(undos, 3);
  assert.equal(n, 2);
});

test('serialization round-trip keeps strokes and omits empty pages', () => {
  const doc = new m.NotesDoc(deck);
  doc.addStroke(doc.slidePageId(2), stroke({ color: '#1e64c8', points: [[1.23456, 2.34567, 0.123456]] }));
  doc.addStroke(doc.slidePageId(4), stroke({ tool: 'highlighter', size: 20 }));
  doc.slidePageId(3); // touched but empty
  const json = JSON.parse(JSON.stringify(doc.toJSON()));
  assert.equal(json.format, 'marp-notes');
  assert.equal(json.version, 1);
  assert.deepEqual(json.deck, deck);
  assert.deepEqual(json.pages.map(p => p.id), ['s2', 's4']);
  assert.deepEqual(json.pages[0].strokes[0].points[0], [1.23, 2.35, 0.123]);

  const doc2 = new m.NotesDoc(deck);
  const res = doc2.load(json);
  assert.deepEqual(res.warnings, []);
  assert.equal(doc2.strokes('s2')[0].color, '#1e64c8');
  assert.equal(doc2.strokes('s4')[0].tool, 'highlighter');
  assert.ok(!doc2.history.canUndo());
  assert.ok(!doc2.isDirty());
});

test('load keeps blank pages', () => {
  const doc = new m.NotesDoc(deck);
  doc.load({
    format: 'marp-notes', version: 1, deck,
    pages: [{ id: 'b1', kind: 'blank', after: 3, paper: 'grid', strokes: [] }],
  });
  const out = doc.toJSON();
  assert.deepEqual(out.pages, [{ id: 'b1', kind: 'blank', after: 3, paper: 'grid', strokes: [] }]);
});

test('load rejects foreign formats and newer versions', () => {
  const doc = new m.NotesDoc(deck);
  assert.throws(() => doc.load({ format: 'other', version: 1, pages: [] }), /format/);
  assert.throws(() => doc.load({ format: 'marp-notes', version: 99, pages: [] }), /version/);
  assert.throws(() => doc.load(null), /format/);
});

test('load warns on a different deck but keeps matching slides', () => {
  const doc = new m.NotesDoc(deck);
  const res = doc.load({
    format: 'marp-notes', version: 1,
    deck: { title: 'Other', slides: 3, size: [1280, 720] },
    pages: [
      { id: 's2', kind: 'slide', slide: 2, strokes: [{ id: 'x', tool: 'pen', color: '#000', size: 4, points: [[0, 0, 0.5]] }] },
      { id: 's9', kind: 'slide', slide: 9, strokes: [{ id: 'y', tool: 'pen', color: '#000', size: 4, points: [[0, 0, 0.5]] }] },
    ],
  });
  assert.ok(res.warnings.length >= 2);
  assert.equal(doc.strokes('s2').length, 1);
  assert.equal(doc.strokes('s9').length, 0);
});

test('load skips malformed strokes with a warning', () => {
  const doc = new m.NotesDoc(deck);
  const res = doc.load({
    format: 'marp-notes', version: 1, deck,
    pages: [{ id: 's1', kind: 'slide', slide: 1, strokes: [{ tool: 'pen', points: 'nope' }] }],
  });
  assert.equal(doc.strokes('s1').length, 0);
  assert.ok(res.warnings.length === 1);
});

// ── Blank pages ──────────────────────────────────────────────────

test('insertBlankPage after a slide or a blank page; sequence order', () => {
  const doc = new m.NotesDoc(deck);
  const b1 = doc.insertBlankPage('s3', 'grid').pageId;
  assert.deepEqual(doc.getPage(b1), { id: b1, kind: 'blank', after: 3, paper: 'grid', strokes: [] });
  assert.deepEqual(doc.sequence(), ['s1', 's2', 's3', b1, 's4', 's5']);
  const b2 = doc.insertBlankPage(b1, 'lined').pageId;
  const b0 = doc.insertBlankPage('s3', 'plain').pageId;
  assert.deepEqual(doc.sequence(), ['s1', 's2', 's3', b0, b1, b2, 's4', 's5']);
  assert.deepEqual(doc.blanksAfter(3), [b0, b1, b2]);
  assert.equal(new Set([b0, b1, b2]).size, 3);
});

test('position and neighbor follow slide -> its blank pages -> next slide', () => {
  const doc = new m.NotesDoc(deck);
  const a = doc.insertBlankPage('s3', 'plain').pageId;
  const b = doc.insertBlankPage(a, 'plain').pageId;
  assert.deepEqual(doc.position('s3'), { slide: 3, index: 1, count: 3 });
  assert.deepEqual(doc.position(b), { slide: 3, index: 3, count: 3 });
  assert.deepEqual(doc.position('s1'), { slide: 1, index: 1, count: 1 });
  assert.equal(doc.neighbor('s3', 1), a);
  assert.equal(doc.neighbor(b, 1), 's4');
  assert.equal(doc.neighbor('s4', -1), b);
  assert.equal(doc.neighbor(a, -1), 's3');
  assert.equal(doc.neighbor('s1', -1), null);
  assert.equal(doc.neighbor('s5', 1), null);
  assert.equal(doc.ownerSlide(b), 3);
  assert.equal(doc.ownerSlide('s4'), 4);
});

test('insert, delete and paper switch are undoable', () => {
  const doc = new m.NotesDoc(deck);
  const id = doc.insertBlankPage('s2', 'plain').pageId;
  doc.addStroke(id, stroke());
  const other = doc.insertBlankPage(id, 'plain').pageId;
  doc.setPaper(id, 'grid');
  assert.equal(doc.getPage(id).paper, 'grid');
  doc.undo();
  assert.equal(doc.getPage(id).paper, 'plain');
  doc.redo();
  doc.deletePage(id);
  assert.equal(doc.getPage(id), null);
  assert.deepEqual(doc.sequence().slice(1, 3), ['s2', other]);
  doc.undo();
  assert.deepEqual(doc.sequence().slice(1, 4), ['s2', id, other]);
  assert.equal(doc.strokes(id).length, 1);
  doc.undo(); doc.undo(); doc.undo(); // paper, insert other, stroke
  doc.undo(); // insert id
  assert.equal(doc.getPage(id), null);
  assert.deepEqual(doc.sequence(), ['s1', 's2', 's3', 's4', 's5']);
  doc.redo();
  assert.equal(doc.getPage(id).kind, 'blank');
});

test('slide pages cannot be deleted; setPaper to the same paper is a no-op', () => {
  const doc = new m.NotesDoc(deck);
  assert.equal(doc.deletePage(doc.slidePageId(1)), null);
  const id = doc.insertBlankPage('s1', 'lined').pageId;
  assert.equal(doc.setPaper(id, 'lined'), null);
  assert.throws(() => doc.setPaper(id, 'dots'), /paper/);
});

test('page operations notify listeners with kind "pages"', () => {
  const doc = new m.NotesDoc(deck);
  const seen = [];
  doc.onChange((id, kind) => seen.push(kind));
  const id = doc.insertBlankPage('s1', 'plain').pageId;
  doc.deletePage(id);
  assert.deepEqual(seen, ['pages', 'pages']);
});

test('serialization keeps blank pages in sequence order and reload keeps ids unique', () => {
  const doc = new m.NotesDoc(deck);
  const a = doc.insertBlankPage('s4', 'grid').pageId;
  const b = doc.insertBlankPage('s2', 'lined').pageId;
  const c = doc.insertBlankPage(b, 'plain').pageId;
  doc.addStroke(c, stroke({ color: '#7a3c96' }));
  doc.addStroke(doc.slidePageId(4), stroke());
  const json = JSON.parse(JSON.stringify(doc.toJSON()));
  assert.deepEqual(json.pages.map(p => p.id), [b, c, 's4', a]);
  assert.deepEqual(json.pages[0], { id: b, kind: 'blank', after: 2, paper: 'lined', strokes: [] });

  const doc2 = new m.NotesDoc(deck);
  assert.deepEqual(doc2.load(json).warnings, []);
  assert.deepEqual(doc2.sequence(), ['s1', 's2', b, c, 's3', 's4', a, 's5']);
  assert.equal(doc2.strokes(c)[0].color, '#7a3c96');
  const d = doc2.insertBlankPage('s1', 'plain').pageId;
  assert.ok(![a, b, c].includes(d));
  assert.deepEqual(JSON.parse(JSON.stringify(doc2.toJSON())).pages.slice(1), json.pages);
});

test('load skips blank pages after missing slides and duplicate ids', () => {
  const doc = new m.NotesDoc(deck);
  const res = doc.load({
    format: 'marp-notes', version: 1, deck,
    pages: [
      { id: 'b1', kind: 'blank', after: 9, paper: 'grid', strokes: [] },
      { id: 'b2', kind: 'blank', after: 1, paper: 'nope', strokes: [] },
      { id: 'b2', kind: 'blank', after: 2, paper: 'plain', strokes: [] },
    ],
  });
  assert.deepEqual(doc.sequence(), ['s1', 'b2', 's2', 's3', 's4', 's5']);
  assert.equal(doc.getPage('b2').paper, 'plain', 'unknown paper falls back to plain');
  assert.equal(res.warnings.length, 2);
});

test('after load every slide page exists, even without notes in the file', () => {
  const doc = new m.NotesDoc(deck);
  doc.load({ format: 'marp-notes', version: 1, deck, pages: [] });
  doc.addStroke('s5', stroke());
  assert.equal(doc.strokes('s5').length, 1);
});

// ── Review fixes ────────────────────────────────────────────────

test('load of a file with notes on slides 2 and 4 only, then drawing on slide 3', () => {
  const doc = new m.NotesDoc(deck);
  const pen = (id) => ({ id, tool: 'pen', color: '#000', size: 4, points: [[0, 0, 0.5]] });
  doc.load({
    format: 'marp-notes', version: 1, deck,
    pages: [
      { id: 's2', kind: 'slide', slide: 2, strokes: [pen('a')] },
      { id: 's4', kind: 'slide', slide: 4, strokes: [pen('b')] },
    ],
  });
  doc.addStroke('s3', stroke());
  assert.equal(doc.strokes('s3').length, 1);
});

test('slide pages never touched before are created on demand', () => {
  const doc = new m.NotesDoc(deck);
  assert.deepEqual(doc.strokes('s4'), []);
  doc.addStroke('s4', stroke());
  assert.equal(doc.strokes('s4').length, 1);
  assert.throws(() => doc.addStroke('b9', stroke()), /No page/);
});

test('createStroke rejects non-finite coordinates', () => {
  for (const bad of [[[NaN, 0, 0.5]], [[0, Infinity, 0.5]], [['x', 0, 0.5]], [[0, 0, NaN]], [[0]]]) {
    assert.throws(() => m.createStroke({ tool: 'pen', color: '#000', size: 2, points: bad }), /finite/);
  }
});

test('load skips strokes with non-finite points', () => {
  const doc = new m.NotesDoc(deck);
  const res = doc.load({
    format: 'marp-notes', version: 1, deck,
    pages: [{ id: 's1', kind: 'slide', slide: 1, strokes: [
      { tool: 'pen', color: '#000', size: 2, points: [[0, null, 0.5]] },
      { tool: 'pen', color: '#000', size: 2, points: [[1, 1, 0.5]] },
    ] }],
  });
  assert.equal(doc.strokes('s1').length, 1);
  assert.equal(res.warnings.length, 1);
});

test('duplicate stroke ids in a file get fresh ids', () => {
  const doc = new m.NotesDoc(deck);
  const s = { id: 'dup', tool: 'pen', color: '#000', size: 2, points: [[1, 1, 0.5]] };
  doc.load({
    format: 'marp-notes', version: 1, deck,
    pages: [
      { id: 's1', kind: 'slide', slide: 1, strokes: [s, s] },
      { id: 's2', kind: 'slide', slide: 2, strokes: [s] },
    ],
  });
  const ids = [...doc.strokes('s1'), ...doc.strokes('s2')].map(k => k.id);
  assert.equal(ids.length, 3);
  assert.equal(new Set(ids).size, 3);
  assert.equal(ids[0], 'dup');
});

// ── Cross-window sync support ───────────────────────────────────

test('remote stroke updates apply without touching local history but mark dirty', () => {
  const doc = new m.NotesDoc(deck);
  const seen = [];
  doc.onChange((id, kind) => seen.push([id, kind]));
  assert.equal(doc.applyRemoteStrokes('s2', [stroke()]), true);
  assert.equal(doc.strokes('s2').length, 1);
  assert.ok(!doc.history.canUndo());
  assert.ok(doc.isDirty());
  assert.deepEqual(seen, [['s2', 'strokes']]);
  assert.equal(doc.applyRemoteStrokes('b7', [stroke()]), false, 'unknown blank page is ignored');
  assert.throws(() => doc.applyRemoteStrokes('s1', [{ tool: 'pen', points: [[NaN]] }]));
  doc.markSaved();
  assert.ok(!doc.isDirty());
});

test('remote blank-page list upserts pages and removes only the explicitly deleted ones', () => {
  const doc = new m.NotesDoc(deck);
  const own = doc.insertBlankPage('s1', 'plain').pageId;
  doc.applyRemoteBlanks([{ id: 'r1', after: 2, paper: 'grid' }]);
  assert.deepEqual(doc.sequence(), ['s1', own, 's2', 'r1', 's3', 's4', 's5'], 'local page the peer has not seen is kept');
  doc.applyRemoteBlanks([{ id: 'r1', after: 2, paper: 'lined' }, { id: own, after: 1, paper: 'grid' }]);
  assert.equal(doc.getPage(own).paper, 'grid');
  assert.equal(doc.getPage('r1').paper, 'lined');
  doc.applyRemoteBlanks([{ id: 'r1', after: 2, paper: 'lined' }], [own]);
  assert.equal(doc.getPage(own), null);
  doc.undo(); // undoing the local insert of a page the peer already removed is harmless
  assert.deepEqual(doc.sequence(), ['s1', 's2', 'r1', 's3', 's4', 's5']);
  assert.deepEqual(doc.blankMeta(), [{ id: 'r1', after: 2, paper: 'lined' }]);
});

test('remote full state replaces content and resets local history', () => {
  const a = new m.NotesDoc(deck);
  const b1 = a.insertBlankPage('s3', 'grid').pageId;
  a.addStroke(b1, stroke());
  a.addStroke('s1', stroke());
  const b = new m.NotesDoc(deck);
  b.addStroke('s5', stroke());
  b.applyRemoteState(JSON.parse(JSON.stringify(a.toJSON())), false);
  assert.deepEqual(b.sequence(), a.sequence());
  assert.equal(b.strokes(b1).length, 1);
  assert.equal(b.strokes('s5').length, 0);
  assert.ok(!b.history.canUndo(), 'old commands refer to replaced content');
  assert.ok(!b.isDirty());
});

test('markSaved notifies listeners with kind "saved"', () => {
  const doc = new m.NotesDoc(deck);
  const seen = [];
  doc.onChange((id, kind) => seen.push(kind));
  doc.markSaved();
  assert.deepEqual(seen, ['saved']);
});

// ── Delta commands and two windows ──────────────────────────────

/** Two docs wired like sync.js: every local change sends the page snapshot. */
function pair() {
  const a = new m.NotesDoc(deck), b = new m.NotesDoc(deck);
  const wire = (from, to) => from.onChange((id, kind) => {
    if (from.applying) return;
    to.applying = true;
    try {
      if (kind === 'pages') to.applyRemoteBlanks(from.blankMeta(), id && !from.getPage(id) ? [id] : []);
      if (id && from.getPage(id)) to.applyRemoteStrokes(id, from.strokes(id));
    } finally { to.applying = false; }
  });
  wire(a, b); wire(b, a);
  return [a, b];
}
const ids = (doc, page) => doc.strokes(page).map(s => s.id);

test('undo in one window never removes strokes the other window added', () => {
  const [a, b] = pair();
  const s1 = stroke(), s2 = stroke(), s3 = stroke();
  a.addStroke('s1', s1);
  b.addStroke('s1', s2);
  a.addStroke('s1', s3);
  assert.deepEqual(ids(b, 's1'), [s1.id, s2.id, s3.id]);
  a.undo(); // removes s3 only
  a.undo(); // removes s1 only
  assert.deepEqual(ids(a, 's1'), [s2.id]);
  assert.deepEqual(ids(b, 's1'), [s2.id]);
  a.redo();
  assert.deepEqual(ids(b, 's1'), [s1.id, s2.id]);
});

test('erase/clear undo restores strokes at their z-index without dropping peer strokes', () => {
  const [a, b] = pair();
  const s1 = stroke(), s2 = stroke(), s3 = stroke(), late = stroke();
  [s1, s2, s3].forEach(s => a.addStroke('s2', s));
  a.removeStrokes('s2', [s2.id]);
  b.addStroke('s2', late);
  a.undo();
  assert.deepEqual(ids(a, 's2'), [s1.id, s2.id, s3.id, late.id]);
  a.clearPage('s2');
  assert.deepEqual(ids(b, 's2'), []);
  a.undo();
  assert.deepEqual(ids(b, 's2'), [s1.id, s2.id, s3.id, late.id]);
});

test('partial erase pieces take the place of their stroke; undo swaps them back', () => {
  const doc = new m.NotesDoc(deck);
  const s1 = stroke(), s2 = stroke(), s3 = stroke();
  [s1, s2, s3].forEach(s => doc.addStroke('s1', s));
  const p1 = stroke(), p2 = stroke();
  doc.replaceStrokes('s1', [s1, p1, p2, s3], 'partial-erase');
  assert.deepEqual(ids(doc, 's1'), [s1.id, p1.id, p2.id, s3.id]);
  const extra = stroke();
  doc.applyRemoteStrokes('s1', [...doc.strokes('s1'), extra]);
  doc.undo();
  assert.deepEqual(ids(doc, 's1'), [s1.id, s2.id, s3.id, extra.id]);
});

test('move / restyle undo replaces only the affected strokes', () => {
  const [a, b] = pair();
  const s1 = stroke(), s2 = stroke();
  a.addStroke('s1', s1);
  a.moveStrokes('s1', [s1.id], 10, 0);
  b.addStroke('s1', s2);
  b.restyleStrokes('s1', [s2.id], { color: '#ff0000' });
  a.undo(); // move back
  assert.deepEqual(b.strokes('s1')[0].points[0], [0, 0, 0.5]);
  assert.equal(b.strokes('s1')[1].color, '#ff0000');
});

test('undo of a stroke on a blank page the peer deleted does not throw', () => {
  const [a, b] = pair();
  const id = a.insertBlankPage('s1', 'plain').pageId;
  a.addStroke(id, stroke());
  b.deletePage(id);
  assert.equal(a.getPage(id), null);
  assert.doesNotThrow(() => a.undo());
  assert.equal(a.getPage(id), null);
});

test('a failing command is dropped instead of moving to the other stack', () => {
  const h = new m.History();
  let ok = true;
  h.execute({ do: () => {}, undo: () => { if (!ok) throw new Error('boom'); } });
  ok = false;
  assert.equal(h.undo(), null);
  assert.ok(!h.canUndo() && !h.canRedo());
});

test('blank page ids differ between documents (windows)', () => {
  const a = new m.NotesDoc(deck), b = new m.NotesDoc(deck);
  assert.notEqual(a.insertBlankPage('s1').pageId, b.insertBlankPage('s1').pageId);
});

test('load requires integer slide numbers, warns on duplicate slides, resets remote dirt', () => {
  const doc = new m.NotesDoc(deck);
  doc.applyRemoteStrokes('s1', [stroke()]);
  const pen = id => ({ id, tool: 'pen', color: '#000', size: 2, points: [[1, 1, 0.5]] });
  const res = doc.load({
    format: 'marp-notes', version: 1, deck,
    pages: [
      { id: 's2', kind: 'slide', slide: 2.5, strokes: [pen('a')] },
      { id: 'b1', kind: 'blank', after: 1.5, paper: 'plain', strokes: [] },
      { id: 's3', kind: 'slide', slide: 3, strokes: [pen('b')] },
      { id: 's3', kind: 'slide', slide: 3, strokes: [pen('c')] },
    ],
  });
  assert.equal(doc.sequence().length, 5);
  assert.deepEqual(doc.strokes('s3').map(s => s.id), ['b']);
  assert.equal(res.warnings.length, 3);
  assert.ok(!doc.isDirty());
});

test('checkFormat is exported for validating a file before replacing notes', () => {
  assert.throws(() => m.checkFormat({ format: 'x' }), /format/);
  assert.doesNotThrow(() => m.checkFormat({ format: 'marp-notes', version: 1 }));
});
