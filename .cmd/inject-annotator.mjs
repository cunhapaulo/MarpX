#!/usr/bin/env node
/**
 * Inject the lecture note-taker (lib/annotate/*.js + lib/annotate.css) into a
 * Marp-generated HTML file. Modules are concatenated in dependency order into
 * one <script>; each module is its own IIFE sharing window.MarpNotes.
 * Usage: node .cmd/inject-annotator.mjs <input.html> [output.html]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const [,, inPath, outPath] = process.argv;
if (!inPath) {
  console.error("Usage: node .cmd/inject-annotator.mjs <input.html> [output.html]");
  process.exit(1);
}

const targetOut = outPath || inPath;

// Resolve assets relative to this script, so it works from any directory.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const libDir = path.join(repoRoot, 'lib', 'annotate');
const cssPath = path.join(repoRoot, 'lib', 'annotate.css');

// Order matters (see docs/note-taker.md). Optional modules may be absent.
const MODULES = [
  ['geometry.js', true],
  ['model.js', true],
  ['render.js', true],
  ['input.js', true],
  ['tools.js', true],
  ['pages.js', false],
  ['overview.js', false],
  ['io.js', false],
  ['sync.js', false],
  ['toolbar.js', true],
  ['main.js', true],
];

const missing = [cssPath, ...MODULES.filter(([, req]) => req).map(([f]) => path.join(libDir, f))]
  .filter(f => !fs.existsSync(f));
if (missing.length) {
  missing.forEach(f => console.error(`Missing: ${f}`));
  process.exit(2);
}

const js = MODULES
  .map(([f]) => path.join(libDir, f))
  .filter(f => fs.existsSync(f))
  .map(f => `/* ── ${path.basename(f)} ── */\n${fs.readFileSync(f, 'utf8')}`)
  .join('\n');
const css = fs.readFileSync(cssPath, 'utf8');

const MARK_START = '<!-- Marp Notes -->';
const MARK_END = '<!-- End Marp Notes -->';

let html = fs.readFileSync(inPath, 'utf8');

// Re-running on an already injected file replaces the previous injection.
const prev = html.indexOf(MARK_START);
if (prev !== -1) {
  const end = html.indexOf(MARK_END, prev);
  if (end !== -1) {
    let cut = end + MARK_END.length;
    if (html[cut] === '\n') cut++; // the newline we added, so re-runs do not grow the file
    html = html.slice(0, prev) + html.slice(cut);
  }
}

// "</script" inside the inlined code would end the script element early.
const safeJs = js.replace(/<\/script/gi, '<\\/script');

const injection = `${MARK_START}
<style>
${css}
</style>
<script>
${safeJs}
</script>
${MARK_END}
`;

// Inject before the last </body>
const bodyEnd = html.lastIndexOf('</body>');
html = bodyEnd !== -1 ? html.slice(0, bodyEnd) + injection + html.slice(bodyEnd) : html + injection;

fs.writeFileSync(targetOut, html, 'utf8');
console.error(`Injected Marp Notes into ${targetOut}`);
