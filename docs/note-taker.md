# Lecture note-taker for Marp HTML decks

Turns a Marp HTML export into a lecture note-taking surface: write on slides and
on inserted blank pages with pen, highlighter, selector, laser and eraser, in
several colors and sizes, then save the notes to a file, load them back, or
print the annotated deck to PDF. Built for live writing in class with a mix of
input devices (pen tablet or iPad pencil, mouse, trackpad, touch).

It is theme-agnostic, plain JavaScript and CSS, and has no runtime
dependencies: everything is inlined into the HTML file, which keeps working
offline from `file://`.

## Usage

```bash
marp deck.md --html -o deck.html
node .cmd/inject-annotator.mjs deck.html                # in place
node .cmd/inject-annotator.mjs deck.html out.html       # or to another file
```

The injector can be run from any directory and is idempotent: running it again
on an injected file replaces the previous injection.

With annotate mode off, the deck behaves exactly like stock Marp (navigation,
presenter view, fullscreen, print). Press `A` or the pencil button to switch it
on; the full toolbar appears, with every tool, color, size and action as a
direct button (no menus).

| Key | Action |
| --- | --- |
| `A` | Annotate mode on/off |
| `P` / `H` | Pen (pressure-sensitive with a stylus) / highlighter |
| `S` | Select: drag a box, or circle strokes for a lasso; drag to move; color/size buttons restyle; `Delete` removes |
| `L` | Laser pointer (not saved) |
| `E` / `Shift+E` | Stroke eraser / partial eraser |
| `1`–`4` | Size S, M, L, XL |
| `Shift` while drawing | Straight line |
| `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` | Undo / redo |
| `B` | Insert a blank page (plain, lined or grid) after the current page |
| `←` `→` `PgUp` `PgDn` `Space` | Slide → its blank pages → next slide |
| `G`, a number, `Enter` | Jump to that slide (`G`, `Enter` opens the slide overview; `Esc` cancels) |
| `Ctrl/Cmd+S` | Save notes |

- **Save / load:** the save button (or `Ctrl/Cmd+S`) downloads
  `<deck-title>-notes.json`. Load it with the load button or by dropping the
  file on the window. Notes made for a different deck load with a warning.
  Notes are never stored automatically; the page warns before closing when
  notes are unsaved.
- **PDF:** the print button opens the print dialog; choose "Save as PDF". Every
  slide is printed with its notes, followed by its blank pages.
- **Presenter view:** notes, blank pages and the laser are mirrored live between
  the presenter window (`p`) and the audience window.
- **Input:** pressure-sensitive width for pens, constant width for mouse and
  touch. Touch input is ignored once a stylus has been seen (palm rejection).
  From then on a quick two-finger swipe changes the page (left: next, right:
  previous); one finger or a resting palm never does. The large ‹ › buttons at
  the two ends of the toolbar do the same.
- **Page counter and overview:** the counter shows the slide and the number of
  slides, e.g. `3 / 44`; `3 / 44 · +2 blank` when blank pages follow, and
  `3 / 44 · blank 1/2` on them. Click or tap it for a full-screen overview of
  all slides: the current one is outlined, slides with notes or blank pages are
  marked, and a tap jumps there (at its first step, like Marp's own
  navigation, so the presenter view follows). `Esc` or × closes it; arrow keys
  move between thumbnails. With annotate mode off, the grid button next to the
  pencil opens it. The overview is never printed or saved.
- **Toolbar:** can be docked top, right, bottom or left (second button). The dock
  position and the last tool, colors and sizes are remembered in
  `localStorage`; notes themselves are never stored automatically.

## Design

**Vector model, SVG rendering.** Each Marp slide is
`<svg data-marpit-svg viewBox="0 0 1280 720"><foreignObject>…<section>`. The
annotation layer is appended inside that slide `<svg>`, after the
`foreignObject`. It shares the slide's coordinate system, scales with the slide
in every view (normal, fullscreen, presenter), and is printed by Marp's own
print CSS. The slide size is read from the viewBox, so 4:3 decks work too.
Pointer positions are mapped with `svg.getScreenCTM().inverse()`.

**Strokes.** Pen strokes are filled outline polygons (smoothing, pressure to
width, round caps). Highlighter strokes are wide, flat and translucent
(`mix-blend-mode: multiply`), drawn beneath pen strokes. The laser is a dot with
a short fading trail; it is never stored, printed or undone.

**Blank pages** are shown as an overlay over the current slide (plain, ruled or
grid paper) with their own annotation layer. Before printing, real page
elements are inserted after the owning slide and removed afterwards.

**Undo** is a single command stack per document covering draw, erase, partial
erase, move, restyle, delete, clear page and blank-page insert/delete/paper.

### Save-file format

```json
{
  "format": "marp-notes", "version": 1,
  "deck": { "title": "…", "slides": 17, "size": [1280, 720] },
  "pages": [
    { "id": "s3", "kind": "slide", "slide": 3, "strokes": [ … ] },
    { "id": "b1", "kind": "blank", "after": 3, "paper": "grid", "strokes": [ … ] }
  ]
}
```

A stroke is `{ "id", "tool": "pen"|"highlighter", "color", "size", "points":
[[x, y, pressure], …] }`. Slides without notes are omitted.

### Code layout

```
lib/annotate/
  geometry.js   pure: smoothing, outline polygon, hit tests, splitting, bbox
  model.js      pure: document, pages, strokes, commands, (de)serialization
  render.js     DOM: SVG layers, stroke paths, paper patterns, selection box
  input.js      DOM: pointer handling, palm rejection, coordinate mapping
  tools.js      tool behaviours (pen, highlighter, erasers, selector, laser)
  pages.js      blank pages, navigation, page counter, print insertion
  overview.js   slide overview (lazy thumbnails) and G+number jump
  io.js         save/load/drag-and-drop, beforeunload, print-to-PDF
  sync.js       live mirror between presenter view and audience window
  toolbar.js    toolbar UI and keyboard shortcuts
  main.js       wiring and bootstrap
lib/annotate.css
.cmd/inject-annotator.mjs   inlines the modules (in this order) and the CSS
```

The modules share one namespace object (`window.MarpNotes`); there is no
bundler. `geometry.js` and `model.js` also load under Node for the unit tests.

## Tests

```bash
node --test test/*.test.js          # unit tests, no install needed
cd test && npm install && npm run smoke
```

The smoke test builds `examples/template.md` with marp-cli, injects the
note-taker and drives it in headless Chrome via `puppeteer-core` (drawing with
each tool, blank pages, save/load, presenter sync, PDF export). It needs
`marp` on the `PATH`, Google Chrome (or `CHROME_PATH`), and `pdfinfo` /
`pdftoppm` (poppler). Screenshots are written to `test/screenshots/`.
