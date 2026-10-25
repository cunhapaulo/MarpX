'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

// input.js registers itself on globalThis.MarpNotes (no module.exports).
require('../lib/annotate/input.js');
const { swipeDirection } = globalThis.MarpNotes.input;

test('two-finger swipe: left is next, right is previous', () => {
  assert.equal(swipeDirection(-150, 10, 200), 1);
  assert.equal(swipeDirection(150, -10, 200), -1);
});

test('two-finger swipe ignores short, slow and diagonal moves', () => {
  assert.equal(swipeDirection(-50, 0, 200), 0); // too short
  assert.equal(swipeDirection(-150, 0, 1500), 0); // resting hand drifting
  assert.equal(swipeDirection(-150, -100, 200), 0); // not clearly horizontal
});
