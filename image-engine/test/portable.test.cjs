'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { exportEngine } = require('../scripts/export.cjs');
const { temporary } = require('./helpers.cjs');
const engine = path.resolve(__dirname, '..');
const run = (cwd, args) => execFileSync(process.execPath, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
test('CLI dry-run honors configuration and explicit overrides without a server', async t => {
  const dir = await temporary(t), file = path.join(dir, 'planned.json');
  run(engine, ['generate.cjs', 'examples/dragon-mist.voca-plan.json', '--config', 'config.example.json', '--unet', 'custom.safetensors', '--dry-run', '--out', file]);
  const result = JSON.parse(await fs.readFile(file));
  assert.equal(result.jobs.length, 7); assert.equal(result.models.unet, 'custom.safetensors');
  assert.throws(() => run(engine, ['generate.cjs', 'examples/dragon-mist.voca-plan.json', '--dry-run', '--out', file]));
  assert.equal(JSON.parse(await fs.readFile(file)).models.unet, 'custom.safetensors');
});
test('CLI rejects invalid input, unsafe endpoints and unknown config', async t => {
  const dir = await temporary(t), bad = path.join(dir, 'invalid.json');
  await fs.writeFile(bad, '{bad json');
  for (const args of [[bad, '--dry-run'], ['examples/dragon-mist.voca-plan.json'],
    ['examples/dragon-mist.voca-plan.json', '--dry-run', '--comfy', 'https://example.com']]) {
    assert.notEqual(spawnSync(process.execPath, ['generate.cjs', ...args], { cwd: engine }).status, 0);
  }
  await fs.writeFile(bad, '{"apiKey":"not-a-real-key"}');
  assert.throws(() => run(engine, ['generate.cjs', 'examples/dragon-mist.voca-plan.json', '--dry-run', '--config', bad]));
});
test('exported package works alone in a different path, with no app or dependencies', async t => {
  const dir = await temporary(t), out = path.join(dir, '독립 package');
  const exported = await exportEngine(out);
  assert.equal(exported.files, require('../export-manifest.json').length);
  await assert.rejects(exportEngine(out), { code: 'EEXIST' });
  await assert.rejects(fs.stat(path.join(out, 'node_modules')), { code: 'ENOENT' });
  const result = JSON.parse(run(out, ['generate.cjs', 'examples/dragon-mist.voca-plan.json', '--dry-run']));
  assert.equal(result.jobs.length, 7);
  assert.equal(run(out, ['-e', 'process.stdout.write(String(typeof require(".").generateWithProvider))']), 'function');
  const fixture = JSON.parse(run(out, ['examples/custom-provider.cjs']));
  assert.equal(fixture.images.length, 7);
  const content = (await Promise.all(require('../export-manifest.json').map(file => fs.readFile(path.join(out, file), 'utf8')))).join('\n');
  assert.ok(!/C:[\\/]Users[\\/]mypc/.test(content));
  assert.ok(!require('../export-manifest.json').some(file => /\.voca-art\.json$|\.env$|\.cache|INTEGRATION-RESULT|CLAUDE-HANDOFF/.test(file)));
});
