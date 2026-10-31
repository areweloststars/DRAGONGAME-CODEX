/* Independent story-plan contract. Usable in the browser or require() from Claude Code.
   This module plans pictures; actual inference is performed by the local ComfyUI adapter.
   No network, model download, or generation happens at page load. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VocaImageEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const FORMAT = 'voca-story-plan/v1', ART_FORMAT = 'voca-story-art/v1';
  const STYLE = 'watercolor-fantasy-v1';
  const VERSION = '1.0.0';
  const MAX_IMAGE_BYTES = 6 * 1024 * 1024, MAX_PACKAGE_BYTES = 50 * 1024 * 1024;
  const ART_DIRECTION = 'A finely detailed narrative book illustration painted in transparent watercolor and soft gouache on warm ivory textured paper. Muted sage and olive greens, limestone beige, umber, dusty blue-grey, restrained antique gold. Delicate pencil underdrawing, visible paper grain, soft pigment blooms, natural proportions and expressive faces, carefully observed clothing and architecture. Atmospheric depth, misty distant landscapes, diffused daylight or gentle warm window light. Calm, humane, quietly wondrous mood. A single spacious cinematic composition, with foreground, middle ground and background. Retain the actual setting and people of this story.';
  const NEGATIVE = 'text, letters, captions, labels, speech bubbles, watermark, logo, UI, collage, contact sheet, comic panel borders, emoji, flat vector clipart, chibi, plastic 3D render, neon colors, oversaturated colors, harsh black outlines, graphic injury, distorted anatomy';
  function fail(message) { const e = new Error(message); e.code = 'invalid_story_art'; throw e; }
  function obj(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
  function text(value, name, max, required = false) {
    if (value == null && !required) return '';
    if (typeof value !== 'string') fail(name + ': 글자 값이 필요해요.');
    const s = value.normalize('NFC').replace(/\r\n?/g, '\n').trim();
    if ((required && !s) || s.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s)) fail(name + ': 비어 있거나 너무 긴 값이에요.');
    return s;
  }
  function normalizePlan(input) {
    if (!obj(input) || input.format !== FORMAT) fail('지원하는 장면 설계서 형식이 아니에요.');
    if (input.style != null && input.style !== STYLE) fail('지원하는 그림체가 아니에요.');
    if (!Array.isArray(input.words) || !input.words.length || input.words.length > 12) fail('장면 하나에는 단어 1~12개가 필요해요.');
    const characters = input.characters == null ? [] : input.characters;
    if (!Array.isArray(characters) || characters.length > 12) fail('등장인물은 최대 12명까지 넣을 수 있어요.');
    const ids = new Set();
    const cast = characters.map(c => {
      if (!obj(c)) fail('등장인물 형식이 잘못됐어요.');
      const id = text(c.id, '인물 ID', 80, true);
      if (ids.has(id)) fail('등장인물 ID가 겹쳐요.');
      ids.add(id);
      return { id, description: text(c.description, '인물 설명', 1600, true) };
    });
    const seen = new Set();
    const words = input.words.map(w => {
      if (!obj(w)) fail('단어 형식이 잘못됐어요.');
      const id = text(w.id, '단어 ID', 160, true);
      if (seen.has(id)) fail('같은 단어 ID가 두 번 들어 있어요.');
      seen.add(id);
      const characterIds = w.characterIds == null ? [] : w.characterIds;
      if (!Array.isArray(characterIds) || characterIds.length > 12 || characterIds.some(id => !ids.has(id))) fail('장면에 없는 등장인물을 지정했어요.');
      return { id, word: text(w.word, '영어 단어', 160, true), meaning: text(w.meaning, '단어 뜻', 500, true), visual: text(w.visual, '그릴 장면', 3000, true), characterIds: [...new Set(characterIds)] };
    });
    const seed = input.seed == null ? 1729 : input.seed;
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff - 12) fail('시드는 0~4294967283 정수여야 해요.');
    return { format: FORMAT, deckId: text(input.deckId, '단어장 ID', 160, true), sceneId: text(input.sceneId, '에피소드 ID', 160, true), title: text(input.title, '제목', 300, true), story: text(input.story, '스토리', 12000, true), style: STYLE, characters: cast, setting: text(input.setting, '배경', 2400), seed, words };
  }
  // Content identifiers, not authentication tokens. Full validated source fields are
  // also checked when importing; these hashes must not be used for access control.
  function hash(value) {
    const s = JSON.stringify(value); let a = 2166136261, b = 0x9e3779b9;
    for (let i = 0; i < s.length; i++) { a = Math.imul(a ^ s.charCodeAt(i), 16777619); b = Math.imul(b ^ s.charCodeAt(i), 2246822519); }
    return 'v1-' + (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
  }
  function fingerprint(input) { return hash({ version: VERSION, plan: normalizePlan(input), artDirection: ART_DIRECTION, negative: NEGATIVE }); }
  function sourceFingerprint(input) {
    const p = normalizePlan(input);
    return hash({ deckId: p.deckId, sceneId: p.sceneId, title: p.title, story: p.story, words: p.words.map(({ id, word, meaning }) => ({ id, word, meaning })) });
  }
  function buildPrompts(input) {
    const p = normalizePlan(input);
    return p.words.map((w, i) => {
      const cast = w.characterIds.length ? p.characters.filter(c => w.characterIds.includes(c.id)) : p.characters;
      const prompt = [
        ART_DIRECTION,
        'Episode: ' + p.title,
        'Setting continuity: ' + (p.setting || 'Use the location and period established in the story.'),
        cast.length ? 'Character continuity (preserve the same face, hair, clothing, colors and proportions across all pictures):\n' + cast.map(c => c.id + ': ' + c.description).join('\n') : 'Keep returning characters consistent with the story. Do not add unrelated protagonists.',
        'Story context (not printed text):\n' + p.story,
        'Picture ' + (i + 1) + ' of ' + p.words.length + '. Depict only this story moment:\n' + w.visual,
        'Learning association: the English word "' + w.word + '" is used here with the Korean meaning "' + w.meaning + '". Make that meaning visible through a clear action, object or relationship. Preserve this specific sense of the word.',
        'Show one readable action. Leave breathing room around the main subjects so the scene remains legible on a phone. Paint no letters or words; the app adds accurate vocabulary separately.'
      ].join('\n\n');
      return { wordId: w.id, prompt, negativePrompt: NEGATIVE, seed: p.seed + i, width: 768, height: 512 };
    });
  }
  function safeRasterDataUrl(value) {
    if (typeof value !== 'string' || value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 64) return false;
    const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!m || m[2].length % 4 !== 0) return false;
    const bytes = m[2].length * 3 / 4 - (m[2].endsWith('==') ? 2 : m[2].endsWith('=') ? 1 : 0);
    if (bytes < 12 || bytes > MAX_IMAGE_BYTES) return false;
    let head;
    try { head = typeof atob === 'function' ? atob(m[2].slice(0, 32)) : Buffer.from(m[2].slice(0, 32), 'base64').toString('latin1'); } catch (_) { return false; }
    return m[1] === 'png' ? head.startsWith('\x89PNG\r\n\x1a\n') : m[1] === 'jpeg' ? head.startsWith('\xff\xd8\xff') : head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP';
  }
function rasterDimensions(dataUrl) {
  if (!safeRasterDataUrl(dataUrl)) throw new Error('PNG·JPEG·WebP 그림만 사용할 수 있어요.');
  const raw = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const b = i => raw.charCodeAt(i), be16 = i => b(i) * 256 + b(i + 1), le24 = i => b(i) + b(i + 1) * 256 + b(i + 2) * 65536;
  let w = 0, h = 0;
  if (dataUrl.startsWith('data:image/png')) {
    const be32 = i => b(i) * 16777216 + b(i + 1) * 65536 + b(i + 2) * 256 + b(i + 3);
    if (raw.slice(12, 16) === 'IHDR') { w = be32(16); h = be32(20); }
  } else if (dataUrl.startsWith('data:image/webp')) {
    const type = raw.slice(12, 16);
    if (type === 'VP8X') { w = le24(24) + 1; h = le24(27) + 1; }
    else if (type === 'VP8L' && b(20) === 47) { w = 1 + b(21) + ((b(22) & 63) << 8); h = 1 + (b(22) >> 6) + (b(23) << 2) + ((b(24) & 15) << 10); }
    else if (type === 'VP8 ' && raw.slice(23, 26) === '\x9d\x01\x2a') { w = (b(26) + b(27) * 256) & 16383; h = (b(28) + b(29) * 256) & 16383; }
  } else {
    let i = 2;
    while (i + 3 < raw.length) {
      if (b(i++) !== 255) break;
      while (b(i) === 255) i++;
      const marker = b(i++);
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || marker >= 208 && marker <= 215) continue;
      const len = be16(i);
      if (len < 2 || i + len > raw.length) break;
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) { h = be16(i + 3); w = be16(i + 5); break; }
      i += len;
    }
  }
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 8192 || h > 8192 || w * h > 16777216) throw new Error('그림 해상도는 가로·세로 8192px 이하, 총 1600만 화소 이하여야 해요.');
  return { width: w, height: h };
}

  function validateArtPackage(input, plan) {
    const p = normalizePlan(plan);
    if (!obj(input) || input.format !== ART_FORMAT || input.deckId !== p.deckId || input.sceneId !== p.sceneId || input.sourceFingerprint !== sourceFingerprint(p) || input.style !== STYLE) fail('다른 단어장 또는 수정 전 스토리의 그림이에요. 현재 설계서로 만든 파일을 골라 주세요.');
    if (!Array.isArray(input.images) || input.images.length < 1 || input.images.length > p.words.length) fail('그림 수가 장면의 단어 수와 맞지 않아요.');
    const allowed = new Set(p.words.map(w => w.id)), seen = new Set(); let size = 0;
    const images = input.images.map(im => {
      if (!obj(im) || !allowed.has(im.wordId) || seen.has(im.wordId)) fail('모르는 단어 또는 중복 그림이 들어 있어요.');
      seen.add(im.wordId);
      if (!safeRasterDataUrl(im.dataUrl)) fail('PNG·JPEG·WebP 그림만 사용할 수 있어요. 그림 하나는 6MB 이하여야 해요.');
      size += im.dataUrl.length;
      if (size > MAX_PACKAGE_BYTES) fail('그림 묶음은 50MB 이하여야 해요.');
      return { wordId: im.wordId, dataUrl: im.dataUrl, mime: im.dataUrl.slice(5, im.dataUrl.indexOf(';')), prompt: text(im.prompt, '생성 지시문', 30000), seed: Number.isSafeInteger(im.seed) && im.seed >= 0 ? im.seed : null };
    });
    return { format: ART_FORMAT, deckId: p.deckId, sceneId: p.sceneId, sourceFingerprint: sourceFingerprint(p), style: STYLE, images };
  }
  return Object.freeze({ VERSION, FORMAT, ART_FORMAT, STYLE, ART_DIRECTION, MAX_IMAGE_BYTES, MAX_PACKAGE_BYTES, normalizePlan, fingerprint, sourceFingerprint, buildPrompts, safeRasterDataUrl, rasterDimensions, validateArtPackage });
});

