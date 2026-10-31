'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../core.js');
const { localBaseURL, modelsWithDefaults, buildWorkflow, validateModels, ComfyClient, generatePackage } = require('../comfy.cjs');
const { plan, png } = require('./helpers.cjs');
function serverInfo() {
  const workflow = buildWorkflow(core.buildPrompts(plan)[0]), models = modelsWithDefaults();
  const info = Object.fromEntries(Object.values(workflow).map(node => [node.class_type, { input: { required: {} } }]));
  for (const [node, key, value] of [['UNETLoader', 'unet_name', models.unet], ['UNETLoader', 'weight_dtype', models.weightDtype],
    ['DualCLIPLoader', 'clip_name1', models.clip], ['DualCLIPLoader', 'clip_name2', models.t5], ['DualCLIPLoader', 'type', 'flux'],
    ['VAELoader', 'vae_name', models.vae], ['KSampler', 'sampler_name', 'euler'], ['KSampler', 'scheduler', 'simple']]) {
    info[node].input.required[key] = [[value]];
  }
  return info;
}
test('Comfy endpoint and model names stay local and bounded', () => {
  assert.equal(localBaseURL('http://localhost:8188').hostname, '127.0.0.1');
  for (const url of ['https://example.com', 'http://127.0.0.1/path', 'http://user:pass@localhost', 'file:///tmp/image', 'http://localhost/?x=1']) assert.throws(() => localBaseURL(url));
  for (const unet of ['../file', 'C:\\file', '/root/file', '%2e%2e/file']) assert.throws(() => modelsWithDefaults({ unet }));
  assert.throws(() => new ComfyClient({ timeoutMs: 0 }));
});
test('preflight checks model choices and nodes before rendering', () => {
  const workflow = buildWorkflow(core.buildPrompts(plan)[0]);
  validateModels(serverInfo(), modelsWithDefaults(), workflow);
  const missing = serverInfo(); delete missing.VAELoader;
  assert.throws(() => validateModels(missing, modelsWithDefaults(), workflow), /VAELoader/);
  assert.throws(() => validateModels(serverInfo(), modelsWithDefaults({ unet: 'not-installed.safetensors' }), workflow), /not-installed/);
});
test('Comfy dry-run never touches its client; generation preflights once', async () => {
  const calls = [];
  const client = { request: async route => { calls.push(route); return serverInfo(); },
    generate: async () => { calls.push('render'); return { dataUrl: png, mime: 'image/png' }; } };
  const dry = await generatePackage(plan, { client, dryRun: true });
  assert.equal(dry.jobs.length, 7); assert.deepEqual(calls, []);
  const result = await generatePackage(plan, { client });
  assert.equal(result.images.length, 7); assert.deepEqual(calls, ['/object_info', ...Array(7).fill('render')]);
});
test('client follows its completed job and safely reads the output', async () => {
  const client = new ComfyClient(), routes = [];
  client.request = async (route, options) => {
    routes.push(route);
    if (route === '/prompt') return { prompt_id: 'owned-id' };
    if (route.startsWith('/history')) return { 'owned-id': { status: { completed: true }, outputs: { '9': { images: [{ filename: 'render.png', subfolder: '', type: 'output' }] } } } };
    assert.equal(options.image, true); return Buffer.from(png.split(',')[1], 'base64');
  };
  const image = await client.generate({});
  assert.equal(image.dataUrl, png); assert.equal(routes.length, 3);
  assert.match(routes[2], /^\/view\?filename=render.png&subfolder=&type=output$/);
});
test('unsafe output or failed job deletes only its own pending queue entry', async () => {
  for (const failure of [false, true]) {
    const client = new ComfyClient(), calls = [];
    client.request = async (route, options) => {
      calls.push({ route, body: options?.body });
      if (route === '/prompt') return { prompt_id: 'owned-id' };
      if (route === '/queue') return {};
      return { 'owned-id': failure ? { status: { status_str: 'error' } } :
        { status: { completed: true }, outputs: { '9': { images: [{ filename: '../bad.png', type: 'output' }] } } } };
    };
    await assert.rejects(client.generate({}));
    assert.deepEqual(calls.at(-1), { route: '/queue', body: { delete: ['owned-id'] } });
    assert.ok(!calls.some(c => c.route === '/interrupt' || c.route.startsWith('/view')));
  }
});
