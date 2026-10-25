/* Marp Notes - pointer input: coordinate mapping and palm rejection
 *
 * Routes pointer events on a slide's annotation layer to the active tool as
 * down / move / up / cancel / hover / leave calls with slide coordinates.
 */
(function (root) {
  'use strict';

  const NS = root.MarpNotes = root.MarpNotes || {};

  /** Pressure only for real pens; mouse and touch draw at constant width. */
  function pressureOf(e) {
    if (e.pointerType !== 'pen') return 0.5;
    return e.pressure > 0 ? e.pressure : 0.5;
  }

  /** Client (screen) coordinates -> slide viewBox coordinates. */
  function toSlidePoint(svg, e) {
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return Number.isFinite(p.x) && Number.isFinite(p.y) ? [p.x, p.y, pressureOf(e)] : null;
  }

  const ERASER_BUTTON = 32; // pen eraser end / barrel eraser button

  const midpoint = t => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });

  /**
   * Page step for a two-finger swipe moving (dx, dy) screen px in ms: 1 (to
   * the left: next), -1 (to the right: previous) or 0 when it is too short,
   * too slow or not clearly horizontal.
   */
  function swipeDirection(dx, dy, ms) {
    if (Math.abs(dx) < 80 || Math.abs(dx) < 2 * Math.abs(dy) || ms > 700) return 0;
    return dx < 0 ? 1 : -1;
  }

  /**
   * app must provide: enabled, toolFor(e) -> tool, slideFor(svg) -> slide.
   * Tools implement any of down/move/up/cancel/hover/leave(slide, pt, e).
   */
  function attachInput(app, slides) {
    let penSeen = false;
    let active = null; // { pointerId, pointerType, tool, slide }

    const call = (tool, method, slide, pt, e) => {
      if (tool && typeof tool[method] === 'function') tool[method](slide, pt, e);
    };

    /**
     * End the running gesture. By default it is committed (as if the pointer
     * went up), so nothing written is lost on slide changes, undo, blur or a
     * cancelled pointer; discard=true drops it (a palm replaced by the pen).
     */
    function finish(discard = false) {
      if (!active) return;
      const { tool, slide, pointerId } = active;
      active = null;
      try { slide.svg.releasePointerCapture(pointerId); } catch (_) { /* gone */ }
      call(tool, discard ? 'cancel' : 'up', slide, null, null);
    }

    function onDown(slide, e) {
      if (!app.enabled) return;
      e.stopPropagation();
      if (e.pointerType === 'pen') penSeen = true;
      // Palm rejection: once a pen has been used, touch never draws.
      if (penSeen && e.pointerType === 'touch') { e.preventDefault(); return; }
      if (active) {
        if (e.pointerType === 'pen' && active.pointerType !== 'pen') finish(true); // palm replaced by pen
        else if (e.pointerType === active.pointerType) finish(); // stale gesture (lost its pointerup)
        else return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      const pt = toSlidePoint(slide.svg, e);
      if (!pt) return;
      const tool = e.pointerType === 'pen' && (e.buttons & ERASER_BUTTON)
        ? app.tools.eraser : app.currentTool();
      active = { pointerId: e.pointerId, pointerType: e.pointerType, tool, slide };
      try { slide.svg.setPointerCapture(e.pointerId); } catch (_) { /* synthetic */ }
      call(tool, 'down', slide, pt, e);
    }

    function onMove(slide, e) {
      if (e.pointerType === 'pen') penSeen = true; // a hovering pen counts: the palm may land first
      if (!app.enabled) return;
      if (active && active.pointerId === e.pointerId) {
        e.stopPropagation();
        const list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : [];
        for (const ev of list.length ? list : [e]) {
          const pt = toSlidePoint(slide.svg, ev);
          if (pt) call(active.tool, 'move', slide, pt, e);
        }
      } else if (!active && e.pointerType !== 'touch') {
        const pt = toSlidePoint(slide.svg, e);
        if (pt) call(app.currentTool(), 'hover', slide, pt, e);
      }
    }

    function onUp(slide, e, cancelled) {
      if (!active || active.pointerId !== e.pointerId) return;
      e.stopPropagation();
      const { tool } = active;
      active = null;
      // pointercancel still commits what was drawn so far.
      call(tool, 'up', slide, cancelled ? null : toSlidePoint(slide.svg, e), e);
    }

    window.addEventListener('blur', () => finish());

    // Two-finger swipe changes the page, but only once a pen has been seen:
    // touch never draws then, and one finger (or a resting palm) never pages.
    let swipeStart = null;
    function swipe(e) {
      const t = e.touches;
      if (e.type === 'touchstart') {
        swipeStart = penSeen && t.length === 2 ? { mid: midpoint(t), time: e.timeStamp } : null;
      } else if (e.type === 'touchmove') {
        if (swipeStart && t.length === 2) swipeStart.last = midpoint(t);
        else if (t.length > 2) swipeStart = null;
      } else if (swipeStart && t.length === 0) {
        const { mid, last, time } = swipeStart;
        swipeStart = null;
        if (!last || e.type === 'touchcancel') return;
        const dir = swipeDirection(last.x - mid.x, last.y - mid.y, e.timeStamp - time);
        if (dir && app.pages) app.pages.step(dir);
      }
    }

    /** Route events of one surface (slide or blank page) to the tools. */
    function attach(slide) {
      const svg = slide.svg;
      svg.addEventListener('pointerdown', e => onDown(slide, e));
      svg.addEventListener('pointermove', e => onMove(slide, e));
      svg.addEventListener('pointerup', e => onUp(slide, e, false));
      svg.addEventListener('pointercancel', e => onUp(slide, e, true));
      svg.addEventListener('lostpointercapture', e => {
        if (active && active.pointerId === e.pointerId) finish();
      });
      svg.addEventListener('pointerover', e => { if (e.pointerType === 'pen') penSeen = true; });
      svg.addEventListener('pointerleave', e => {
        if (app.enabled && !active) call(app.currentTool(), 'leave', slide, null, e);
      });
      // Keep bespoke's touch-swipe navigation and context menus away while drawing.
      for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
        svg.addEventListener(type, e => {
          if (!app.enabled) return;
          e.stopPropagation();
          swipe(e);
        });
      }
      svg.addEventListener('contextmenu', e => { if (app.enabled) e.preventDefault(); });
    }
    slides.forEach(attach);

    return {
      attach,
      /** Commit the running gesture (if any). */
      cancel: () => finish(),
      /** Drop the running gesture (if any). */
      discard: () => finish(true),
      get busy() { return !!active; },
      get penSeen() { return penSeen; },
    };
  }

  NS.input = { pressureOf, toSlidePoint, swipeDirection, attachInput };
})(typeof window !== 'undefined' ? window : globalThis);
