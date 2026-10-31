const test = require('node:test');
const assert = require('node:assert/strict');
const { bootPage } = require('./page.cjs');
const core = require('../src/08-image-engine.js');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=';
function fixture(t) {
  const p = bootPage(); t.after(() => p.close());
  const plan = p.json('artMakePlan(DECK.id, SCENES[0].key)');
  const pack = { format: core.ART_FORMAT, deckId: plan.deckId, sceneId: plan.sceneId, sourceFingerprint: core.sourceFingerprint(plan), style: core.STYLE, images: [{ wordId: plan.words[0].id, dataUrl: png }] };
  p.window.fixturePlan = plan; p.window.fixturePack = pack;
  return { p, plan, pack };
}
test('portable example plan matches the actual game lesson', t => {
  const { plan } = fixture(t);
  const example = require('../../image-engine/examples/dragon-mist.voca-plan.json');
  assert.equal(core.sourceFingerprint(example), core.sourceFingerprint(plan));
});
test('art contract rejects other decks, changed stories, duplicate words and executable images', t => {
  const { plan, pack } = fixture(t);
  assert.equal(core.validateArtPackage(pack, plan).images.length, 1);
  assert.throws(() => core.validateArtPackage({ ...pack, deckId: 'other' }, plan));
  assert.throws(() => core.validateArtPackage(pack, { ...plan, story: plan.story + ' changed' }));
  assert.throws(() => core.validateArtPackage({ ...pack, images: [...pack.images, ...pack.images] }, plan));
  assert.throws(() => core.validateArtPackage({ ...pack, images: [{ ...pack.images[0], dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+' }] }, plan));
  assert.match(plan.characters.find(c => c.id === 'knight').description, /slim.*RECTANGULAR WOODEN/s);
  assert.match(plan.characters.find(c => c.id === 'elder').description, /elderly MAN/);
});
test('missing IndexedDB leaves home usable; corrupt and oversized raster headers are rejected', async t => {
  const { p } = fixture(t);
  await p.run('artHydrateCurrent()');
  assert.equal(p.document.querySelectorAll('[data-story-art]').length, 1);
  assert.equal(p.run('STORY_ART.cache.size'), 0);
  p.window.badImage = 'data:image/jpeg;base64,/9j/AAAAAAAAAAAAAAAA';
  assert.throws(() => p.run('artRasterDimensions(window.badImage)'));
  const huge = Buffer.from(png.split(',')[1], 'base64'); huge.writeUInt32BE(9000, 16);
  p.window.badImage = 'data:image/png;base64,' + huge.toString('base64');
  assert.throws(() => p.run('artRasterDimensions(window.badImage)'));
  assert.deepEqual(p.errors, []);
});
test('installed artwork reaches panel and thumbnail without changing learning progress', async t => {
  const { p, plan } = fixture(t);
  await p.run('artHydrateCurrent()');
  const before = p.json('SAVE');
  p.run('artDecodeBitmap = async url => artRasterDimensions(url); StoryArtStore.put = async art => { window.storedArt = art; };');
  assert.equal(await p.run('artInstallPackage(window.fixturePack, window.fixturePlan)'), true);
  assert.equal(p.run(`artNode(${JSON.stringify(plan.sceneId)}).querySelectorAll('image').length`), 1);
  p.run('Object.defineProperty(HTMLElement.prototype, "offsetParent", { get() { return document.body; }, configurable: true }); renderHome(); fillThumbs();');
  assert.match(p.run(`IMG[${JSON.stringify(plan.sceneId)}]`), /watercolor-tile/);
  assert.deepEqual(p.json('SAVE'), before);
  assert.deepEqual(p.errors, []);
});
test('late hydration cannot overwrite a fresh import or a different deck epoch', async t => {
  const { p, plan } = fixture(t);
  await p.run('artHydrateCurrent()');
  p.run('StoryArtStore.get = async (deck, scene) => scene === window.fixturePlan.sceneId ? new Promise(resolve => { window.resolveOldRead = resolve; }) : null;');
  const pending = p.run('artHydrateCurrent()');
  p.run('artDecodeBitmap = async url => artRasterDimensions(url); StoryArtStore.put = async () => {};');
  await p.run('artInstallPackage(window.fixturePack, window.fixturePlan)');
  p.run('window.resolveOldRead(null)'); await pending;
  assert.equal(p.run(`STORY_ART.cache.has(${JSON.stringify(plan.sceneId)})`), true);
  const pending2 = p.run('artHydrateCurrent()');
  p.run("STORY_ART.epoch++; STORY_ART.deckId = 'different'; STORY_ART.cache.clear(); window.resolveOldRead(window.fixturePack);");
  await pending2;
  assert.equal(p.run('STORY_ART.cache.size'), 0);
});
test('closing dialog cancels in-flight import before persistence', async t => {
  const { p } = fixture(t);
  await p.run('artHydrateCurrent()');
  p.run('StoryArtStore.get = async () => null;');
  await p.run('artShowDialog(DECK.id, SCENES[0].key)');
  p.run('window.savedState = STORY_ART.dialog; artDecodeBitmap = () => new Promise(resolve => { window.finishDecode = resolve; }); StoryArtStore.put = async () => { window.didWrite = true; };');
  const pending = p.run('artInstallPackage(window.fixturePack, window.fixturePlan, () => STORY_ART.dialog === window.savedState)');
  p.run('closeOverlay(); window.finishDecode();');
  assert.equal(await pending, false);
  assert.equal(p.window.didWrite, undefined);
});
test('muted illustration preview never preloads a voice model', async t => {
  const { p } = fixture(t);
  p.run('SAVE.narr = false; Voice.start = () => { window.startedVoice = true; }; voiceWarm(true);');
  await Promise.resolve();
  assert.equal(p.window.startedVoice, undefined);
});
