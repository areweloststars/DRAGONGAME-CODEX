#!/usr/bin/env node
'use strict';
// Repackage existing approved art. No model, network or image generation.
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const core = require('./core.js');
const { validateImage } = require('./io.cjs');
const WORDS = ['approach', 'protest', 'recommend', 'weakness', 'aim', 'announce', 'passenger'];

function createDemo(sourceDir, planInput = require('./examples/dragon-mist.voca-plan.json')) {
    const plan = core.normalizePlan(planInput);
    if (JSON.stringify(plan.words.map(w => w.id)) !== JSON.stringify(WORDS)) throw new Error('기본 에피소드 단어가 바뀌었습니다. 장면 대응을 먼저 검토해 주세요.');
    const images = WORDS.map((wordId, i) => {
      const file = path.join(sourceDir, `scene-${i + 2}.jpg`);
      if (fs.statSync(file).size > core.MAX_IMAGE_BYTES) throw new Error('그림 하나가 6MB를 넘습니다: ' + file);
      const dataUrl = 'data:image/jpeg;base64,' + fs.readFileSync(file).toString('base64');
      validateImage({ dataUrl, mime: 'image/jpeg' });
      return { wordId, dataUrl, prompt: 'Approved mist watercolor illustration, scene ' + (i + 2), seed: null };
    });
    const pack = core.validateArtPackage({ format: core.ART_FORMAT, deckId: plan.deckId, sceneId: plan.sceneId, sourceFingerprint: core.sourceFingerprint(plan), style: core.STYLE, images }, plan);
    if (Buffer.byteLength(JSON.stringify(pack)) > core.MAX_PACKAGE_BYTES) throw new Error('묶음이 50MB를 넘습니다.');
    return { plan, pack };
}
function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({ args: argv, options: { source: { type: 'string' }, out: { type: 'string' }, plan: { type: 'string' }, overwrite: { type: 'boolean' } } });
  if (!values.source) throw new Error('승인 그림 폴더를 --source로 지정해 주세요. 자동 생성이나 다운로드는 하지 않습니다.');
  const out = path.resolve(values.out || path.join(__dirname, 'examples'));
  const files = ['dragon-mist.voca-plan.json', 'dragon-mist.voca-art.json'].map(f => path.join(out, f));
  if (!values.overwrite && files.some(f => fs.existsSync(f))) throw new Error('예제 파일이 이미 있습니다. 다른 --out 폴더나 --overwrite를 지정해 주세요.');
  const planInput = values.plan ? JSON.parse(fs.readFileSync(values.plan, 'utf8').replace(/^\uFEFF/, '')) : undefined;
  const result = createDemo(path.resolve(values.source), planInput);
  fs.mkdirSync(out, { recursive: true });
  [result.plan, result.pack].forEach((value, i) => fs.writeFileSync(files[i], JSON.stringify(value, null, 2) + '\n', { flag: values.overwrite ? 'w' : 'wx' }));
  process.stdout.write(JSON.stringify({ files, deckId: result.plan.deckId, sceneId: result.plan.sceneId, words: WORDS, bytes: fs.statSync(files[1]).size }, null, 2) + '\n');
}
if (require.main === module) { try { main(); } catch (e) { console.error(e.message); process.exitCode = 1; } }
module.exports = { createDemo };
