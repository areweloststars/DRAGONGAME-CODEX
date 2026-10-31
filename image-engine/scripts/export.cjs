#!/usr/bin/env node
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { parseArgs } = require('node:util');
const ROOT = path.resolve(__dirname, '..');
const manifest = require('../export-manifest.json');
async function exportEngine(destination) {
  if (!destination) throw new Error('새 복사본 폴더를 --out으로 지정해 주세요.');
  const out = path.resolve(destination);
  const files = [];
  for (const name of manifest) {
    if (typeof name !== 'string' || path.isAbsolute(name) || /[\\:]/.test(name) || name.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('잘못된 내보내기 항목입니다.');
    const source = path.join(ROOT, name);
    if (!(await fs.lstat(source)).isFile()) throw new Error('일반 파일만 내보낼 수 있습니다: ' + name);
    const real = await fs.realpath(source), relative = path.relative(ROOT, real);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('패키지 밖의 파일입니다: ' + name);
    files.push({ name, source });
  }
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.mkdir(out); // EEXIST protects any existing repository or export.
  for (const { name, source } of files) {
    const target = path.join(out, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(source, target, fs.constants.COPYFILE_EXCL);
  }
  return { directory: out, files: files.length };
}
if (require.main === module) {
  const { values } = parseArgs({ options: { out: { type: 'string' } } });
  exportEngine(values.out).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { exportEngine };
