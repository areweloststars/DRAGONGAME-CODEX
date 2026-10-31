'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const core = require('./core.js');
const { MAX_IMAGE_BYTES } = core;

function imageMime(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  throw new Error('ComfyUI 응답이 PNG, JPEG 또는 WebP 이미지가 아닙니다.');
}

function validateImage(image) {
  if (!image || typeof image.dataUrl !== 'string') throw new Error('이미지 데이터가 없습니다.');
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(image.dataUrl);
  if (!match || match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new Error('이미지 데이터 형식 또는 크기가 올바르지 않습니다.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_IMAGE_BYTES || bytes.toString('base64') !== match[2] || imageMime(bytes) !== match[1] || image.mime !== match[1]) {
    throw new Error('이미지 데이터 형식 또는 크기가 올바르지 않습니다.');
  }
  core.rasterDimensions(image.dataUrl);
  return { dataUrl: image.dataUrl, mime: match[1] };
}

async function readCache(cacheDir, key) {
  if (!cacheDir) return null;
  try {
    const file = path.join(cacheDir, `${key}.json`);
    if ((await fs.stat(file)).size > MAX_IMAGE_BYTES * 1.4 + 65536) return null;
    const item = JSON.parse(await fs.readFile(file, 'utf8'));
    if (item.key !== key) return null;
    return validateImage(item.image);
  } catch { return null; }
}

async function atomicJSON(file, data, { overwrite = true } = {}) {
  await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(data, null, 2), { flag: 'wx' });
    if (overwrite) await fs.rename(temporary, file);
    else await fs.copyFile(temporary, file, fs.constants.COPYFILE_EXCL);
  } finally { await fs.unlink(temporary).catch(() => {}); }
}


module.exports = { imageMime, validateImage, readCache, atomicJSON };
