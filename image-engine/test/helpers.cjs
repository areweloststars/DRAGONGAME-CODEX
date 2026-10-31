'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const plan = require('../examples/dragon-mist.voca-plan.json');
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=';
async function temporary(t) {
  const root = path.resolve(__dirname, '../artifacts/test-tmp');
  await fs.mkdir(root, { recursive: true });
  const dir = await fs.mkdtemp(path.join(root, 'voca 엔진 test '));
  t.after(async () => {
    const relative = path.relative(root, path.resolve(dir));
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Unsafe temporary directory');
    await fs.rm(dir, { recursive: true, force: true });
  });
  return dir;
}
function fakeProvider() {
  const calls = { prepare: 0, render: [] };
  return { calls, metadata: { name: 'test-fixture', version: 1 },
    plan: prompt => ({ wordId: prompt.wordId, seed: prompt.seed }),
    prepare: async () => { calls.prepare++; },
    render: async job => { calls.render.push(job); return { dataUrl: png, mime: 'image/png' }; }
  };
}
module.exports = { plan, png, temporary, fakeProvider };
