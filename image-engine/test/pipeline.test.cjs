'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { generateWithProvider } = require('../pipeline.cjs');
const { atomicJSON } = require('../io.cjs');
const { plan, temporary, fakeProvider } = require('./helpers.cjs');
test('dry run builds seven jobs without preparing, rendering or writing cache', async t => {
  const dir = await temporary(t), cacheDir = path.join(dir, 'cache'), provider = fakeProvider();
  const result = await generateWithProvider(plan, provider, { dryRun: true, cacheDir });
  assert.equal(result.jobs.length, 7); assert.equal(provider.calls.prepare, 0); assert.equal(provider.calls.render.length, 0);
  await assert.rejects(fs.stat(cacheDir), { code: 'ENOENT' });
});
test('sequential rendering, warm cache and provider version invalidation', async t => {
  const cacheDir = await temporary(t), provider = fakeProvider();
  const first = await generateWithProvider(plan, provider, { cacheDir });
  assert.equal(provider.calls.prepare, 1);
  assert.deepEqual(first.images.map(im => im.wordId), plan.words.map(w => w.id));
  const cached = fakeProvider();
  const second = await generateWithProvider(plan, cached, { cacheDir });
  assert.equal(cached.calls.prepare, 0); assert.equal(cached.calls.render.length, 0);
  assert.ok(second.timings.images.every(im => im.cached));
  const changed = fakeProvider(); changed.metadata.version = 2;
  await generateWithProvider(plan, changed, { cacheDir });
  assert.equal(changed.calls.render.length, 7);
});
test('partial failure retains successful images for a later resume', async t => {
  const cacheDir = await temporary(t), provider = fakeProvider(), original = provider.render;
  let count = 0;
  provider.render = async job => { if (++count === 3) throw new Error('fixture failure'); return original(job); };
  await assert.rejects(generateWithProvider(plan, provider, { cacheDir }), /fixture failure/);
  assert.equal((await fs.readdir(cacheDir)).length, 2);
  const resumed = fakeProvider();
  const result = await generateWithProvider(plan, resumed, { cacheDir });
  assert.equal(resumed.calls.render.length, 5);
  assert.deepEqual(result.timings.images.map(i => i.cached), [true, true, false, false, false, false, false]);
});
test('corrupt cache is ignored and invalid render is never persisted', async t => {
  const cacheDir = await temporary(t);
  await generateWithProvider(plan, fakeProvider(), { cacheDir });
  const files = await fs.readdir(cacheDir); await fs.writeFile(path.join(cacheDir, files[0]), '{bad');
  const provider = fakeProvider(); await generateWithProvider(plan, provider, { cacheDir });
  assert.equal(provider.calls.render.length, 1);
  const invalid = fakeProvider(); invalid.metadata.version = 'bad';
  invalid.render = async () => ({ mime: 'image/png', dataUrl: 'data:image/png;base64,AAAA' });
  await assert.rejects(generateWithProvider(plan, invalid, { cacheDir }));
  assert.equal((await fs.readdir(cacheDir)).length, 7);
});
test('cancellation between images stops subsequent work', async t => {
  const cacheDir = await temporary(t), provider = fakeProvider(), controller = new AbortController();
  await assert.rejects(generateWithProvider(plan, provider, { cacheDir, signal: controller.signal,
    onProgress: ({ index }) => { if (index === 2) controller.abort(new Error('stop now')); } }), /stop now/);
  assert.equal(provider.calls.render.length, 1);
});
test('exclusive output creation protects files that appear after an earlier check', async t => {
  const file = path.join(await temporary(t), 'result.json');
  await atomicJSON(file, { original: true }, { overwrite: false });
  await assert.rejects(atomicJSON(file, { replaced: true }, { overwrite: false }), { code: 'EEXIST' });
  assert.deepEqual(JSON.parse(await fs.readFile(file)), { original: true });
});
