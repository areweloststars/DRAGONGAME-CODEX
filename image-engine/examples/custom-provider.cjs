'use strict';
// Test fixture only: no model, external service or network. The 1px image proves
// that a different renderer can satisfy the contract; it is not finished artwork.
const { generateWithProvider } = require('..');
const plan = require('./dragon-mist.voca-plan.json');
const provider = {
  metadata: { name: 'offline-example', version: 1 },
  plan: prompt => ({ prompt: prompt.prompt, seed: prompt.seed }),
  async render(job, signal) {
    signal?.throwIfAborted();
    return { mime: 'image/png', dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=' };
  }
};
if (require.main === module) generateWithProvider(plan, provider).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = provider;
