'use strict';
const { createHash } = require('node:crypto');
const path = require('node:path');
const core = require('./core.js');
const { readCache, atomicJSON, validateImage } = require('./io.cjs');

// Providers plan work synchronously, prepare their backend once, then render each job.
// Importing this module never starts a provider or makes network requests.
async function generateWithProvider(rawPlan, provider, options = {}) {
  const plan = core.normalizePlan(rawPlan);
  if (!provider || typeof provider.plan !== 'function' || typeof provider.render !== 'function' ||
      !provider.metadata || typeof provider.metadata.name !== 'string' || !provider.metadata.name.trim()) {
    throw new Error('제공자는 metadata.name, plan(prompt), render(job, signal)을 제공해야 합니다.');
  }
  const metadata = JSON.parse(JSON.stringify(provider.metadata));
  const jobs = core.buildPrompts(plan).map(prompt => ({ prompt, workflow: provider.plan(prompt) }));
  if (options.dryRun) return {
    format: 'voca-story-dry-run/v1', sourceFingerprint: core.sourceFingerprint(plan), plan,
    engine: metadata, models: metadata.models, workflowVersion: metadata.workflowVersion, jobs
  };
  const started = performance.now(), images = [], timings = [];
  let prepared = false, dataBytes = 0;
  for (let i = 0; i < jobs.length; i++) {
    options.signal?.throwIfAborted();
    const { prompt, workflow } = jobs[i], begin = performance.now();
    const key = createHash('sha256').update(JSON.stringify({ version: 1, plan, metadata, prompt, workflow })).digest('hex');
    let image = await readCache(options.cacheDir, key);
    const cached = Boolean(image);
    options.onProgress?.({ index: i + 1, total: jobs.length, wordId: prompt.wordId, cached });
    if (!image) {
      if (!prepared) { await provider.prepare?.(workflow, options.signal); prepared = true; }
      options.signal?.throwIfAborted();
      image = validateImage(await provider.render(workflow, options.signal));
      options.signal?.throwIfAborted();
      if (options.cacheDir) await atomicJSON(path.join(options.cacheDir, `${key}.json`), { key, image });
    }
    dataBytes += Buffer.byteLength(image.dataUrl, 'utf8');
    if (dataBytes > core.MAX_PACKAGE_BYTES - 1024 * 1024) throw new Error('그림 묶음이 50 MiB를 초과합니다. 완료된 그림은 캐시에 남아 있습니다.');
    images.push({ wordId: prompt.wordId, ...image, prompt: prompt.prompt, seed: prompt.seed });
    timings.push({ wordId: prompt.wordId, durationMs: Math.round(performance.now() - begin), cached });
  }
  const safe = core.validateArtPackage({ format: core.ART_FORMAT, deckId: plan.deckId, sceneId: plan.sceneId,
    sourceFingerprint: core.sourceFingerprint(plan), style: plan.style, images }, plan);
  const result = { ...safe, engine: metadata, generatedAt: new Date().toISOString(), timings: { totalMs: Math.round(performance.now() - started), images: timings } };
  if (Buffer.byteLength(JSON.stringify(result, null, 2), 'utf8') > core.MAX_PACKAGE_BYTES) throw new Error('그림 묶음 파일이 50 MiB를 초과합니다.');
  return result;
}
module.exports = { generateWithProvider };
