'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

// pages.js registers itself on globalThis.MarpNotes (no module.exports).
require('../lib/annotate/pages.js');
const pages = globalThis.MarpNotes.pages;
const { parseSlideNumber } = pages;
const formatLabel = (pos, total) => pages.formatLabel(pos, total).replace(/\u2009/g, ' ');

test('page counter shows the slide and the number of Marp slides', () => {
  assert.equal(pages.formatLabel({ slide: 3, index: 1, count: 1 }, 44), '3\u2009/\u200944', 'thin spaces');
  assert.equal(formatLabel({ slide: 3, index: 1, count: 1 }, 44), '3 / 44');
  assert.equal(formatLabel({ slide: 44, index: 1, count: 1 }, 44), '44 / 44');
});

test('page counter on a slide followed by blank pages, and on a blank page', () => {
  assert.equal(formatLabel({ slide: 3, index: 1, count: 3 }, 44), '3 / 44 · +2 blank');
  assert.equal(formatLabel({ slide: 3, index: 2, count: 3 }, 44), '3 / 44 · blank 1/2');
  assert.equal(formatLabel({ slide: 3, index: 3, count: 3 }, 44), '3 / 44 · blank 2/2');
  assert.equal(formatLabel({ slide: 2, index: 2, count: 2 }, 9), '2 / 9 · blank 1/1');
});

test('typed slide numbers are clamped to the deck; anything else is no number', () => {
  assert.equal(parseSlideNumber('12', 44), 12);
  assert.equal(parseSlideNumber('007', 44), 7);
  assert.equal(parseSlideNumber('99', 44), 44);
  assert.equal(parseSlideNumber('0', 44), 1);
  assert.equal(parseSlideNumber('', 44), null);
  assert.equal(parseSlideNumber('1a', 44), null);
  assert.equal(parseSlideNumber(undefined, 44), null);
});
