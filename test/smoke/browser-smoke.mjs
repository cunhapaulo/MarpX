/**
 * Browser smoke test for the note-taker (headless system Chrome via puppeteer-core).
 * Opt-in because it starts Chrome:  cd test && npm install && npm run smoke
 * (or SMOKE=1 node --test test/smoke/browser-smoke.mjs). Screenshots go to test/screenshots/.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const shots = path.join(repo, 'test', 'screenshots');
// Built from examples/template.md next to it (so its images resolve) under a
// throwaway name; the committed examples/html/template.html is left alone.
const deck = path.join(repo, 'examples', '.notes-smoke.html');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const enabled = process.env.SMOKE === '1';

test('note-taker smoke test in headless Chrome', { skip: !enabled && 'set SMOKE=1 (npm run smoke)', timeout: 120000 }, async (t) => {
  const { default: puppeteer } = await import('puppeteer-core');

  execFileSync('marp', ['--no-stdin', 'examples/template.md', '--theme-set', 'themes', '--html',
    '--bespoke.transition=false',
    '-o', deck], { cwd: repo, stdio: 'ignore' });
  execFileSync('node', ['.cmd/inject-annotator.mjs', deck], { cwd: repo, stdio: 'ignore' });
  fs.mkdirSync(shots, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-extensions'],
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(deck).href, { waitUntil: 'load' });
    await page.waitForFunction(() => window.MarpNotes && window.MarpNotes.app);
    const cdp = await page.createCDPSession();

    // ── helpers ──
    const state = () => page.evaluate(() => {
      const app = window.MarpNotes.app;
      const s = app.activeSlide();
      return {
        enabled: app.enabled, tool: app.tool,
        strokes: app.doc.strokes(s.pageId).map(k => ({ id: k.id, tool: k.tool, color: k.color, size: k.size, points: k.points })),
        undo: app.doc.history.undoStack.length, redo: app.doc.history.redoStack.length,
        selection: app.selection ? app.selection.ids.slice() : null,
        dom: { pen: s.layer.pen.children.length, hl: s.layer.hl.children.length },
      };
    });
    const toClient = (pts) => page.evaluate((pts) => {
      const svg = window.MarpNotes.app.activeSlide().svg;
      const m = svg.getScreenCTM();
      return pts.map(([x, y]) => { const p = new DOMPoint(x, y).matrixTransform(m); return [p.x, p.y]; });
    }, pts);
    const pressBtn = (id) => page.click(`.ann-btn[data-id="${id}"]`);
    const key = async (k, mods = []) => {
      for (const m of mods) await page.keyboard.down(m);
      await page.keyboard.press(k);
      for (const m of mods.slice().reverse()) await page.keyboard.up(m);
    };
    /** Drag through slide-space points with a mouse or pen (CDP real input). */
    async function drag(pts, { pointerType = 'mouse', pressures = null, shift = false } = {}) {
      const client = await toClient(pts);
      const modifiers = shift ? 8 : 0;
      const base = { pointerType, modifiers, button: 'left' };
      const force = i => (pressures ? pressures[Math.min(i, pressures.length - 1)] : 0.5);
      await cdp.send('Input.dispatchMouseEvent', { ...base, type: 'mouseMoved', x: client[0][0], y: client[0][1], buttons: 0, button: 'none' });
      await cdp.send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed', x: client[0][0], y: client[0][1], buttons: 1, clickCount: 1, force: force(0) });
      for (let i = 1; i < client.length; i++) {
        await cdp.send('Input.dispatchMouseEvent', { ...base, type: 'mouseMoved', x: client[i][0], y: client[i][1], buttons: 1, force: force(i) });
      }
      const last = client[client.length - 1];
      await cdp.send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased', x: last[0], y: last[1], buttons: 0, clickCount: 1, force: 0 });
    }
    async function touchDrag(pts) {
      const client = await toClient(pts);
      const tp = ([x, y]) => [{ x, y, id: 7, radiusX: 10, radiusY: 10, force: 1 }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(client[0]) });
      for (const c of client.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(c) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    const line = (x0, y0, x1, y1, n = 12) =>
      Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
    const wave = (x0, y0, w, amp, n = 30) =>
      Array.from({ length: n + 1 }, (_, i) => [x0 + (w * i) / n, y0 + amp * Math.sin((i / n) * Math.PI * 3)]);

    await t.test('collapsed by default: one toggle, deck untouched', async () => {
      const r = await page.evaluate(() => {
        const bar = document.querySelector('.ann-bar');
        const visible = [...bar.querySelectorAll('.ann-btn')].filter(b => b.offsetParent !== null);
        return { on: document.body.classList.contains('ann-on'), visible: visible.map(b => b.dataset.id),
          top: getComputedStyle(document.querySelector('.bespoke-marp-parent')).top,
          layers: document.querySelectorAll('svg[data-marpit-svg] > g.ann-layer').length,
          slides: document.querySelectorAll('svg[data-marpit-svg]').length,
          hitPE: getComputedStyle(document.querySelector('.ann-hit')).pointerEvents };
      });
      assert.equal(r.on, false);
      assert.deepEqual(r.visible, ['toggle', 'overview'], 'annotate toggle and the slide overview');
      assert.equal(r.top, '0px');
      assert.equal(r.layers, r.slides);
      assert.equal(r.hitPE, 'none');
      await page.screenshot({ path: path.join(shots, '01-collapsed.png') });
    });

    await t.test('A expands the full toolbar and offsets the slide', async () => {
      await key('ArrowRight'); // a content slide
      await key('a');
      const r = await page.evaluate(() => {
        const bar = document.querySelector('.ann-bar');
        const btns = [...bar.querySelectorAll('.ann-btn:not([data-id="overview"])')]; // overview: only while off
        const br = bar.getBoundingClientRect();
        const slide = window.MarpNotes.app.activeSlide().svg.getBoundingClientRect();
        return {
          on: document.body.classList.contains('ann-on'),
          count: btns.length,
          allVisible: btns.every(b => { const r = b.getBoundingClientRect(); return r.width >= 36 && r.height >= 36 && r.right <= innerWidth && r.bottom <= innerHeight; }),
          swatches: bar.querySelectorAll('.ann-swatch').length,
          sizes: bar.querySelectorAll('.ann-size').length,
          groups: [...bar.querySelectorAll('.ann-group')].map(g => g.className.replace('ann-group ', '')),
          barBottom: br.bottom, slideTop: slide.top,
          activePen: bar.querySelector('[data-id="pen"]').classList.contains('is-active'),
          selects: bar.querySelectorAll('select, [aria-haspopup], details').length,
        };
      });
      assert.ok(r.on);
      assert.ok(r.count >= 31, `buttons: ${r.count}`);
      assert.ok(r.allVisible, 'every button visible and >= 36px');
      assert.ok(r.swatches >= 8);
      assert.equal(r.sizes, 4);
      assert.equal(r.selects, 0, 'no dropdowns or popovers');
      assert.ok(r.slideTop >= r.barBottom - 0.5, `slide ${r.slideTop} under bar ${r.barBottom}`);
      assert.ok(r.activePen);
      // previous/next page sit at the two ends of the bar
      assert.deepEqual(r.groups.map(g => g.split(' ').find(c => /^ann-(group|edge)-/.test(c))), ['ann-edge-start',
        'ann-group-mode', 'ann-group-tools', 'ann-group-colors',
        'ann-group-sizes', 'ann-group-history', 'ann-group-pages', 'ann-group-file', 'ann-edge-end']);
    });

    await t.test('narrow window: the bar wraps, stays fully visible and never covers the slide', async () => {
      for (const width of [1280, 820]) {
        await page.setViewport({ width, height: 800, deviceScaleFactor: 1 });
        await new Promise(r => setTimeout(r, 100));
        const r = await page.evaluate(() => {
          const bar = document.querySelector('.ann-bar');
          const btns = [...bar.querySelectorAll('.ann-btn:not([data-id="overview"])')];
          return {
            allVisible: btns.every(b => { const q = b.getBoundingClientRect(); return q.width >= 36 && q.left >= 0 && q.right <= innerWidth; }),
            barBottom: bar.getBoundingClientRect().bottom,
            slideTop: window.MarpNotes.app.activeSlide().svg.getBoundingClientRect().top,
          };
        });
        assert.ok(r.allVisible, `all buttons visible at ${width}px`);
        assert.ok(r.slideTop >= r.barBottom - 0.5, `slide under bar at ${width}px`);
        if (width === 820) await page.screenshot({ path: path.join(shots, '06-narrow.png') });
      }
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
      await new Promise(r => setTimeout(r, 100));
    });

    await t.test('pen with pressure draws a variable-width filled stroke', async () => {
      await key('p');
      await pressBtn('color-black');
      const pts = wave(200, 300, 400, 40, 30);
      const pressures = pts.map((_, i) => 0.15 + 0.85 * Math.sin((i / pts.length) * Math.PI));
      await drag(pts, { pointerType: 'pen', pressures });
      const s = await state();
      assert.equal(s.strokes.length, 1);
      const k = s.strokes[0];
      assert.equal(k.tool, 'pen');
      assert.equal(k.color, '#000000');
      const ps = k.points.map(p => p[2]);
      assert.ok(Math.max(...ps) - Math.min(...ps) > 0.3, `pressure range ${Math.min(...ps)}..${Math.max(...ps)}`);
      assert.equal(s.dom.pen, 1);
      // pens report pressure 0 on release: the end must not turn into a blob
      assert.ok(ps[ps.length - 1] < 0.4, `end pressure ${ps[ps.length - 1]}`);
      const d = await page.evaluate(() => window.MarpNotes.app.activeSlide().layer.pen.firstChild.getAttribute('d'));
      assert.match(d, /^M.* Z$/);
    });

    await t.test('mouse pen is constant width; Shift draws a straight line', async () => {
      await pressBtn('color-red');
      await drag(wave(200, 420, 400, 25, 20));
      await drag(line(200, 520, 640, 470, 15), { shift: true });
      const s = await state();
      assert.equal(s.strokes.length, 3);
      assert.ok(s.strokes[1].points.every(p => p[2] === 0.5));
      assert.equal(s.strokes[1].color, '#be1e3c');
      assert.equal(s.strokes[2].points.length, 2);
    });

    await t.test('highlighter is wide, translucent, multiply and below the pen', async () => {
      await key('h');
      await pressBtn('color-yellow');
      await pressBtn('size-2');
      await drag(line(180, 300, 640, 300, 20));
      const s = await state();
      const hl = s.strokes[3];
      assert.equal(hl.tool, 'highlighter');
      assert.equal(hl.color, '#ffd200');
      assert.equal(hl.size, 32);
      const css = await page.evaluate(() => {
        const n = window.MarpNotes.app.activeSlide().layer.hl.firstChild;
        const cs = getComputedStyle(n);
        const layer = n.parentNode.parentNode;
        return { opacity: cs.opacity, blend: cs.mixBlendMode,
          below: [...layer.children].indexOf(n.parentNode) < [...layer.children].indexOf(layer.querySelector('.ann-pen')) };
      });
      assert.equal(css.opacity, '0.35');
      assert.equal(css.blend, 'multiply');
      assert.ok(css.below);
    });

    await t.test('per-tool color and size are remembered', async () => {
      await key('p');
      let r = await page.evaluate(() => ({ c: window.MarpNotes.app.currentColor(), s: window.MarpNotes.app.currentSize() }));
      assert.equal(r.c, '#be1e3c');
      assert.equal(r.s, 1);
      await key('h');
      r = await page.evaluate(() => ({ c: window.MarpNotes.app.currentColor(), s: window.MarpNotes.app.currentSize() }));
      assert.equal(r.c, '#ffd200');
      assert.equal(r.s, 2);
      await key('3'); // size via keyboard: L stays L
      r = await page.evaluate(() => window.MarpNotes.app.currentSize());
      assert.equal(r, 2);
      await key('p');
    });

    await t.test('shortcuts use the physical key; holding A does not flicker', async () => {
      const r = await page.evaluate(() => {
        const fire = init => window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
        const app = window.MarpNotes.app;
        fire({ key: 'р', code: 'KeyH' }); // Cyrillic layout, physical H
        const tool = app.tool;
        fire({ key: 'a', code: 'KeyA', repeat: true });
        const stillOn = app.enabled;
        fire({ key: 'p', code: 'KeyP' });
        return { tool, stillOn, back: app.tool };
      });
      assert.equal(r.tool, 'highlighter');
      assert.equal(r.stillOn, true);
      assert.equal(r.back, 'pen');
    });

    await t.test('undo / redo via keyboard and buttons', async () => {
      const before = (await state()).strokes.length;
      await key('z', ['Control']);
      assert.equal((await state()).strokes.length, before - 1);
      await key('z', ['Control', 'Shift']);
      assert.equal((await state()).strokes.length, before);
      await pressBtn('undo');
      assert.equal((await state()).strokes.length, before - 1);
      await pressBtn('redo');
      const s = await state();
      assert.equal(s.strokes.length, before);
      assert.equal(s.dom.pen + s.dom.hl, before);
    });

    await t.test('stroke eraser removes touched strokes as one undo step', async () => {
      const s0 = await state();
      await key('e');
      await pressBtn('size-0');
      await drag(line(645, 530, 630, 460, 6)); // crosses the straight line end only
      const s1 = await state();
      assert.equal(s1.strokes.length, s0.strokes.length - 1);
      assert.ok(!s1.strokes.some(k => k.id === s0.strokes[2].id), 'straight line erased');
      assert.equal(s1.undo, s0.undo + 1);
      await key('z', ['Control']);
      assert.equal((await state()).strokes.length, s0.strokes.length);
    });

    await t.test('partial eraser splits a stroke into pieces', async () => {
      await key('p');
      await drag(line(700, 200, 1100, 200, 20));
      const s0 = await state();
      const target = s0.strokes[s0.strokes.length - 1];
      await key('E', ['Shift']);
      assert.equal((await state()).tool, 'partial');
      await drag(line(900, 150, 900, 250, 8));
      const s1 = await state();
      assert.equal(s1.strokes.length, s0.strokes.length + 1);
      assert.ok(!s1.strokes.some(k => k.id === target.id));
      const pieces = s1.strokes.slice(-2);
      assert.ok(pieces.every(k => k.color === target.color && k.tool === 'pen'));
      assert.ok(Math.max(...pieces[0].points.map(p => p[0])) < 900);
      assert.ok(Math.min(...pieces[1].points.map(p => p[0])) > 900);
      await key('z', ['Control']);
      assert.equal((await state()).strokes.length, s0.strokes.length);
      await key('z', ['Control', 'Shift']);
    });

    await t.test('selector: rectangle select, move, recolor, resize, delete', async () => {
      await key('s');
      await drag(line(680, 130, 920, 260, 10)); // box around the left piece
      let s = await state();
      assert.equal(s.selection.length, 1);
      const id = s.selection[0];
      const before = s.strokes.find(k => k.id === id);
      await drag(line(800, 200, 800, 300, 6)); // drag inside the box
      s = await state();
      const moved = s.strokes.find(k => k.id === id);
      assert.ok(Math.abs(moved.points[0][1] - before.points[0][1] - 100) < 1, 'moved 100 down');
      await pressBtn('color-blue');
      await pressBtn('size-3');
      s = await state();
      const styled = s.strokes.find(k => k.id === id);
      assert.equal(styled.color, '#1e64c8');
      assert.equal(styled.size, 12);
      const n = s.strokes.length;
      await key('Delete');
      assert.equal((await state()).strokes.length, n - 1);
      await key('z', ['Control']);
      s = await state();
      assert.equal(s.strokes.length, n);
      assert.equal(s.strokes.find(k => k.id === id).color, '#1e64c8');
    });

    await t.test('selector: lasso picks strokes inside the loop', async () => {
      await page.keyboard.press('Escape');
      const loop = Array.from({ length: 41 }, (_, i) => {
        const a = (i / 40) * Math.PI * 2;
        return [410 + 260 * Math.cos(a), 330 + 90 * Math.sin(a)];
      });
      await drag(loop);
      const s = await state();
      const ids = new Set(s.selection || []);
      // the first pen wave (y≈300) and the highlighter (y=300) are inside
      assert.ok(ids.has(s.strokes[0].id));
      assert.ok(ids.has(s.strokes[3].id));
      await page.screenshot({ path: path.join(shots, '03-selection.png') });
      await page.keyboard.press('Escape');
    });

    await t.test('laser leaves a fading trail and never touches the document', async () => {
      const s0 = await state();
      await key('l');
      await drag(wave(300, 600, 500, 30, 25));
      const trail = () => page.evaluate(() => {
        const path = window.MarpNotes.app.activeSlide().layer.ui.querySelector('.ann-laser-trail');
        const d = path && path.getAttribute('d');
        if (!d) return null;
        const b = path.getBBox();
        return { w: b.width, h: b.height };
      });
      const mid = await trail();
      assert.ok(mid, 'trail visible as one smooth shape');
      assert.ok(Math.hypot(mid.w, mid.h) < 140 + 30, `trail is short (${mid.w}x${mid.h})`);
      const s1 = await state();
      assert.equal(s1.strokes.length, s0.strokes.length);
      assert.equal(s1.undo, s0.undo);
      await new Promise(r => setTimeout(r, 900));
      assert.equal(await trail(), null, 'trail faded');
    });

    await t.test('palm rejection: touch does not draw after a pen was used', async () => {
      await key('p');
      const n = (await state()).strokes.length;
      await touchDrag(line(300, 650, 600, 650, 10));
      assert.equal((await state()).strokes.length, n);
    });

    await t.test('screenshot of the annotated slide with the expanded toolbar', async () => {
      await key('p');
      await pressBtn('color-blue');
      await pressBtn('size-1');
      await drag(wave(720, 380, 360, 30, 40), { pointerType: 'pen', pressures: Array.from({ length: 41 }, (_, i) => 0.2 + 0.8 * Math.abs(Math.sin(i / 6))) });
      await pressBtn('color-green');
      // a check mark
      await drag([[760, 520], [790, 560], [860, 470]], { pointerType: 'pen', pressures: [0.4, 0.9, 0.3] });
      await page.screenshot({ path: path.join(shots, '02-annotated.png') });
      await page.screenshot({ path: path.join(shots, '04-toolbar.png'), clip: { x: 0, y: 0, width: 1440, height: 60 } });
    });

    await t.test('clear page is undoable', async () => {
      const n = (await state()).strokes.length;
      await pressBtn('clear');
      assert.equal((await state()).strokes.length, 0);
      await pressBtn('undo');
      assert.equal((await state()).strokes.length, n);
    });

    /** Synthetic pointer events straight on the active hit rect (no real input). */
    const synth = (events) => page.evaluate((events) => {
      const app = window.MarpNotes.app;
      const s = app.activeSlide();
      const m = s.svg.getScreenCTM();
      for (const [type, x, y, id, extra] of events) {
        const p = new DOMPoint(x, y).matrixTransform(m);
        s.layer.hit.dispatchEvent(new PointerEvent(type, {
          pointerId: id, pointerType: 'mouse', isPrimary: true, clientX: p.x, clientY: p.y,
          button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true, ...(extra || {}),
        }));
      }
    }, events);
    const partial = (id, y) => [['pointerdown', 300, y, id], ['pointermove', 400, y + 10, id], ['pointermove', 500, y, id]];

    await t.test('interrupted strokes are committed, not lost', async () => {
      await key('p');
      const n0 = (await state()).strokes.length;
      // pointercancel
      await synth([...partial(41, 640), ['pointercancel', 500, 640, 41]]);
      assert.equal((await state()).strokes.length, n0 + 1, 'pointercancel commits');
      // window blur
      await synth(partial(42, 660));
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      assert.equal((await state()).strokes.length, n0 + 2, 'blur commits');
      // Ctrl+Z mid-stroke only finishes the stroke
      await synth(partial(43, 680));
      await key('z', ['Control']);
      let s = await state();
      assert.equal(s.strokes.length, n0 + 3, 'Ctrl+Z mid-stroke commits instead of undoing');
      // a stale gesture (pointerup never arrived) does not block new input
      await synth(partial(44, 700));
      await drag(line(600, 640, 800, 700, 6));
      s = await state();
      assert.equal(s.strokes.length, n0 + 5, 'stale stroke committed and the new one drawn');
      for (let i = 0; i < 5; i++) await key('z', ['Control']);
      assert.equal((await state()).strokes.length, n0);
    });

    await t.test('annotations survive slide navigation; A turns everything off', async () => {
      const n = (await state()).strokes.length;
      await key('a');
      await key('ArrowRight');
      await key('ArrowLeft');
      const r = await page.evaluate(() => ({
        on: document.body.classList.contains('ann-on'),
        top: getComputedStyle(document.querySelector('.bespoke-marp-parent')).top,
        hitPE: getComputedStyle(window.MarpNotes.app.activeSlide().layer.hit).pointerEvents,
        visible: [...document.querySelectorAll('.ann-bar .ann-btn')].filter(b => b.offsetParent !== null).map(b => b.dataset.id),
      }));
      assert.equal(r.on, false);
      assert.equal(r.top, '0px');
      assert.equal(r.hitPE, 'none');
      assert.deepEqual(r.visible, ['toggle', 'overview']);
      assert.equal((await state()).strokes.length, n);
      await page.screenshot({ path: path.join(shots, '05-off-with-notes.png') });
    });

    // ── Phase B: blank pages, save/load, print ──

    const pageState = () => page.evaluate(() => {
      const app = window.MarpNotes.app;
      return {
        bespoke: app.bespokeSlide().n,
        blank: app.currentBlank ? app.currentBlank.pageId : null,
        label: document.querySelector('.ann-label[data-id="page-label"]').textContent.replace(/\u2009/g, ' '),
        total: app.slides.length,
        hash: location.hash,
        overview: !!document.querySelector('#ann-ov:not([hidden])'),
        sequence: app.doc.sequence(),
        dirty: app.doc.isDirty(),
      };
    });
    const settle = (ms = 150) => new Promise(r => setTimeout(r, ms));
    let blank1, blank2;

    await t.test('annotate mode hides Marp controls; erasers have distinct captions', async () => {
      await key('a');
      const r = await page.evaluate(() => ({
        osc: getComputedStyle(document.querySelector('.bespoke-marp-osc')).display,
        caps: [...document.querySelectorAll('.ann-cap')].map(c => c.textContent),
        icons: ['eraser', 'partial'].map(id => document.querySelector(`.ann-btn[data-id="${id}"] svg`).innerHTML),
      }));
      assert.equal(r.osc, 'none');
      assert.deepEqual(r.caps, ['stroke', 'part']);
      assert.notEqual(r.icons[0], r.icons[1]);
    });

    await t.test('insert a grid blank page after slide 2 and write on it', async () => {
      assert.equal((await pageState()).bespoke, 2);
      const slideStrokes = (await state()).strokes.length;
      await pressBtn('paper-grid');
      await pressBtn('page-insert');
      let ps = await pageState();
      blank1 = ps.blank;
      assert.ok(blank1, 'a blank page is shown');
      assert.equal(ps.label, `2 / ${ps.total} · blank 1/1`);
      assert.deepEqual(ps.sequence.slice(0, 4), ['s1', 's2', blank1, 's3']);
      const geo = await page.evaluate(() => {
        const app = window.MarpNotes.app;
        const a = app.currentBlank.svg.getBoundingClientRect(), b = app.bespokeSlide().svg.getBoundingClientRect();
        return { same: ['top', 'left', 'width', 'height'].every(k => Math.abs(a[k] - b[k]) < 0.5),
          display: getComputedStyle(app.currentBlank.svg).display, paper: app.currentBlank.svg.dataset.paper };
      });
      assert.ok(geo.same, 'overlay lines up with the slide');
      assert.equal(geo.display, 'block');
      assert.equal(geo.paper, 'grid');
      await key('p');
      await pressBtn('color-blue');
      await drag(wave(160, 200, 600, 50, 40), { pointerType: 'pen', pressures: Array.from({ length: 41 }, (_, i) => 0.25 + 0.7 * Math.abs(Math.sin(i / 7))) });
      await pressBtn('color-red');
      await drag([[200, 420], [380, 420], [290, 300], [200, 420]], { pointerType: 'pen', pressures: [0.6, 0.6, 0.6, 0.6] });
      await key('h');
      await drag(line(160, 560, 900, 560, 20));
      const s = await state();
      assert.equal(s.strokes.length, 3, 'strokes are on the blank page');
      assert.equal(s.dom.pen + s.dom.hl, 3);
      const slide2 = await page.evaluate(() => window.MarpNotes.app.doc.strokes('s2').length);
      assert.equal(slide2, slideStrokes);
      await key('p');
      await page.screenshot({ path: path.join(shots, '07-blank-grid.png') });
    });

    await t.test('navigation: slide -> its blank pages -> next slide, and back', async () => {
      await key('ArrowRight');
      await settle();
      let ps = await pageState();
      assert.equal(ps.bespoke, 3);
      assert.equal(ps.blank, null);
      assert.equal(ps.label, `3 / ${ps.total}`);
      await key('ArrowLeft');
      await settle();
      ps = await pageState();
      assert.equal(ps.bespoke, 2);
      assert.equal(ps.blank, blank1);
      await key('ArrowLeft');
      ps = await pageState();
      assert.equal(ps.blank, null);
      assert.equal(ps.label, `2 / ${ps.total} · +1 blank`);
      await key('ArrowLeft'); // no blank pages involved: Marp's own navigation
      await settle();
      assert.equal((await pageState()).bespoke, 1);
      await key('PageDown');
      await settle();
      assert.equal((await pageState()).bespoke, 2);
      await pressBtn('page-next');
      ps = await pageState();
      assert.equal(ps.blank, blank1);
      await pressBtn('page-prev');
      assert.equal((await pageState()).blank, null);
      await key(' ');
      assert.equal((await pageState()).blank, blank1);
    });

    await t.test('tablet paging: large prev/next at the bar ends, two-finger swipe after a pen', async () => {
      const r = await page.evaluate(() => {
        const box = id => document.querySelector(`.ann-btn[data-id="${id}"]`).getBoundingClientRect();
        const bar = document.querySelector('.ann-bar').getBoundingClientRect();
        return { prev: box('page-prev').toJSON(), next: box('page-next').toJSON(), bar: bar.toJSON() };
      });
      assert.ok(r.prev.left - r.bar.left < 20, `prev at the left end (${r.prev.left})`);
      assert.ok(r.bar.right - r.next.right < 20, `next at the right end (${r.next.right})`);
      assert.ok(r.prev.width >= 48 && r.next.height >= 44, 'larger than the other buttons');

      const cdp = await page.createCDPSession();
      const swipe = async (fingers, dx) => {
        const at = x => Array.from({ length: fingers }, (_, i) => ({ x, y: 300 + i * 60, id: i }));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(640) });
        for (let k = 1; k <= 5; k++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(640 + dx * k / 5) });
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await settle();
      };
      assert.equal((await pageState()).blank, blank1);
      assert.equal(await page.evaluate(() => window.MarpNotes.app.input.penSeen), true);
      const count = () => page.evaluate(id => window.MarpNotes.app.doc.strokes(id).length, blank1);
      const before = await count();
      await swipe(1, 200); // one finger never pages
      assert.equal((await pageState()).blank, blank1);
      await swipe(2, 200); // to the right: previous
      let ps = await pageState();
      assert.equal(ps.blank, null);
      assert.equal(ps.bespoke, 2);
      await swipe(2, -200); // to the left: next
      assert.equal((await pageState()).blank, blank1);
      assert.equal(await count(), before, 'the swipes drew nothing');
      await cdp.detach();
    });

    await t.test('paper switch, insert and delete are undoable', async () => {
      await pressBtn('paper-lined');
      assert.equal(await page.evaluate(id => window.MarpNotes.app.doc.getPage(id).paper, blank1), 'lined');
      await key('z', ['Control']);
      assert.equal(await page.evaluate(id => window.MarpNotes.app.doc.getPage(id).paper, blank1), 'grid');
      await key('b');
      let ps = await pageState();
      blank2 = ps.blank;
      assert.notEqual(blank2, blank1);
      assert.equal(ps.label, `2 / ${ps.total} · blank 2/2`);
      await pressBtn('paper-lined');
      await pressBtn('color-black');
      await drag(wave(150, 160, 700, 20, 30), { pointerType: 'pen', pressures: Array(31).fill(0.5) });
      await pressBtn('page-delete');
      ps = await pageState();
      assert.equal(ps.blank, blank1, 'back on the previous blank page');
      assert.ok(!ps.sequence.includes(blank2));
      await key('z', ['Control']);
      ps = await pageState();
      assert.ok(ps.sequence.includes(blank2));
      await key('ArrowRight');
      ps = await pageState();
      assert.equal(ps.blank, blank2);
      assert.equal((await state()).strokes.length, 1, 'stroke restored with the page');
      await page.screenshot({ path: path.join(shots, '08-blank-lined.png') });
      // eraser cursor on a blank page disappears when switching tools
      await key('e');
      const [c] = await toClient([[640, 360]]);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c[0], y: c[1], buttons: 0, button: 'none' });
      const cursor = () => page.evaluate(() => {
        const n = window.MarpNotes.app.currentBlank.layer.ui.querySelector('.ann-eraser-cursor');
        return n ? n.getAttribute('display') : 'missing';
      });
      assert.equal(await cursor(), null, 'cursor shown');
      await key('p');
      assert.equal(await cursor(), 'none', 'cursor hidden after switching tools');
    });

    await t.test('page counter shows the total; the overview and G + number jump through Marp', async () => {
      let ps = await pageState();
      assert.equal(ps.blank, blank2);
      assert.equal(ps.label, `2 / ${ps.total} · blank 2/2`);
      const bar = await page.evaluate(() => document.querySelector('.ann-bar').getBoundingClientRect().toJSON());
      await page.screenshot({ path: path.join(shots, '13-counter.png'), clip: { x: 0, y: 0, width: 1440, height: Math.ceil(bar.bottom) + 40 } });
      assert.equal(await page.evaluate(() => !!document.getElementById('ann-ov')), false, 'built lazily');
      const size0 = await page.evaluate(() => window.MarpNotes.app.currentSize());

      // click on the counter opens the overview, current slide highlighted
      await page.click('.ann-label[data-id="page-label"]');
      await settle(400);
      const ov = await page.evaluate(() => {
        const items = [...document.querySelectorAll('#ann-ov .ann-ov-item')];
        const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
        const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
        const clone = items[1].querySelector('section');
        const orig = window.MarpNotes.app.slides[1].svg.querySelector('section');
        const r = items[1].getBoundingClientRect();
        return {
          items: items.length,
          current: items.filter(i => i.classList.contains('is-current')).map(i => Number(i.dataset.n)),
          badges2: items[1].querySelectorAll('.ann-ov-badge').length,
          badges3: items[2].querySelectorAll('.ann-ov-badge').length,
          blankBadge: items[1].querySelector('.ann-ov-badges').textContent,
          built: items.filter(i => i.querySelector('svg[data-marpit-svg]')).length,
          strokes: items[1].querySelectorAll('.ann-layer .ann-stroke').length,
          hit: document.querySelectorAll('#ann-ov .ann-hit, #ann-ov .ann-ui').length,
          inactive: document.querySelectorAll('#ann-ov [data-bespoke-marp-fragment]').length,
          dup,
          font: [getComputedStyle(clone).fontFamily, getComputedStyle(orig).fontFamily],
          bg: [getComputedStyle(clone).backgroundColor, getComputedStyle(orig).backgroundColor],
          tileW: r.width, tileH: r.height,
          focused: document.activeElement && document.activeElement.dataset.n,
        };
      });
      assert.equal(ov.items, ps.total);
      assert.deepEqual(ov.current, [2]);
      assert.equal(ov.badges2, 2, 'slide 2: notes and blank pages');
      assert.equal(ov.blankBadge, '2');
      assert.equal(ov.badges3, 0);
      assert.ok(ov.built >= 10, `thumbnails built: ${ov.built}`);
      assert.ok(ov.strokes > 0, 'notes shown in the thumbnail');
      assert.equal(ov.hit, 0);
      assert.equal(ov.inactive, 0, 'all fragments shown');
      assert.deepEqual(ov.dup, [], 'no duplicate ids');
      assert.equal(ov.font[0], ov.font[1], 'theme applies to the thumbnails');
      assert.equal(ov.bg[0], ov.bg[1]);
      assert.ok(ov.tileW >= 200 && ov.tileH >= 100, 'large tap targets');
      assert.equal(ov.focused, '2');
      await page.screenshot({ path: path.join(shots, '14-overview.png') });

      // wheel scrolling and keys inside the overview do not move the deck; never printed
      await page.mouse.move(700, 500);
      await page.mouse.wheel({ deltaY: 400 });
      await key('ArrowRight');
      await key('p');
      await settle(200);
      ps = await pageState();
      assert.equal(ps.bespoke, 2);
      assert.equal(ps.blank, blank2);
      assert.equal(ps.overview, true);
      await page.emulateMediaType('print');
      assert.equal(await page.evaluate(() => getComputedStyle(document.getElementById('ann-ov')).display), 'none');
      await page.emulateMediaType('screen');

      // Esc closes, nothing changed
      await key('Escape');
      ps = await pageState();
      assert.equal(ps.overview, false);
      assert.equal(ps.blank, blank2);

      // click a thumbnail: jump there through Marp's hash navigation
      await page.click('.ann-label[data-id="page-label"]');
      await page.click('#ann-ov .ann-ov-item[data-n="5"]');
      await settle(300);
      ps = await pageState();
      assert.equal(ps.overview, false);
      assert.equal(ps.bespoke, 5);
      assert.equal(ps.blank, null);
      assert.equal(ps.hash, '#5');
      assert.equal(ps.label, `5 / ${ps.total}`);

      // the close button closes too
      await page.click('.ann-label[data-id="page-label"]');
      await page.click('#ann-ov .ann-ov-close');
      assert.equal((await pageState()).overview, false);

      // G, a number, Enter (digits do not change the size meanwhile)
      await key('g');
      assert.equal((await pageState()).label, 'Go to _');
      await key('1');
      await key('2');
      assert.equal((await pageState()).label, 'Go to 12_');
      await key('Enter');
      await settle(300);
      ps = await pageState();
      assert.equal(ps.bespoke, 12);
      assert.equal(ps.label, `12 / ${ps.total}`);
      assert.equal(await page.evaluate(() => window.MarpNotes.app.currentSize()), size0);
      // out of range is clamped; Escape cancels
      await key('g'); await key('9'); await key('9'); await key('Enter');
      await settle(300);
      assert.equal((await pageState()).bespoke, ps.total);
      await key('g'); await key('3'); await key('Escape');
      await settle(200);
      assert.equal((await pageState()).bespoke, ps.total);
      assert.equal((await pageState()).label, `${ps.total} / ${ps.total}`);
      // G, Enter opens the overview
      await key('g'); await key('Enter');
      assert.equal((await pageState()).overview, true);
      await key('Escape');

      // arriving at a slide shows its first step, also when jumping to the shown slide
      // (only checked when the deck has a slide with fragments)
      const frag = await page.evaluate(() =>
        window.MarpNotes.app.slides.find(s => s.svg.querySelector('[data-bespoke-marp-fragment]'))?.n);
      if (frag) {
        const active = () => page.evaluate(() =>
          window.MarpNotes.app.bespokeSlide().svg.querySelectorAll('[data-bespoke-marp-fragment="active"]').length);
        await page.evaluate(n => window.MarpNotes.app.pages.jump(n), frag);
        await settle(300);
        assert.equal((await pageState()).bespoke, frag);
        assert.equal(await active(), 0);
        await key('ArrowRight');
        await key('ArrowRight');
        await settle(200);
        assert.equal(await active(), 2, 'stepped through two fragments');
        await key('g');
        for (const d of String(frag)) await key(d);
        await key('Enter');
        await settle(300);
        assert.equal((await pageState()).bespoke, frag);
        assert.equal(await active(), 0, 'back at the first step');
      }

      // annotate mode off: the corner button opens the overview, jumping works
      await key('a');
      await key('g'); // not a shortcut while off
      assert.equal((await pageState()).overview, false);
      await pressBtn('overview');
      assert.equal((await pageState()).overview, true);
      await page.click('#ann-ov .ann-ov-item[data-n="3"]');
      await settle(300);
      ps = await pageState();
      assert.equal(ps.bespoke, 3);
      assert.equal(ps.overview, false);
      await key('a');

      // back to where the next tests expect us: the second blank page after slide 2
      await page.evaluate(() => window.MarpNotes.app.pages.jump(2));
      await settle(300);
      await key('ArrowRight');
      await key('ArrowRight');
      assert.equal((await pageState()).blank, blank2);
    });

    const dl = path.join(shots, 'downloads');
    let savedFile;
    await t.test('Ctrl+S saves <deck-title>-notes.json', async () => {
      fs.rmSync(dl, { recursive: true, force: true });
      fs.mkdirSync(dl, { recursive: true });
      const bcdp = await browser.target().createCDPSession();
      await bcdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl });
      assert.ok((await pageState()).dirty);
      await key('s', ['Control']);
      const name = await page.evaluate(() => window.MarpNotes.app.io.filename());
      const slug = (await page.title()).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      assert.equal(name, `${slug}-notes.json`);
      savedFile = path.join(dl, name);
      for (let i = 0; i < 50 && !fs.existsSync(savedFile); i++) await settle(100);
      const json = JSON.parse(fs.readFileSync(savedFile, 'utf8'));
      assert.equal(json.format, 'marp-notes');
      assert.deepEqual(json.pages.map(p => p.id), ['s2', blank1, blank2]);
      assert.equal(json.pages[1].paper, 'grid');
      assert.equal(json.pages[1].strokes.length, 3);
      assert.equal((await pageState()).dirty, false);
    });

    const dialogs = [];
    page.on('dialog', async d => { dialogs.push(d.type()); await d.accept(); });

    await t.test('reload without unsaved changes shows no beforeunload prompt', async () => {
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => window.MarpNotes && window.MarpNotes.app);
      assert.deepEqual(dialogs, []);
      assert.equal(await page.evaluate(() => window.MarpNotes.app.doc.toJSON().pages.length), 0);
    });

    await t.test('drag-and-drop of notes for another deck warns but loads matching slides', async () => {
      await page.evaluate(() => {
        const data = {
          format: 'marp-notes', version: 1, deck: { title: 'Other deck', slides: 400, size: [1280, 720] },
          pages: [
            { id: 's3', kind: 'slide', slide: 3, strokes: [{ id: 'x1', tool: 'pen', color: '#000000', size: 4, points: [[100, 100, 0.5], [300, 200, 0.5]] }] },
            { id: 's300', kind: 'slide', slide: 300, strokes: [{ id: 'x2', tool: 'pen', color: '#000000', size: 4, points: [[100, 100, 0.5]] }] },
          ],
        };
        const dt = new DataTransfer();
        dt.items.add(new File([JSON.stringify(data)], 'other-notes.json', { type: 'application/json' }));
        for (const type of ['dragenter', 'dragover', 'drop']) {
          window.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }));
        }
      });
      await page.waitForSelector('.ann-banner-warn');
      const r = await page.evaluate(() => ({
        text: document.querySelector('.ann-banner-warn').textContent,
        s3: window.MarpNotes.app.doc.strokes('s3').length,
        dropping: document.body.classList.contains('ann-dropping'),
      }));
      assert.match(r.text, /Other deck/);
      assert.match(r.text, /slide 300/);
      assert.equal(r.s3, 1);
      assert.equal(r.dropping, false);
      await page.screenshot({ path: path.join(shots, '09-load-warning.png') });
      await page.click('.ann-banner-close');
    });

    await t.test('load via the file picker restores slide and blank-page notes', async () => {
      await key('a');
      const [chooser] = await Promise.all([page.waitForFileChooser(), pressBtn('load')]);
      await chooser.accept([savedFile]);
      await page.waitForFunction(id => !!window.MarpNotes.app.doc.getPage(id), {}, blank2);
      const saved = JSON.parse(fs.readFileSync(savedFile, 'utf8'));
      const r = await page.evaluate(() => {
        const doc = window.MarpNotes.app.doc;
        return { json: JSON.parse(JSON.stringify(doc.toJSON())), s3: doc.strokes('s3').length, dirty: doc.isDirty() };
      });
      assert.deepEqual(r.json.pages, saved.pages);
      assert.equal(r.s3, 0, 'previous notes replaced');
      assert.equal(r.dirty, false);
      // the slide layer shows the strokes, and the blank page renders when visited
      while ((await pageState()).bespoke !== 2) { await key('ArrowLeft'); await settle(); }
      assert.equal((await state()).dom.pen + (await state()).dom.hl, saved.pages[0].strokes.length);
      await key('ArrowRight');
      const s = await state();
      assert.equal((await pageState()).blank, blank1);
      assert.equal(s.dom.pen + s.dom.hl, 3);
      // loading while a blank page is shown returns to its slide first
      const text = fs.readFileSync(savedFile, 'utf8');
      await page.evaluate(t => window.MarpNotes.app.io.loadText(t, 'again.json'), text);
      assert.equal((await pageState()).blank, null);
    });

    await t.test('without Marp\'s on-screen buttons, leaving the last blank page falls back to Marp', async () => {
      await key('ArrowRight');
      await key('ArrowRight');
      assert.equal((await pageState()).blank, blank2);
      await page.evaluate(() => {
        window.__osc = document.querySelector('.bespoke-marp-osc');
        window.__osc.remove();
      });
      await key('ArrowRight');
      await settle();
      const ps = await pageState();
      assert.equal(ps.blank, null);
      assert.equal(ps.bespoke, 3, 'Marp handled the key itself');
      await page.evaluate(() => document.querySelector('.bespoke-marp-parent').appendChild(window.__osc));
      await key('ArrowLeft');
      await settle();
    });

    await t.test('print preparation is idempotent and restorable', async () => {
      const r = await page.evaluate(() => {
        const io = window.MarpNotes.app.io;
        io.preparePrint();
        io.preparePrint(); // e.g. a missed afterprint
        const during = document.querySelectorAll('.ann-print-page').length;
        io.restorePrint();
        return { during, after: document.querySelectorAll('.ann-print-page').length };
      });
      assert.equal(r.during, 2);
      assert.equal(r.after, 0);
    });

    await t.test('PDF export contains every slide plus the blank pages with notes', async () => {
      const pdfPath = path.join(shots, 'notes.pdf');
      await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
      const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
      const pages = Number(/Pages:\s+(\d+)/.exec(info)[1]);
      const slides = await page.evaluate(() => window.MarpNotes.app.slides.length);
      assert.equal(pages, slides + 2);
      const restored = await page.evaluate(() => document.querySelectorAll('.ann-print-page').length);
      assert.equal(restored, 0, 'print pages removed after printing');
      // slide 2, blank grid page, blank lined page
      execFileSync('pdftoppm', ['-png', '-r', '50', '-f', '2', '-l', '4', pdfPath, path.join(shots, 'pdf-page')]);
    });

    await t.test('reload with unsaved changes asks via beforeunload', async () => {
      await key('p');
      await drag(wave(300, 300, 300, 30, 10));
      assert.ok((await pageState()).dirty);
      await page.reload({ waitUntil: 'load' });
      assert.deepEqual(dialogs, ['beforeunload']);
    });

    await t.test('palm rejection starts with a hovering pen, before its first touch', async () => {
      await page.waitForFunction(() => window.MarpNotes && window.MarpNotes.app);
      await key('a');
      await key('p');
      await touchDrag(line(300, 600, 600, 600, 8));
      assert.equal((await state()).strokes.length, 1, 'touch draws while no pen was seen');
      const [c] = await toClient([[640, 360]]);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', pointerType: 'pen', x: c[0], y: c[1], buttons: 0, button: 'none' });
      await touchDrag(line(300, 650, 600, 650, 8));
      assert.equal((await state()).strokes.length, 1, 'palm ignored after pen hover');
      await key('z', ['Control']);
      await key('a');
    });

    await t.test('dock position cycles and is remembered', async () => {
      await key('a');
      const docks = [];
      for (let i = 0; i < 4; i++) {
        await pressBtn('dock');
        await settle(80);
        docks.push(await page.evaluate(() => {
          const bar = document.querySelector('.ann-bar').getBoundingClientRect();
          const slide = window.MarpNotes.app.activeSlide().svg.getBoundingClientRect();
          const overlap = !(slide.right <= bar.left + 0.5 || slide.left >= bar.right - 0.5 ||
                            slide.bottom <= bar.top + 0.5 || slide.top >= bar.bottom - 0.5);
          return { dock: document.body.dataset.annDock, overlap };
        }));
        if (docks[i].dock === 'left') await page.screenshot({ path: path.join(shots, '10-dock-left.png') });
      }
      assert.deepEqual(docks.map(d => d.dock), ['right', 'bottom', 'left', 'top']);
      assert.ok(docks.every(d => !d.overlap), JSON.stringify(docks));
      await pressBtn('dock'); // right
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => window.MarpNotes && window.MarpNotes.app);
      assert.equal(await page.evaluate(() => document.body.dataset.annDock), 'right');
    });

    await t.test('presenter view mirrors notes, blank pages, view and saved state to the audience window', async () => {
      const audience = page;
      await audience.evaluate(() => window.MarpNotes.toolbar.setDock('top'));
      const pres = await browser.newPage();
      pres.on('pageerror', e => errors.push(`presenter: ${e.message}`));
      try {
        await pres.setViewport({ width: 1400, height: 820, deviceScaleFactor: 1 });
        await pres.goto(pathToFileURL(deck).href + '?view=presenter', { waitUntil: 'load' });
        await pres.waitForFunction(() => window.MarpNotes && window.MarpNotes.app);
        const pcdp = await pres.createCDPSession();
        const presDrag = async (pts) => {
          const client = await pres.evaluate((pts) => {
            const m = window.MarpNotes.app.activeSlide().svg.getScreenCTM();
            return pts.map(([x, y]) => { const p = new DOMPoint(x, y).matrixTransform(m); return [p.x, p.y]; });
          }, pts);
          const base = { pointerType: 'pen', button: 'left', modifiers: 0 };
          await pcdp.send('Input.dispatchMouseEvent', { ...base, type: 'mousePressed', x: client[0][0], y: client[0][1], buttons: 1, clickCount: 1, force: 0.6 });
          for (const c of client.slice(1)) await pcdp.send('Input.dispatchMouseEvent', { ...base, type: 'mouseMoved', x: c[0], y: c[1], buttons: 1, force: 0.6 });
          const l = client[client.length - 1];
          await pcdp.send('Input.dispatchMouseEvent', { ...base, type: 'mouseReleased', x: l[0], y: l[1], buttons: 0, clickCount: 1, force: 0 });
        };
        const aud = () => audience.evaluate(() => {
          const app = window.MarpNotes.app;
          return { blank: app.currentBlank && app.currentBlank.pageId, seq: app.doc.sequence(), dirty: app.doc.isDirty(),
            json: JSON.parse(JSON.stringify(app.doc.toJSON())) };
        });
        await pres.keyboard.press('a');
        await pres.keyboard.press('p');
        const slideId = await pres.evaluate(() => window.MarpNotes.app.activeSlide().pageId);
        await presDrag(wave(200, 300, 600, 60, 30));
        await settle(200);
        let a = await aud();
        const pageOnAudience = a.json.pages.find(p => p.id === slideId);
        assert.ok(pageOnAudience && pageOnAudience.strokes.length === 1, 'stroke mirrored');
        assert.ok(a.dirty, 'mirrored notes count as unsaved');

        await pres.keyboard.press('b');
        await presDrag(wave(200, 400, 700, 40, 30));
        await settle(200);
        const presBlank = await pres.evaluate(() => window.MarpNotes.app.currentBlank.pageId);
        a = await aud();
        assert.equal(a.blank, presBlank, 'audience shows the same blank page');
        assert.equal(a.json.pages.find(p => p.id === presBlank).strokes.length, 1);
        await audience.screenshot({ path: path.join(shots, '11-sync-audience.png') });
        await pres.screenshot({ path: path.join(shots, '12-sync-presenter.png') });

        await pres.keyboard.down('Control'); await pres.keyboard.press('z'); await pres.keyboard.up('Control');
        await settle(200);
        a = await aud();
        assert.equal(a.json.pages.find(p => p.id === presBlank).strokes.length, 0, 'undo mirrored');

        // deleting a blank page with notes and undoing it restores the notes in the peer too
        await presDrag(wave(200, 500, 500, 30, 20));
        await pres.click('.ann-btn[data-id="page-delete"]');
        await settle(200);
        assert.ok(!(await aud()).seq.includes(presBlank), 'deletion mirrored');
        await pres.keyboard.down('Control'); await pres.keyboard.press('z'); await pres.keyboard.up('Control');
        await settle(200);
        a = await aud();
        assert.ok(a.seq.includes(presBlank), 'page restored in the peer');
        assert.equal(a.json.pages.find(p => p.id === presBlank).strokes.length, 1, 'with its strokes');

        await pres.evaluate(() => window.MarpNotes.app.doc.markSaved());
        await settle(200);
        assert.equal((await aud()).dirty, false, 'saving in one window clears the other');

        await pres.keyboard.press('ArrowLeft'); // back to the slide
        await settle(200);
        assert.equal((await aud()).blank, null);

        // the overview is local to its window
        const audOverview = () => audience.evaluate(() => !!document.querySelector('#ann-ov:not([hidden])'));
        await pres.click('.ann-label[data-id="page-label"]');
        await settle(300);
        assert.equal(await audOverview(), false, 'only the presenter shows the overview');
        await pres.screenshot({ path: path.join(shots, '15-overview-presenter.png') });
        await pres.click('#ann-ov .ann-ov-item[data-n="4"]');
        await settle(300);
        assert.equal(await pres.evaluate(() => window.MarpNotes.app.bespokeSlide().n), 4);
        assert.equal(await audOverview(), false);
      } finally {
        await pres.close();
      }
    });

    await t.test('a jump in the presenter view (opened with p) moves the audience window too', async () => {
      const audience = page;
      await audience.evaluate(() => { if (window.MarpNotes.app.enabled) window.MarpNotes.app.toggle(false); });
      const target = browser.waitForTarget(tg => tg.url().includes('view=presenter'));
      await audience.keyboard.press('p'); // Marp's own presenter view, synced by Marp
      const pres = await (await target).page();
      pres.on('pageerror', e => errors.push(`presenter: ${e.message}`));
      try {
        await pres.waitForFunction(() => window.MarpNotes && window.MarpNotes.app);
        const slides = async () => [await audience.evaluate(() => window.MarpNotes.app.bespokeSlide().n),
          await pres.evaluate(() => window.MarpNotes.app.bespokeSlide().n)];
        await pres.keyboard.press('a');
        await pres.click('.ann-label[data-id="page-label"]');
        await pres.click('#ann-ov .ann-ov-item[data-n="4"]');
        await settle(400);
        assert.deepEqual(await slides(), [4, 4], 'overview jump followed');
        await pres.keyboard.press('g');
        await pres.keyboard.press('7');
        await pres.keyboard.press('Enter');
        await settle(400);
        assert.deepEqual(await slides(), [7, 7], 'G + number jump followed');
      } finally {
        await pres.close();
      }
    });

    await t.test('no page errors', () => {
      assert.deepEqual(errors, []);
    });
  } finally {
    await browser.close();
    fs.rmSync(deck, { force: true });
  }
});
