#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { generatePackage, atomicJSON } = require('./comfy.cjs');

const HELP = `수채화 판타지 그림 생성 (Node.js 22+, 로컬 ComfyUI)

node image-engine/generate.cjs plan.voca-plan.json --out scene.voca-art.json
node image-engine/generate.cjs plan.voca-plan.json --dry-run --out prompts.dry-run.json

  --out FILE           결과 파일 (기존 파일 보호; 덮어쓰려면 --overwrite)
  --config FILE        JSON 설정 파일 (명시한 CLI 옵션이 우선)
  --dry-run            모델·서버 없이 프롬프트/API 워크플로만 출력
  --comfy URL          기본 http://127.0.0.1:8188 (로컬 주소만 허용)
  --unet FILE          flux1-schnell.safetensors
  --clip FILE          clip_l.safetensors
  --t5 FILE            t5xxl_fp8_e4m3fn_scaled.safetensors
  --vae FILE           ae.safetensors
  --weight-dtype TYPE  default / fp8_e4m3fn / fp8_e4m3fn_fast / fp8_e5m2
  --timeout SECONDS    그림 한 장 제한 시간 (기본 1800)
  --request-timeout S  HTTP 요청 제한 시간 (기본 30)
  --cache-dir DIR      기본 image-engine/.cache
  --no-cache           캐시 읽기/쓰기 사용 안 함
  --overwrite          --out 파일 덮어쓰기
  --help               사용법

API 요금 없이 로컬 모델을 실행합니다. 장비·전력·모델 설치가 필요하며,
참고 그림과 같은 품질이나 인물 일관성, 생성 속도를 보장하지 않습니다.
`;

function seconds(value, fallback) {
  if (value === undefined) return fallback * 1000;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > 86400) throw new Error('시간은 0보다 크고 86400 이하인 초 단위 숫자여야 합니다.');
  return number * 1000;
}

async function main(argv = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, options: {
    out: { type: 'string' }, config: { type: 'string' }, 'dry-run': { type: 'boolean' }, comfy: { type: 'string' },
    unet: { type: 'string' }, clip: { type: 'string' }, t5: { type: 'string' }, vae: { type: 'string' },
    'weight-dtype': { type: 'string' }, timeout: { type: 'string' }, 'request-timeout': { type: 'string' },
    'cache-dir': { type: 'string' }, 'no-cache': { type: 'boolean' }, overwrite: { type: 'boolean' }, help: { type: 'boolean' }
  } });
  if (values.help) { process.stdout.write(HELP); return; }
  if (positionals.length !== 1) throw new Error('계획 JSON 파일 하나를 지정해 주세요. --help로 사용법을 볼 수 있습니다.');
  if (!values.out && !values['dry-run']) throw new Error('결과 파일을 --out scene.voca-art.json으로 지정해 주세요.');
  const input = path.resolve(positionals[0]);
  if (values.out && path.resolve(values.out).toLowerCase() === input.toLowerCase()) throw new Error('입력 계획 파일을 결과로 덮어쓸 수 없습니다.');
  if ((await fs.stat(input)).size > 1024 * 1024) throw new Error('계획 파일은 1 MiB 이하여야 합니다.');
  if (values.out && !values.overwrite) {
    let exists = false;
    try { await fs.access(values.out); exists = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (exists) throw new Error('결과 파일이 이미 있습니다. 다른 --out 경로나 --overwrite를 사용해 주세요.');
  }
  const plan = JSON.parse((await fs.readFile(input, 'utf8')).replace(/^\uFEFF/, ''));
  let config = {};
  if (values.config) {
    if ((await fs.stat(values.config)).size > 65536) throw new Error('설정 파일은 64 KiB 이하여야 합니다.');
    config = JSON.parse((await fs.readFile(values.config, 'utf8')).replace(/^\uFEFF/, ''));
    if (!config || typeof config !== 'object' || Array.isArray(config) ||
        Object.keys(config).some(key => !['comfy', 'models', 'timeout', 'requestTimeout'].includes(key))) throw new Error('지원하지 않는 설정 항목입니다.');
    if (config.models != null && (typeof config.models !== 'object' || Array.isArray(config.models) ||
        Object.keys(config.models).some(key => !['unet', 'clip', 't5', 'vae', 'weightDtype'].includes(key)))) throw new Error('모델 설정 형식이 올바르지 않습니다.');
  }
  const models = { ...config.models };
  for (const key of ['unet', 'clip', 't5', 'vae']) if (values[key]) models[key] = values[key];
  if (values['weight-dtype']) models.weightDtype = values['weight-dtype'];
  const controller = new AbortController();
  const cancel = () => controller.abort(new Error('사용자가 생성을 취소했습니다. 실행 중 그림은 ComfyUI에서 확인해 주세요.'));
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    const result = await generatePackage(plan, {
      models, baseUrl: values.comfy ?? config.comfy, dryRun: Boolean(values['dry-run']), signal: controller.signal,
      timeoutMs: seconds(values.timeout ?? config.timeout, 1800), requestTimeoutMs: seconds(values['request-timeout'] ?? config.requestTimeout, 30),
      cacheDir: values['no-cache'] ? null : path.resolve(values['cache-dir'] || path.join(__dirname, '.cache')),
      onProgress: ({ index, total, wordId, cached }) => process.stderr.write(`[${index}/${total}] ${wordId}: ${cached ? '캐시 사용' : '로컬 생성'}\n`)
    });
    if (values.out) {
      await atomicJSON(path.resolve(values.out), result, { overwrite: Boolean(values.overwrite) });
      process.stderr.write(`저장 완료: ${path.resolve(values.out)}\n`);
    } else process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
  }
}

if (require.main === module) main().catch(error => { process.stderr.write(`오류: ${error.message}\n`); process.exitCode = 1; });
module.exports = { main };
