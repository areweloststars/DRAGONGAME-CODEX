'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const core = require('../core.js');
const { plan, png } = require('./helpers.cjs');
const pack = () => ({ format: core.ART_FORMAT, deckId: plan.deckId, sceneId: plan.sceneId,
  sourceFingerprint: core.sourceFingerprint(plan), style: core.STYLE,
  images: [{ wordId: plan.words[0].id, dataUrl: png }] });
test('plan normalization and prompts preserve order, cast and narrative', () => {
  const normalized = core.normalizePlan(plan);
  assert.deepEqual(core.normalizePlan(normalized), normalized);
  assert.deepEqual(normalized.words.map(w => w.word), ['approach', 'protest', 'recommend', 'weakness', 'aim', 'announce', 'passenger']);
  const prompts = core.buildPrompts(plan);
  assert.deepEqual(prompts.map(p => p.wordId), plan.words.map(w => w.id));
  assert.deepEqual(prompts.map(p => p.seed), plan.words.map((_, i) => plan.seed + i));
  assert.match(prompts[0].prompt, /RECTANGULAR WOODEN/);
  assert.match(prompts[2].prompt, /elderly MAN/);
  assert.ok(prompts.every(p => p.prompt.includes(plan.story)));
});
test('content fingerprint allows art revisions but rejects a changed lesson', () => {
  const revised = structuredClone(plan); revised.words[0].visual += ' More mist.';
  assert.equal(core.sourceFingerprint(revised), core.sourceFingerprint(plan));
  assert.notEqual(core.fingerprint(revised), core.fingerprint(plan));
  revised.words[0].meaning += ' revised';
  assert.notEqual(core.sourceFingerprint(revised), core.sourceFingerprint(plan));
  assert.throws(() => core.validateArtPackage(pack(), revised));
});
test('invalid plans and executable/foreign/duplicate art are rejected', () => {
  for (const patch of [{ seed: -1 }, { format: 'other' }, { words: [] }, { words: [...plan.words, plan.words[0]] },
    { words: [{ ...plan.words[0], characterIds: ['unknown'] }] }]) assert.throws(() => core.normalizePlan({ ...plan, ...patch }));
  const p = pack();
  assert.equal(core.validateArtPackage(p, plan).images.length, 1);
  assert.throws(() => core.validateArtPackage({ ...p, deckId: 'another' }, plan));
  assert.throws(() => core.validateArtPackage({ ...p, images: [...p.images, ...p.images] }, plan));
  assert.throws(() => core.validateArtPackage({ ...p, images: [{ ...p.images[0], dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' }] }, plan));
});
test('raster dimension limits reject corrupt and oversized images', () => {
  assert.deepEqual(core.rasterDimensions(png), { width: 1, height: 1 });
  const huge = Buffer.from(png.split(',')[1], 'base64'); huge.writeUInt32BE(9000, 16);
  assert.throws(() => core.rasterDimensions('data:image/png;base64,' + huge.toString('base64')));
  assert.throws(() => core.rasterDimensions('data:image/jpeg;base64,/9j/AAAAAAAAAAAAAAAA'));
});
test('same core runs without Node globals in a browser context', () => {
  const context = vm.createContext({ atob });
  vm.runInContext(fs.readFileSync(require.resolve('../core.js'), 'utf8'), context);
  assert.equal(context.VocaImageEngine.sourceFingerprint(plan), core.sourceFingerprint(plan));
  assert.equal(context.VocaImageEngine.rasterDimensions(png).width, 1);
});
