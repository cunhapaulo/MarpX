'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const injector = path.resolve(__dirname, '..', '.cmd', 'inject-annotator.mjs');

test('injector works from any cwd and is idempotent', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'marp-notes-inject-'));
  try {
    const html = path.join(dir, 'deck.html');
    fs.writeFileSync(html, '<html><body><div>deck</div></body></html>');
    execFileSync('node', [injector, html], { cwd: dir, stdio: 'ignore' });
    const once = fs.readFileSync(html, 'utf8');
    execFileSync('node', [injector, html], { cwd: dir, stdio: 'ignore' });
    const twice = fs.readFileSync(html, 'utf8');
    assert.equal(twice, once, 're-running does not change the file');
    assert.equal(once.split('<!-- Marp Notes -->').length, 2, 'one injection');
    for (const f of ['geometry', 'model', 'render', 'input', 'tools', 'pages', 'overview', 'io', 'sync', 'toolbar', 'main']) {
      assert.ok(once.includes(`/* ── ${f}.js ── */`), `${f}.js inlined`);
    }
    const order = ['geometry', 'model', 'render', 'input', 'tools', 'pages', 'overview', 'io', 'sync', 'toolbar', 'main']
      .map(f => once.indexOf(`/* ── ${f}.js ── */`));
    assert.deepEqual(order, order.slice().sort((a, b) => a - b), 'spec order');
    const script = once.slice(once.indexOf('<script>') + 8, once.lastIndexOf('</script>'));
    assert.ok(!/<\/script/i.test(script), 'no premature </script>');
    assert.ok(once.endsWith('<!-- End Marp Notes -->\n</body></html>'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
