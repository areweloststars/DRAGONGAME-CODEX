'use strict';

const { createHash, randomUUID } = require('node:crypto');
const { setTimeout: delay } = require('node:timers/promises');
const { imageMime, validateImage, atomicJSON } = require('./io.cjs');

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_PACKAGE_BYTES = 50 * 1024 * 1024;
const WORKFLOW_VERSION = 'flux-schnell-core-v1';
const DEFAULT_MODELS = Object.freeze({
  unet: 'flux1-schnell.safetensors',
  clip: 'clip_l.safetensors',
  t5: 't5xxl_fp8_e4m3fn_scaled.safetensors',
  vae: 'ae.safetensors',
  weightDtype: 'default'
});

function localBaseURL(value = 'http://127.0.0.1:8188') {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('ComfyUI 주소는 경로·인증정보 없는 localhost/127.0.0.1/[::1] 주소여야 합니다.');
  }
  // Pin localhost to a loopback literal rather than trusting DNS resolution.
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
  return url;
}

function relativeName(value, allowSubfolders = true) {
  if (typeof value !== 'string' || !value || value.length > 512 ||
      /[\\:%\x00-\x1f]/.test(value) || value.startsWith('/') ||
      value.split('/').some(part => !part || part === '.' || part === '..') ||
      (!allowSubfolders && value.includes('/'))) {
    throw new Error('이미지/모델 파일명에 허용되지 않는 경로가 있습니다.');
  }
  return value;
}

function modelsWithDefaults(overrides = {}) {
  const models = { ...DEFAULT_MODELS, ...overrides };
  for (const name of ['unet', 'clip', 't5', 'vae']) relativeName(models[name]);
  if (!['default', 'fp8_e4m3fn', 'fp8_e4m3fn_fast', 'fp8_e5m2'].includes(models.weightDtype)) {
    throw new Error('지원하지 않는 weight dtype입니다.');
  }
  return models;
}

function buildWorkflow(prompt, overrides) {
  const models = modelsWithDefaults(overrides);
  const { width, height, seed } = prompt;
  if (![width, height].every(n => Number.isInteger(n) && n >= 256 && n <= 1536 && n % 16 === 0) ||
      !Number.isSafeInteger(seed) || seed < 0 || typeof prompt.prompt !== 'string' || !prompt.prompt.trim()) {
    throw new Error('프롬프트의 크기, seed 또는 내용이 올바르지 않습니다.');
  }
  return {
    '1': { class_type: 'UNETLoader', inputs: { unet_name: models.unet, weight_dtype: models.weightDtype } },
    '2': { class_type: 'DualCLIPLoader', inputs: { clip_name1: models.clip, clip_name2: models.t5, type: 'flux' } },
    '3': { class_type: 'VAELoader', inputs: { vae_name: models.vae } },
    '4': { class_type: 'CLIPTextEncode', inputs: { text: prompt.prompt, clip: ['2', 0] } },
    // CFG 1 means schnell does not use negative guidance. Keep the required input linked.
    '5': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['2', 0] } },
    '6': { class_type: 'EmptySD3LatentImage', inputs: { width, height, batch_size: 1 } },
    '7': { class_type: 'KSampler', inputs: {
      model: ['1', 0], seed, steps: 4, cfg: 1, sampler_name: 'euler', scheduler: 'simple',
      positive: ['4', 0], negative: ['5', 0], latent_image: ['6', 0], denoise: 1
    } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['7', 0], vae: ['3', 0] } },
    '9': { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: 'voca-story' } }
  };
}

function validateModels(info, models, workflow) {
  for (const node of Object.values(workflow)) {
    if (!info[node.class_type]) throw new Error(`ComfyUI 노드가 없습니다: ${node.class_type}. ComfyUI를 업데이트해 주세요.`);
  }
  const required = [
    ['UNETLoader', 'unet_name', models.unet, 'models/diffusion_models'],
    ['DualCLIPLoader', 'clip_name1', models.clip, 'models/text_encoders'],
    ['DualCLIPLoader', 'clip_name2', models.t5, 'models/text_encoders'],
    ['VAELoader', 'vae_name', models.vae, 'models/vae'],
    ['UNETLoader', 'weight_dtype', models.weightDtype, 'weight dtype'],
    ['DualCLIPLoader', 'type', 'flux', 'CLIP type'],
    ['KSampler', 'sampler_name', 'euler', 'sampler'],
    ['KSampler', 'scheduler', 'simple', 'scheduler']
  ];
  for (const [node, input, value, folder] of required) {
    const choices = info[node]?.input?.required?.[input]?.[0];
    if (!Array.isArray(choices) || !choices.includes(value)) {
      throw new Error(`ComfyUI에서 ${value} 항목을 찾을 수 없습니다 (${folder}). 설치 파일명과 CLI 옵션을 확인해 주세요.`);
    }
  }
}

function cacheKey(plan, models, workflow) {
  return createHash('sha256').update(JSON.stringify({ version: WORKFLOW_VERSION, plan, models, workflow })).digest('hex');
}

async function boundedBody(response, maxBytes) {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw new Error(`ComfyUI 응답이 제한 크기(${maxBytes} bytes)를 초과합니다.`);
  }
  const chunks = [];
  let length = 0;
  if (!response.body) throw new Error('ComfyUI 응답 본문이 없습니다.');
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > maxBytes) throw new Error(`ComfyUI 응답이 제한 크기(${maxBytes} bytes)를 초과합니다.`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, length);
}

function deadline(parent, timeoutMs, message) {
  const controller = new AbortController();
  const cancel = () => controller.abort(parent.reason || new Error('작업을 취소했습니다.'));
  if (parent?.aborted) cancel();
  else parent?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => controller.abort(new Error(message)), timeoutMs);
  return {
    signal: controller.signal,
    close() { clearTimeout(timer); parent?.removeEventListener('abort', cancel); }
  };
}

class ComfyClient {
  constructor({ baseUrl, requestTimeoutMs = 30000, timeoutMs = 30 * 60 * 1000, pollMs = 1000 } = {}) {
    this.base = localBaseURL(baseUrl);
    for (const value of [requestTimeoutMs, timeoutMs, pollMs]) {
      if (!Number.isFinite(value) || value < 1 || value > 24 * 60 * 60 * 1000) throw new Error('시간 제한 옵션이 올바르지 않습니다.');
    }
    Object.assign(this, { requestTimeoutMs, timeoutMs, pollMs });
  }

  async request(route, { signal, body, image = false } = {}) {
    const limited = deadline(signal, this.requestTimeoutMs, 'ComfyUI 요청 시간이 초과되었습니다. 서버 상태를 확인해 주세요.');
    try {
      const response = await fetch(new URL(route, this.base), {
        method: body ? 'POST' : 'GET', redirect: 'error', signal: limited.signal,
        headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined
      });
      if (!response.ok) {
        const details = (await boundedBody(response, 65536)).toString('utf8').slice(0, 600);
        throw new Error(`ComfyUI ${route.split('?')[0]}: HTTP ${response.status} ${details}`);
      }
      const bytes = await boundedBody(response, image ? MAX_IMAGE_BYTES : 16 * 1024 * 1024);
      return image ? bytes : bytes.length ? JSON.parse(bytes.toString('utf8')) : {};
    } catch (error) {
      if (limited.signal.aborted) throw limited.signal.reason;
      if (error.message === 'fetch failed') throw new Error(`ComfyUI에 연결할 수 없습니다 (${this.base.origin}). 로컬 ComfyUI를 실행해 주세요.`, { cause: error });
      throw error;
    } finally { limited.close(); }
  }

  async generate(workflow, signal) {
    const limited = deadline(signal, this.timeoutMs, '이미지 생성 시간이 초과되었습니다. 실행 중 작업은 ComfyUI에서 직접 확인해 주세요.');
    let promptId;
    try {
      const queued = await this.request('/prompt', { signal: limited.signal, body: { prompt: workflow, client_id: randomUUID() } });
      if (queued.error || !/^[A-Za-z0-9_-]{1,128}$/.test(queued.prompt_id || '')) {
        throw new Error(`ComfyUI가 작업을 접수하지 못했습니다: ${JSON.stringify(queued.error || queued.node_errors || queued).slice(0, 600)}`);
      }
      promptId = queued.prompt_id;
      for (;;) {
        limited.signal.throwIfAborted();
        const history = await this.request(`/history/${promptId}`, { signal: limited.signal });
        const result = history[promptId];
        if (result) {
          const failure = result.status?.messages?.find(entry => entry[0] === 'execution_error' || entry[0] === 'execution_interrupted');
          if (result.status?.status_str === 'error' || failure) {
            throw new Error(`ComfyUI 생성 실패: ${failure?.[1]?.exception_message || failure?.[0] || '실행 오류'}`);
          }
          if (result.status?.completed === true) {
            const image = result.outputs?.['9']?.images?.[0];
            if (!image || image.type !== 'output') throw new Error('ComfyUI 완료 결과에 저장된 그림이 없습니다.');
            const filename = relativeName(image.filename, false);
            const subfolder = image.subfolder ? relativeName(image.subfolder) : '';
            const query = new URLSearchParams({ filename, subfolder, type: 'output' });
            const bytes = await this.request(`/view?${query}`, { signal: limited.signal, image: true });
            const mime = imageMime(bytes);
            return { dataUrl: `data:${mime};base64,${bytes.toString('base64')}`, mime };
          }
        }
        await delay(this.pollMs, undefined, { signal: limited.signal });
      }
    } catch (error) {
      // Never clear the queue or call global /interrupt: ComfyUI may be shared.
      // Deleting this ID only removes this task if it is still waiting; active work may continue.
      if (promptId) await this.request('/queue', { body: { delete: [promptId] }, signal: AbortSignal.timeout(2000) }).catch(() => {});
      if (limited.signal.aborted) throw limited.signal.reason;
      throw error;
    } finally { limited.close(); }
  }
}

function createComfyProvider(options = {}) {
  const models = modelsWithDefaults(options.models);
  const client = options.client || new ComfyClient(options);
  return {
    metadata: { name: 'ComfyUI', workflowVersion: WORKFLOW_VERSION, models },
    plan: prompt => buildWorkflow(prompt, models),
    async prepare(job, signal) {
      const info = await client.request('/object_info', { signal });
      validateModels(info, models, job);
    },
    render: (job, signal) => client.generate(job, signal)
  };
}
function generatePackage(rawPlan, options = {}) {
  return require('./pipeline.cjs').generateWithProvider(rawPlan, createComfyProvider(options), options);
}

module.exports = {
  DEFAULT_MODELS, WORKFLOW_VERSION, MAX_IMAGE_BYTES, MAX_PACKAGE_BYTES,
  localBaseURL, modelsWithDefaults, buildWorkflow, validateModels, cacheKey,
  imageMime, validateImage, ComfyClient, createComfyProvider, generatePackage, atomicJSON
};
