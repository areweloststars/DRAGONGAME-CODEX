/* ---------- 1) 사진 속 단어 읽기: 이 기기 안에서 글자 인식(Tesseract). 따로 연결할 API나 열쇠가 없어요
   ① 사진 다듬기(그림자·명암 고르게) ② 한국어+영어로 한 번, 영어 전용으로 한 번 읽기 → 영어 단어는 영어 전용 결과를 믿음
   ③ 글자 위치로 줄·칸을 다시 짜서 '영어 → 오른쪽이나 바로 아래 한글 뜻'으로 짝짓기 (두 단(칸) 쪽, 한 줄에 두 단어도)
   ④ 영어 사전(SCOWL 약 11만 단어)으로 잘못 읽은 글자 고치기 ---------- */
const OCR_MAX = 10;
const OCR = { worker: null, eng: null, loading: null, i: 0, n: 1, dict: null, low: new Set(), boxes: null };
const ocrURL = p => new URL(p, location.href).href;
function ocrShow(label, pct) {
  const bar = $('#ocrbar'), lab = $('#ocrlab');
  if (bar) bar.style.width = Math.round(clamp(pct, 0, 1) * 100) + '%';
  if (lab && label) lab.textContent = label;
}
function ocrLog(m) {
  if (!m || MK.step !== 'reading') return;
  const p = typeof m.progress === 'number' ? m.progress : 0, st = String(m.status || '');
  if (/core/.test(st)) ocrShow('글자 읽는 도구 준비 중', 0.05 + p * 0.1);
  else if (/recogniz/.test(st)) ocrShow(`사진 ${OCR.i + 1}/${OCR.n} 읽는 중`, 0.3 + 0.7 * (OCR.i + p * 0.5 + (OCR.pass ? 0.5 : 0)) / OCR.n);
}
// 글자 사전(압축 파일)은 앱 옆에 함께 올려 둔 파일이에요. 직접 받아서 글자 인식 도구에 넘겨요
const ocrLangData = {};
function ocrLang(code) {
  if (!ocrLangData[code]) ocrLangData[code] = fetch(ocrURL(`ocr/${code}-traineddata.wasm`)).then(r => { if (!r.ok) throw { code: 'ocr_load' }; return r.arrayBuffer(); }).catch(e => { delete ocrLangData[code]; throw e; });
  return ocrLangData[code].then(b => ({ code, data: new Uint8Array(b.slice(0)) }));
}
const ocrOpts = () => ({ workerPath: ocrURL('ocr/worker.min.js'), corePath: ocrURL('ocr/tesseract-core-lstm.wasm.js'), cacheMethod: 'none', workerBlobURL: true, logger: ocrLog, errorHandler: () => { } });
// 영어 사전: 단어 → 1(흔한 말) / 2(드문 말)
function ocrDict() {
  if (!OCR.dict) OCR.dict = fetch(ocrURL('ocr/words-en.txt')).then(r => r.ok ? r.text() : '').then(t => {
    const m = new Map(); for (const l of t.split('\n')) if (l) m.set(l.replace('*', ''), l.endsWith('*') ? 2 : 1); return m;
  }).catch(() => new Map());
  return OCR.dict;
}
function ocrWorker() {
  if (OCR.worker) return Promise.resolve(OCR.worker);
  if (!OCR.loading) OCR.loading = (async () => {
    if (!window.Tesseract) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'ocr/tesseract.min.js'; s.onload = ok; s.onerror = () => no({ code: 'ocr_load' }); document.head.appendChild(s); });
    ocrShow('한국어·영어 글자 사전 불러오는 중', 0.08);
    ocrDict(); koLex();
    const [kor, eng2] = await Promise.all([ocrLang('kor'), ocrLang('eng')]);
    const [w, we] = await Promise.all([Tesseract.createWorker([kor], 1, ocrOpts()), Tesseract.createWorker([eng2], 1, ocrOpts())]);
    // 영어 전용 읽기는 11 = 흩어진 글자 찾기: 표·두 단 쪽에서도 영어 낱말을 빠짐없이 찾고, 줄·칸은 위치로 앱이 다시 짬
    await w.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '4' }); // 4 = 세로로 이어진 글줄: 한글 뜻을 문맥으로 더 정확히
    await we.setParameters({ preserve_interword_spaces: '1', tessedit_pageseg_mode: '11', tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'-~.,()/ " });
    OCR.worker = w; OCR.eng = we; return w;
  })().catch(e => { OCR.loading = null; throw (e && e.code ? e : { code: 'ocr_load' }); });
  return OCR.loading;
}
function ocrStop() {
  MK.run = null;
  const ws = [OCR.worker, OCR.eng]; OCR.worker = null; OCR.eng = null; OCR.loading = null;
  for (const w of ws) if (w) try { w.terminate(); } catch (e) { }
}
// 사진 → 글자 읽기 좋은 흑백 그림 (그림자 지운 뒤 명암을 넓힘. 너무 크면 줄이고 작은 화면 캡처는 키움)
async function ocrImage(file) {
  let src = null, url = '';
  try { src = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { src = null; }
  if (!src) src = await new Promise((ok, no) => { const im = new Image(); url = URL.createObjectURL(file); im.onload = () => ok(im); im.onerror = () => no({ code: 'image_rejected' }); im.src = url; });
  const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height, big = Math.max(w0, h0);
  const k = Math.min(1.3, 2600 / big); // 작은 글자는 조금 키우고(너무 키우면 흐려짐) 너무 큰 사진은 긴 쪽 2600px로 줄임
  const W = Math.max(1, Math.round(w0 * k)), H = Math.max(1, Math.round(h0 * k));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H); g.drawImage(src, 0, 0, W, H);
  if (src.close) src.close();
  if (url) URL.revokeObjectURL(url);
  try {
    // 배경 밝기: 아주 작게 줄였다 키운 그림 (글자는 사라지고 그림자·조명만 남음)
    const s = document.createElement('canvas'), sw = Math.max(8, Math.round(W / 24)), sh = Math.max(8, Math.round(H / 24));
    s.width = sw; s.height = sh; const sg = s.getContext('2d'); sg.imageSmoothingQuality = 'high'; sg.drawImage(c, 0, 0, sw, sh);
    // 글자 획을 지우려고 작은 그림에서 밝은 쪽을 남김(최댓값 3×3)
    const sd = sg.getImageData(0, 0, sw, sh), sp = sd.data, lum = new Float32Array(sw * sh);
    for (let i = 0; i < sw * sh; i++) lum[i] = 0.3 * sp[i * 4] + 0.59 * sp[i * 4 + 1] + 0.11 * sp[i * 4 + 2];
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      let mx = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < sh && xx >= 0 && xx < sw) mx = Math.max(mx, lum[yy * sw + xx]); }
      const i = (y * sw + x) * 4; sp[i] = sp[i + 1] = sp[i + 2] = mx;
    }
    sg.putImageData(sd, 0, 0);
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H; const bgg = bg.getContext('2d', { willReadFrequently: true });
    bgg.imageSmoothingQuality = 'high'; bgg.drawImage(s, 0, 0, W, H);
    const id = g.getImageData(0, 0, W, H), d = id.data, b = bgg.getImageData(0, 0, W, H).data;
    const out = new Uint8ClampedArray(W * H);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      const v = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2], bv = Math.max(40, b[i]);
      out[j] = Math.min(255, v / bv * 255);
    }
    // 밝은 쪽 끝(종이)만 하얗게 맞춤. 어두운 쪽은 늘리지 않음(굵은 글자가 뭉개지지 않게)
    const lo = 0, hi = 245, span = hi - lo;
    for (let i = 0, j = 0; i < d.length; i += 4, j++) { const v = clamp((out[j] - lo) / span * 255, 0, 255); d[i] = d[i + 1] = d[i + 2] = v; }
    g.putImageData(id, 0, 0);
  } catch (e) { /* 다듬기가 안 되면 원래 사진으로 */ }
  return c;
}
// 사진 기울기: Tesseract가 찾은 긴 줄들의 밑줄 기울기 가운데값
function ocrSlope(...datas) {
  const sl = [];
  for (const data of datas) for (const b of (data && data.blocks) || []) for (const pa of b.paragraphs || []) for (const ln of pa.lines || []) {
    const bl = ln.baseline; if (!bl) continue;
    const dx = bl.x1 - bl.x0; if (dx > 150) sl.push((bl.y1 - bl.y0) / dx);
  }
  sl.sort((a, b) => a - b);
  return sl.length ? clamp(sl[sl.length >> 1], -0.2, 0.2) : 0;
}
// Tesseract 결과 → 낱말 [{t, x0, y0, x1, y1, c}]
function ocrWords(data) {
  const out = [];
  for (const b of (data && data.blocks) || []) for (const pa of b.paragraphs || []) for (const ln of pa.lines || []) for (const w of ln.words || []) {
    const t = String(w.text || '').trim(); if (!t || !w.bbox) continue;
    out.push({ t, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1, c: +w.confidence || 0 });
  }
  return out;
}
const OCR_POS = /^[([]?(?:n|v|a|adj|adv|ad|prep|conj|vt|vi|pron|int|명|동|형|부)[.)\]]?$/i;
const isLat = t => /[A-Za-z]{2,}/.test(t) && !HANGUL.test(t);
// 영어 단어 고치기: 사전에 없으면 자주 헷갈리는 글자(l/I/1, rn/m, 0/o…)나 한 글자 차이로 사전에 있는 말을 찾음
function ocrFix(word, dict) {
  if (!dict || !dict.size) return word;
  const lw = word.toLowerCase().replace(/[^a-z0-9|'’\-]/g, '');
  if (!lw || lw.length < 3 || dict.has(lw)) return lw.length ? (dict.has(lw) ? lw : word) : word;
  const best = list => { let b = null; for (const x of list) { const t = dict.get(x); if (t && (!b || t < b[1])) b = [x, t]; } return b && b[0]; };
  const CONF = [['1', 'l'], ['1', 'i'], ['|', 'l'], ['|', 'i'], ['0', 'o'], ['5', 's'], ['8', 'b'], ['rn', 'm'], ['m', 'rn'], ['vv', 'w'], ['cl', 'd'], ['ii', 'u'], ['li', 'h'], ['l', 'i'], ['i', 'l'], ['c', 'e'], ['e', 'c'], ['n', 'u'], ['u', 'n'], ['h', 'b'], ['t', 'f'], ['f', 't'], ['a', 'o'], ['o', 'a']];
  const c1 = [];
  for (const [a, b] of CONF) { let i = lw.indexOf(a); while (i >= 0) { c1.push(lw.slice(0, i) + b + lw.slice(i + a.length)); i = lw.indexOf(a, i + 1); } }
  c1.push(lw.slice(1), lw.slice(0, -1)); // 앞뒤에 붙은 번호·점 같은 글자
  let hit = best(c1.map(x => x.replace(/[^a-z'\-]/g, '')));
  if (hit) return hit;
  if (lw.length >= 5 && /^[a-z]+$/.test(lw)) {
    const AB = 'abcdefghijklmnopqrstuvwxyz', c2 = [];
    for (let i = 0; i < lw.length; i++) { c2.push(lw.slice(0, i) + lw.slice(i + 1)); for (const ch of AB) { c2.push(lw.slice(0, i) + ch + lw.slice(i + 1)); c2.push(lw.slice(0, i) + ch + lw.slice(i)); } }
    hit = best(c2); if (hit) return hit;
  }
  return word;
}
// 두 번 읽은 결과 합치기: 영어 전용으로 또렷하게 읽은 영어 낱말이 있으면 그 자리의 낱말을 바꿈
function ocrMerge(A, E, dict) {
  const ov = (a, b) => { const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); return w > 0 && h > 0 ? (w * h) / Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0)) : 0; };
  const out = A.slice();
  for (const e of E) {
    const lw = e.t.toLowerCase().replace(/[^a-z'\-]/g, '');
    // 흐리게(55 미만) 읽힌 영어도 네 글자 이상 사전 낱말이면 살림 ('10 invite'처럼 번호에 바짝 붙은 단어가 신뢰도 20~40으로 나와 통째로 빠졌어요).
    // 대신 확인 화면에서 빨간 칸(흐리게 읽힘)으로 보여 줌
    const weak = e.c < 55;
    if (!/^[A-Za-z][A-Za-z'’\-]*[.,]?$/.test(e.t) || e.t.length < 2 || (weak && !(e.c >= 15 && lw.length >= 4 && dict && dict.has(lw)))) continue;
    const hits = out.filter(a => ov(a, e) > 0.45);
    // 한글 자리는 그대로. 단, 사전에 있는 영어 낱말을 또렷하게 읽었으면 영어로 (한국어 전용 읽기는 영어를 한글처럼 읽기도 해서)
    const good = e.c >= 75 && lw.length >= 3 && dict && dict.has(lw);
    if (hits.some(a => HANGUL.test(a.t) && (!good || a.c >= e.c))) continue;
    for (const a of hits) out.splice(out.indexOf(a), 1);
    out.push(e);
    if (weak) OCR.low.add(lw);
  }
  return out;
}
// 낱말 → 줄 → (넓은 틈으로 나눈) 덩어리 → '영어 - 뜻' 줄들
function ocrPairs(words, dict, slope = 0) {
  // 기운 사진: 낱말 위치를 반듯하게 (세로 위치에서 기울기만큼 빼기)
  if (slope) words = words.map(w => { const d = slope * (w.x0 + w.x1) / 2; return Object.assign({}, w, { y0: w.y0 - d, y1: w.y1 - d, _o: w }); });
  // '설명하다'가 '설 / 명 / 하다'로 쪼개 읽히면 가운데 '명'은 품사 표시가 아니라 낱말의 한 글자: 바로 왼쪽에 붙은 한글이 있으면 남김
  const hs0 = words.map(w => w.y1 - w.y0).sort((a, b) => a - b), h0 = hs0[hs0.length >> 1] || 20;
  const glued = w => /^[명동형부]$/.test(w.t) && words.some(o => o !== w && HANGUL.test(o.t) && Math.abs((o.y0 + o.y1) / 2 - (w.y0 + w.y1) / 2) < h0 * 0.5 && w.x0 - o.x1 > -3 && w.x0 - o.x1 < h0 * 0.6);
  words = words.filter(w => (!OCR_POS.test(w.t) || glued(w)) && !/^[\d.)(\-–—•·:]+$/.test(w.t) && !(w.c < 25 && !HANGUL.test(w.t) && !(w.c >= 15 && w.t.length >= 4 && dict && dict.has(w.t.toLowerCase().replace(/[^a-z'\-]/g, ''))))
    && !(/^[A-Za-z.]{1,2}$/.test(w.t) && w.c < 60));
  if (!words.length) return [];
  const hs = words.map(w => w.y1 - w.y0).sort((a, b) => a - b), h = hs[hs.length >> 1] || 20;
  // 줄 만들기: 왼쪽부터, 바로 왼쪽 낱말과 높이가 이어지는 줄에 붙임 (사진이 조금 기울어도 됨)
  const lines = [];
  for (const w of words.slice().sort((a, b) => a.x0 - b.x0)) {
    const yc = (w.y0 + w.y1) / 2;
    let best = null, bd = 1e9;
    for (const L of lines) { const last = L.w[L.w.length - 1], d = Math.abs(yc - (last.y0 + last.y1) / 2); if (d < h * 0.6 && w.x0 > last.x0 && w.x0 - last.x1 < h * 14 && d < bd) { bd = d; best = L; } }
    if (best) best.w.push(w); else lines.push({ w: [w] });
  }
  // 덩어리: 낱말 사이가 글자 높이의 1.6배보다 넓으면 끊음
  const segs = [];
  for (const L of lines) {
    let cur = null;
    for (const w of L.w) {
      if (cur && w.x0 - cur.x1 > h * 1.6) cur = null;
      if (!cur) { cur = { w: [], x0: w.x0, x1: w.x1, y0: w.y0, y1: w.y1 }; segs.push(cur); }
      cur.w.push(w); cur.x1 = Math.max(cur.x1, w.x1); cur.y0 = Math.min(cur.y0, w.y0); cur.y1 = Math.max(cur.y1, w.y1);
    }
  }
  for (const s of segs) {
    const ycs = s.w.map(w => (w.y0 + w.y1) / 2).sort((a, b) => a - b);
    s.yc = ycs[ycs.length >> 1]; // 키 큰 글자 상자 하나에 흔들리지 않게 가운데값
    s.t = s.w.map(w => w.t).join(' ').replace(/\s+([,.;])/g, '$1');
    // 혼자 떨어진 흐릿한 한 글자(품사 표시를 한글로 잘못 읽은 것 등)는 뜻으로 쓰지 않음
    if (s.w.length === 1 && /^[가-힣]$/.test(s.t) && s.w[0].c < 45) { s.kind = 'x'; continue; }
    s.kind = HANGUL.test(s.t) ? (/[A-Za-z]{2,}/.test(s.t) ? 'mix' : 'ko') : isLat(s.t) && s.t.replace(/[^A-Za-z]/g, '').length >= 3 ? 'en' : 'x';
  }
  segs.sort((a, b) => a.yc - b.yc || a.x0 - b.x0);
  const used = new Set(), out = [];
  const SHORT = new Set(['a', 'an', 'to', 'of', 'in', 'on', 'up', 'by', 'at', 'as', 'be', 'do', 'go', 'it', 'so', 'no', 'or', 'if', 'off', 'out', 'for', 'with', 'one', 'sb', 'sth']);
  const fixEn = t => {
    const ws = t.split(/\s+/).map(x => /[A-Za-z]/.test(x) ? ocrFix(x, dict) : '').filter(Boolean);
    while (ws.length > 1 && ws[0].length <= 2 && !SHORT.has(ws[0].toLowerCase())) ws.shift();
    while (ws.length > 1 && ws[ws.length - 1].length <= 2 && !SHORT.has(ws[ws.length - 1].toLowerCase())) ws.pop();
    return ws.join(' ');
  };
  // 같은 줄 오른쪽 뜻 → 없으면 바로 아래 뜻 (영어 단어와 왼쪽 끝이 비슷한 곳)
  // 품사 표시(v. n.)를 한글 한 글자로 잘못 읽은 덩어리는 더 긴 뜻 덩어리가 있으면 건너뜀
  const right = s => {
    let r = segs.filter(o => o !== s && !used.has(o) && o.kind === 'ko' && Math.abs(o.yc - s.yc) < h * 0.85 && o.x0 > s.x1 - h * 0.3).sort((a, b) => a.x0 - b.x0);
    // 같은 줄 오른쪽 칸의 다른 영어 단어부터는 그 단어의 뜻 ('river 강 … mirror 거울'에서 river가 '거울'을 넘보다 '강'까지 잃지 않게)
    const nx = segs.filter(q => q !== s && q.kind === 'en' && Math.abs(q.yc - s.yc) < h * 0.7 && q.x0 > s.x1).sort((a, b) => a.x0 - b.x0)[0];
    if (nx) r = r.filter(o => o.x0 < nx.x0);
    return r.length > 1 && r[0].t.replace(/[^가-힣]/g, '').length <= 1 ? r[1] : r[0]; };
  const nextEnRight = (s, o) => segs.some(q => q !== s && q.kind === 'en' && Math.abs(q.yc - s.yc) < h * 0.7 && q.x0 > s.x1 && q.x0 < o.x0);
  const below = s => segs.filter(o => !used.has(o) && o.kind === 'ko' && o.yc > s.yc + h * 0.5 && o.yc < s.yc + h * 2.6 && o.x0 > s.x0 - h * 2.5 && o.x0 < s.x0 + Math.max(h * 3, (s.x1 - s.x0) * 0.6)).sort((a, b) => a.yc - b.yc)[0];
  for (const s of segs) {
    if (used.has(s)) continue;
    if (s.kind === 'mix') {
      // 한 덩어리에 '영어 뜻 영어 뜻'이 이어지면 한글 뒤에 영어가 시작되는 곳에서 나눔
      used.add(s);
      const parts = []; let cur = [];
      for (const w of s.w) { if (cur.length && /[A-Za-z]{2,}/.test(w.t) && !HANGUL.test(w.t) && cur.some(x => HANGUL.test(x.t))) { parts.push(cur); cur = []; } cur.push(w); }
      if (cur.length) parts.push(cur);
      for (const p of parts) {
        const k = p.findIndex(x => HANGUL.test(x.t)); if (k <= 0) continue;
        const en = fixEn(p.slice(0, k).map(x => x.t).join(' ')), ko = p.slice(k).map(x => x.t).join(' ').replace(/\s+([,.;])/g, '$1');
        if (en) out.push({ t: en + ' - ' + ko, x: p[0].x0, y: (p[0].y0 + p[0].y1) / 2, b: ocrBox(p) });
      }
      continue;
    }
    if (s.kind !== 'en') continue;
    let m = right(s);
    if (m && nextEnRight(s, m)) m = null;
    if (!m) m = below(s);
    if (!m) continue;
    used.add(s); used.add(m);
    const en = fixEn(s.t);
    if (en) out.push({ t: en + ' - ' + m.t, x: s.x0, y: s.yc, b: ocrBox([...s.w, ...m.w]) });
  }
  // 읽는 순서: 왼쪽 단(칸)을 위에서 아래로 다 읽고 오른쪽 단으로
  const pw = Math.max(...words.map(w => w.x1)) || 1, xs = out.map(o => o.x).sort((a, b) => a - b), cuts = [];
  for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > pw * 0.18) cuts.push((xs[i] + xs[i - 1]) / 2);
  const col = x => cuts.filter(c => x > c).length;
  if (OCR.boxes) for (const o of out) ocrKeepBox(o.t, o.b);
  return out.sort((a, b) => col(a.x) - col(b.x) || a.y - b.y).map(o => o.t);
}
// 확인 화면에 보여 줄 '사진 속 원래 줄' 위치: 낱말 상자들을 감싸는 상자 (기울기를 펴기 전의 원래 위치로)
function ocrBox(ws) {
  const o = ws.map(w => w._o || w);
  return { x0: Math.min(...o.map(w => w.x0)), y0: Math.min(...o.map(w => w.y0)), x1: Math.max(...o.map(w => w.x1)), y1: Math.max(...o.map(w => w.y1)) };
}
function ocrKeepBox(line, b) {
  const en = String(line).split(' - ')[0].trim().toLowerCase();
  if (en && b && isFinite(b.x0) && !OCR.boxes.has(en)) OCR.boxes.set(en, b);
}
// 사진에서 그 줄만 작게 잘라 낸 그림 (화면에만 보여 주고 단어장에는 저장하지 않아요)
function ocrSnip(c, b) {
  try {
    const pad = Math.max(6, (b.y1 - b.y0) * 0.35);
    const x = Math.max(0, b.x0 - pad), y = Math.max(0, b.y0 - pad);
    const w = Math.min(c.width - x, b.x1 - b.x0 + pad * 2), h = Math.min(c.height - y, b.y1 - b.y0 + pad * 2);
    if (w < 8 || h < 8) return '';
    const k = Math.min(1, 96 / h, 900 / w), o = document.createElement('canvas');
    o.width = Math.max(1, Math.round(w * k)); o.height = Math.max(1, Math.round(h * k));
    o.getContext('2d').drawImage(c, x, y, w, h, 0, 0, o.width, o.height);
    return o.toDataURL('image/jpeg', 0.72);
  } catch (e) { return ''; }
}
// 읽은 글자 다듬기: 낱글자로 벌어진 한글 붙이기, 번호 지우기, 영어 줄 아래 뜻 줄 합치기
function ocrTidy(text) {
  let lines = String(text || '').split(/\n/).map(l => l.replace(/[|｜¦]/g, ' ').replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim()).filter(l => l.length > 1);
  lines = lines.map(l => {
    const t = l.split(' '), out = [];
    for (let i = 0; i < t.length; i++) {
      if (/^[가-힣][,.;]?$/.test(t[i])) {
        let j = i, s = '';
        while (j < t.length && /^[가-힣][,.;]?$/.test(t[j])) { s += t[j++]; if (/[,.;]$/.test(s)) break; }
        if (j - i >= 2) { if (!/[,.;]$/.test(s) && j < t.length && /^[가-힣]/.test(t[j])) s += t[j++]; out.push(s); i = j - 1; continue; }
      }
      out.push(t[i]);
    }
    return out.join(' ');
  });
  const numbered = lines.filter(l => /^\(?\d{1,3}(?:[.)\s]|[A-Za-z])/.test(l)).length;
  const listy = numbered >= Math.max(2, lines.length * 0.3);
  lines = lines.map(l => {
    let m = l.replace(/^\(?\d{1,3}[.)]?\s*(?=[A-Za-z])/, '');
    if (listy && m === l) m = l.replace(/^[lI|S5]\s?(?=[a-z]{3})/, '');
    return m;
  });
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], nx = lines[i + 1];
    if (nx && LATIN.test(l) && !HANGUL.test(l) && l.split(' ').length <= 4 && HANGUL.test(nx) && !LATIN.test(nx)) { out.push(l + ' - ' + nx); i++; }
    else out.push(l);
  }
  return out.join('\n');
}
// 예문·설명처럼 단어 줄이 아닌 것은 빼요
const ocrRowOk = r => { const en = r.en.replace(/[^A-Za-z\s'~\-]/g, ' ').replace(/\s+/g, ' ').trim(); r.en = en; return en.length >= 2 && en.split(' ').length <= 4 && HANGUL.test(r.ko) && r.ko.length <= 40; };
// 뜻에 섞여 들어온 영어 낱자·기호 정리
const ocrKo = s => s.replace(/(^|\s)[A-Za-z|\\/_=+*#&%$@^]{1,2}(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------- 읽은 단어 점검: 영어 사전·한국어 낱말 목록(hunspell-ko + kengdic, 약 17만 개)으로 진짜 낱말인지 봐요 ---------- */
const KO_END = ['하다', '하게', '하는', '하고', '한', '해서', '했다', '함', '하기', '되다', '되는', '된', '시키다', '받다', '적인', '적으로', '적', '스러운', '스럽게', '스럽다', '로운', '롭게', '롭다', '으로', '에게', '에서', '는', '은', '을', '를', '에', '와', '과', '의', '이', '가', '도', '게', '히', '기', '음', '다', '고'];
let KOLEX = null;
function koLex() {
  if (!KOLEX) KOLEX = fetch(ocrURL('ocr/ko-lex.txt')).then(r => r.ok ? r.text() : '').then(t => new Set(t.split('\n').filter(Boolean))).catch(() => new Set());
  return KOLEX;
}
function koWordOk(w, L) {
  const c = w.charCodeAt(w.length - 1) - 0xAC00;
  const cands = [w];
  for (const e of KO_END) if (w.length > e.length && w.endsWith(e)) cands.push(w.slice(0, -e.length));
  if (c >= 0 && c < 11172 && (c % 28 === 4 || c % 28 === 8)) cands.push(w.slice(0, -1) + String.fromCharCode(0xAC00 + c - c % 28)); // 받침 ㄴ·ㄹ 관형형 → 어간
  return cands.some(s => (s.length >= 2 && L.has(s)) || L.has(s + '다') || L.has(s + '하다'));
}
// 낱말 목록에 그대로 있거나 '어간 + 하다·시키다…' 꼴로 확실한 낱말인지 ('습이'처럼 조사를 떼어야만 통과하는 잡티와 구별)
const KO_VEND = ['하다', '시키다', '되다', '받다', '스럽다', '롭다', '하는', '하게', '한', '적인', '적으로', '스러운', '로운'];
function koExact(t, L) {
  t = String(t).replace(/\(.*$/, '').replace(/[^가-힣]/g, '');
  if (t.length < 2) return false;
  if (L.has(t)) return true;
  return KO_VEND.some(e => t.endsWith(e) && t.length - e.length >= 2 && L.has(t.slice(0, -e.length)));
}
// 뜻 한 덩어리 → 'ok' | 'one'(한 글자뿐: 확인 필요) | 'bad'(낱말이 아님)
function koChunk(chunk, L) {
  const core = chunk.replace(/\([^)]*\)/g, ' ').replace(/[^가-힣\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!core) return 'bad';
  const ws = core.split(' ');
  if (ws.length === 1 && ws[0].length === 1) return L.has(ws[0]) ? 'one' : 'bad';
  const good = ws.filter(w => koWordOk(w, L)).length;
  return good >= Math.max(1, ws.length * 0.6) ? 'ok' : 'bad';
}
// 짝지은 줄 점검: 엉터리 뜻 덩어리는 빼고, 의심스러운 줄에는 표시(flag)를 붙임. 쓸 수 없는 줄은 null
function ocrCheckRow(r, dict, L) {
  const enWords = r.en.toLowerCase().split(/\s+/).filter(Boolean);
  const enOk = enWords.length && enWords.every(w => dict.has(w) || (w.length <= 3 && ['a', 'an', 'to', 'of', 'in', 'on', 'up', 'by', 'at', 'for', 'off', 'out', 'sb', 'sth'].includes(w)));
  if (r.en.replace(/[^A-Za-z]/g, '').length < 3) return null; // 'jo', 'or' 같은 조각
  // 괄호 짝 맞추기, 괄호 안 띄어쓰기 정리
  let ko = r.ko.replace(/^[)\]]+|[(\[]+$/g, '').replace(/\(([^)]*)$/, '$1').replace(/^([^(]*)\)/, '$1').replace(/\(\s*([^)]*?)\s*\)/g, (a, x) => '(' + x.split(/\s+/).reduce((acc, w) => acc.length && /^[가-힣]$/.test(acc[acc.length - 1].slice(-1) + w) && w.length === 1 && acc[acc.length - 1].length === 1 ? (acc[acc.length - 1] += w, acc) : (acc.push(w), acc), []).join(' ') + ')').trim();
  if (!L.size) return Object.assign(r, { ko, flag: enOk ? '' : 'en' });
  const parts = ko.split(/\s*,\s*/).filter(Boolean), st = parts.map(p => koChunk(p, L));
  const keep = parts.filter((p, i) => st[i] !== 'bad');
  let flag = '';
  if (!keep.length) { if (!enOk) return null; flag = 'ko'; }
  else { ko = keep.join(', '); if (keep.length < parts.length) flag = 'drop'; else if (keep.length === 1 && st[parts.indexOf(keep[0])] === 'one') flag = 'one'; }
  if (!enOk) flag = flag || 'en';
  if (!flag && OCR.low.has(r.en.toLowerCase())) flag = 'low';
  return Object.assign(r, { ko, flag });
}
const OCR_FLAG = { ko: '사진에서 뜻을 제대로 읽지 못했어요. 뜻을 고쳐 주세요', drop: '흐린 뜻 일부를 뺐어요. 빠진 뜻이 있으면 더해 주세요', one: '한 글자 뜻이에요. 맞는지 확인해 주세요', en: '사전에 없는 영어예요. 철자를 확인해 주세요', low: '사진에서 흐리게 읽혔어요. 영어와 뜻을 꼭 확인해 주세요' };

/* ---------- 기운 사진 바로 세우기 + 사전식 쪽(큰 표제어 옆에 뜻) 읽기 ---------- */
// 기울기: 같은 줄에서 바로 오른쪽에 붙은 비슷한 크기의 낱말끼리 높이 차이 / 거리 (가운데값)
function ocrPairSlope(words) {
  const ws = words.filter(w => w.y1 - w.y0 >= 10 && w.t.length >= 2), sl = [];
  for (const w of ws) {
    const h = w.y1 - w.y0, cy = (w.y0 + w.y1) / 2;
    let best = null, bd = 1e9;
    for (const o of ws) {
      if (o === w) continue;
      const oh = o.y1 - o.y0, gap = o.x0 - w.x1;
      if (gap < -2 || gap > h * 2.5 || oh < h * 0.7 || oh > h * 1.4) continue;
      const dy = Math.abs((o.y0 + o.y1) / 2 - cy); if (dy > h * 0.8) continue;
      if (gap < bd) { bd = gap; best = o; }
    }
    if (best) { const dx = (best.x0 + best.x1) / 2 - (w.x0 + w.x1) / 2; if (dx > h) sl.push(((best.y0 + best.y1) / 2 - cy) / dx); }
  }
  if (sl.length < 6) return 0;
  sl.sort((a, b) => a - b);
  return clamp(sl[sl.length >> 1], -0.2, 0.2);
}
// 영어 사전에 있는 낱말을 또렷하게(신뢰도 60 이상) 몇 개 읽었는지: 사진 방향 고르기에 씀
function ocrDictHits(data, dict) { return ocrWords(data).filter(w => /^[A-Za-z]{3,}[.,]?$/.test(w.t) && w.c >= 60 && dict.has(w.t.toLowerCase().replace(/[.,]$/, ''))).length; }
// 그림을 90° 단위로 돌림 (max: 긴 쪽 최대 크기, 방향 고르기용으로 작게)
function ocrTurn(c, deg, max) {
  const k = max ? Math.min(1, max / Math.max(c.width, c.height)) : 1, sw = deg % 180 !== 0;
  const W = Math.round(c.width * k), H = Math.round(c.height * k), o = document.createElement('canvas');
  o.width = sw ? H : W; o.height = sw ? W : H;
  const g = o.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, o.width, o.height);
  g.translate(o.width / 2, o.height / 2); g.rotate(deg * Math.PI / 180); g.drawImage(c, -W / 2, -H / 2, W, H);
  return o;
}
function ocrRotate(c, slope) {
  const a = -Math.atan(slope), W = c.width, H = c.height;
  const nw = Math.round(Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a))), nh = Math.round(Math.abs(W * Math.sin(a)) + Math.abs(H * Math.cos(a)));
  const o = document.createElement('canvas'); o.width = nw; o.height = nh;
  const g = o.getContext('2d'); g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, nw, nh);
  g.translate(nw / 2, nh / 2); g.rotate(a); g.drawImage(c, -W / 2, -H / 2);
  return o;
}
// 표제어: 다른 영어보다 크게(1.45배 이상) 쓰인, 쪽 왼쪽의 사전 낱말
function ocrHeadwords(words, dict, W) {
  // 굵은 표제어가 'barr' + 'ier'처럼 두 조각으로 읽히면 붙여 봄 (붙인 말이 사전에 있을 때만. 안 그러면 'barr'가 'bar'로 고쳐져 barrier를 잃어요)
  const glue = [];
  for (const a of words) for (const b of words) {
    if (a === b || !/^[A-Za-z]+$/.test(a.t) || !/^[A-Za-z]+[.,]?$/.test(b.t)) continue;
    const ha = a.y1 - a.y0, gap = b.x0 - a.x1;
    if (gap < -3 || gap > ha * 0.3 || Math.abs((a.y0 + a.y1) / 2 - (b.y0 + b.y1) / 2) > ha * 0.4) continue;
    const t = (a.t + b.t).replace(/[.,]$/, '');
    if (dict.has(t.toLowerCase())) glue.push({ t, x0: a.x0, y0: Math.min(a.y0, b.y0), x1: b.x1, y1: Math.max(a.y1, b.y1), c: Math.min(a.c, b.c) });
  }
  const lat = words.concat(glue).filter(w => /^[A-Za-z][A-Za-z\-]*[.,]?$/.test(w.t)).sort((a, b) => b.c - a.c);
  const hs = lat.map(w => w.y1 - w.y0).sort((a, b) => a - b), med = hs[hs.length >> 1] || 20;
  const out = [];
  for (const w of lat) {
    const h = w.y1 - w.y0, t = w.t.toLowerCase().replace(/[^a-z\-]/g, '');
    if (h < med * 1.35 || t.length < 3 || w.x0 > W * 0.35) continue;
    const fixed = dict.has(t) ? t : ocrFix(t, dict);
    if (!dict.has(fixed)) continue;
    // 한 줄에 표제어는 하나. 같은 자리를 더 넓게 읽은 낱말이 있으면 그쪽('and'보다 'band')
    const same = out.findIndex(o => Math.abs((o.y0 + o.y1) / 2 - (w.y0 + w.y1) / 2) < h * 0.6);
    if (same >= 0) { const o = out[same]; if (w.x0 < o.x1 && w.x1 > o.x0 && (w.x1 - w.x0) > (o.x1 - o.x0) * 1.15) out[same] = Object.assign({}, w, { t: fixed }); continue; }
    out.push(Object.assign({}, w, { t: fixed }));
  }
  // 표제어는 왼쪽 여백에 나란히: 가장 왼쪽 표제어에서 표제어 높이 3.5배 넘게 떨어진 것(각주·예문 낱말)은 뺌
  if (out.length) { const minX = Math.min(...out.map(o => o.x0)), hm = out.map(o => o.y1 - o.y0).sort((a, b) => a - b)[out.length >> 1]; for (let k = out.length - 1; k >= 0; k--) if (out[k].x0 - minX > hm * 3.5) out.splice(k, 1); }
  return out.sort((a, b) => a.y0 - b.y0);
}
// 뜻 줄 글자 → 뜻 목록: 품사 표시(명·동), 번호, 영어 동의어, 기호를 빼고 진짜 낱말인 뜻만 (최대 4개)
function ocrMeanLine(text, L) {
  let t = String(text || '').replace(/[㈀-㋿①-⓿]/g, ' ')
    // 괄호: 앞 글자에 붙은 한글 괄호('붕대(를 감다)')만 남기고, 띄어 쓴 설명 괄호·영어 괄호·짝 없는 괄호는 뺌
    .replace(/(^|[^가-힣])\([^)]*\)?/g, '$1 ')
    .replace(/\(([^)]*)\)?/g, (a, x) => /[가-힣]/.test(x) && a.endsWith(')') ? a : ' ')
    .replace(/[A-Za-z0-9@#*~_=|\[\]{}<>"“”'`^:;!?&%$+\\]+/g, m => /^\d+$/.test(m) ? ' ' + m + '.' : ' ');
  const parts = t.split(/\s*(?:\d+\s*\.|[,，·/]|\.\s)\s*/).map(p => p.replace(/[.]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const out = [];
  out.fix = 0; // 앞 글자를 떼어 내 억지로 낱말을 만든 횟수 (많을수록 덜 믿을 만한 줄)
  for (let p of parts) {
    let ws = p.split(' ');
    // '설 명 하다'처럼 낱글자로 쪼개 읽힌 한글은 먼저 붙임 (그래야 가운데 '명'이 품사 표시로 지워지지 않아요)
    // 붙인 말이 진짜 낱말일 때만 ('더 밍 흥붕대'처럼 잡티 글자까지 붙여 뜻을 망치지 않게)
    for (let i = 0; i < ws.length; i++) if (/^[가-힣]$/.test(ws[i]) && /^[가-힣]$/.test(ws[i + 1] || '')) {
      let j = i, t = ''; while (j < ws.length && /^[가-힣]$/.test(ws[j])) t += ws[j++];
      if (j < ws.length && /^[가-힣]/.test(ws[j])) t += ws[j++];
      if (koWordOk(t.replace(/\(.*$/, ''), L)) ws.splice(i, j - i, t);
    }
    ws = ws.filter(w => !/^(명|동|형|부|유|반|참|명동|동명|숙)$/.test(w));
    while (ws.length > 1 && /^[가-힣]$/.test(ws[0])) ws.shift(); // '명'을 잘못 읽은 한 글자 등
    // 품사 표시가 낱말 앞에 붙어 읽힌 경우('형회붕대(를') 앞 1~2글자를 떼어 봄
    if (ws.length) { const m = ws[0].match(/^([가-힣]+)(.*)$/); if (m && !koWordOk(m[1], L)) for (const k of [1, 2]) if (m[1].length - k >= 2 && koWordOk(m[1].slice(k), L)) { ws[0] = m[1].slice(k) + m[2]; out.fix++; break; } }
    while (ws.length && !koWordOk(ws[0].replace(/\(.*$/, ''), L)) ws.shift();
    while (ws.length > 1 && !koWordOk(ws[ws.length - 1].replace(/\(.*$/, '').replace(/[()]/g, ''), L) && !/\)$/.test(ws[ws.length - 1])) ws.pop();
    // '-다'로 끝난 뜻 뒤에 붙은 한 글자 찌꺼기('묵다 후', '결속시키다 비)')는 버림 (유의어 표시·번호를 잘못 읽은 것)
    while (ws.length > 1 && /^[가-힣]\)?$/.test(ws[ws.length - 1]) && /다$/.test(ws[ws.length - 2])) { ws.pop(); out.fix++; }
    p = ws.join(' ').replace(/\(\s*([^)]*?)\s*\)/g, (a, x) => '(' + x.replace(/\s+/g, ' ') + ')');
    if (p && koChunk(p, L) === 'ok' && !out.includes(p)) out.push(p);
    if (out.length >= 4) break;
  }
  out.loose = out.filter(m => !m.split(' ').some(t => koExact(t, L))).length;
  return out;
}
// 오츠 방법으로 흑백 나누기 (잘라 낸 그림 안의 밝기 분포로 기준을 정함)
function ocrOtsu(cv, g) {
  const id = g.getImageData(0, 0, cv.width, cv.height), d = id.data, hist = new Float64Array(256), n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) hist[d[i]]++;
  let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
  let sB = 0, wB = 0, best = 0, th = 128;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = n - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; th = t; } }
  for (let i = 0; i < d.length; i += 4) { const v = d[i] > th ? 255 : 0; d[i] = d[i + 1] = d[i + 2] = v; }
  g.putImageData(id, 0, 0);
}
// 사전식 쪽: 표제어마다 오른쪽 뜻 자리만 잘라서 한국어로 다시 읽음
async function ocrDictPage(c, words, dict, L, run) {
  const heads = ocrHeadwords(words, dict, c.width);
  if (window.__dd) window.__dd.push('heads ' + heads.map(h => h.t + '@' + h.x0 + ',' + h.y0 + '-' + h.y1).join(' '));
  if (heads.length < 2) return null;
  const allW = words;
  const rows = [];
  await OCR.worker.setParameters({ tessedit_pageseg_mode: '6' });
  try {
    for (let i = 0; i < heads.length; i++) {
      const hw = heads[i], hh = hw.y1 - hw.y0, cy = (hw.y0 + hw.y1) / 2, nx = heads[i + 1], pv = heads[i - 1];
      // 이 표제어 둘레의 글줄 기울기 (쪽이 휘어 있으면 위아래 기울기가 달라요)
      const near = allW.filter(w => Math.abs((w.y0 + w.y1) / 2 - cy) < hh * 4);
      const slope = ocrPairSlope(near) || ocrPairSlope(allW);
      const left = Math.round(hw.x1 + hh * 2), rx = c.width;
      const drop = slope * (rx - left); // 오른쪽 끝에서 글줄이 내려가거나 올라가는 만큼
      const top = Math.max(0, Math.round(Math.max(cy - hh * 1.1 + Math.min(0, drop), pv ? (pv.y0 + pv.y1) / 2 + Math.min(0, drop) : 0)));
      const bottom = Math.min(c.height, Math.round(Math.min(cy + hh * 1.6 + Math.max(0, drop), nx ? (nx.y0 + nx.y1) / 2 + Math.max(0, drop) : 1e9)));
      if (left >= c.width - 20 || bottom - top < 10) continue;
      // 표제어도 따로 크게 잘라 한 낱말로 다시 읽음 ('barrier'를 'barrio'로 읽는 일 줄이기)
      try {
        const pad = Math.round(hh * 0.25), hc = document.createElement('canvas'), sx = 2;
        hc.width = Math.round((hw.x1 - hw.x0 + pad * 2) * sx); hc.height = Math.round((hh + pad * 2) * sx);
        const hg = hc.getContext('2d'); hg.fillStyle = '#FFFFFF'; hg.fillRect(0, 0, hc.width, hc.height);
        hg.drawImage(c, hw.x0 - pad, hw.y0 - pad, hw.x1 - hw.x0 + pad * 2, hh + pad * 2, 0, 0, hc.width, hc.height);
        await OCR.eng.setParameters({ tessedit_pageseg_mode: '8' });
        const hr = await OCR.eng.recognize(hc);
        await OCR.eng.setParameters({ tessedit_pageseg_mode: '11' });
        const ht = String(hr.data.text || '').toLowerCase().replace(/[^a-z\-]/g, ''), hconf = hr.data.confidence || 0;
        if (ht.length >= 3 && dict.has(ht) && ht !== hw.t && hconf >= 70) hw.t = ht;
        // 처음에 아주 흐리게(50 미만) 읽힌 표제어는 크게 다시 읽어도 사전 낱말로 확인되지 않으면 버림 (각주 한글을 'ray'로 읽은 것 같은 잡티)
        else if ((hw.c || 0) < 50 && !(ht === hw.t && hconf >= 50)) continue;
      } catch (e) { }
      // 뜻 자리는 원래 크기와 1.5배로 두 번 읽고, 더 믿을 만한 줄을 고름 (가는 한글 글씨는 크기에 따라 잘 읽히는 게 달라요)
      let best = null;
      const cands = [];
      for (const [cs, bin] of [[1, false], [1.5, false]]) {
        const cc = document.createElement('canvas'); cc.width = Math.round((c.width - left) * cs); cc.height = Math.round((bottom - top) * cs);
        const cg = cc.getContext('2d', { willReadFrequently: true }); cg.imageSmoothingQuality = 'high'; cg.drawImage(c, left, top, c.width - left, bottom - top, 0, 0, cc.width, cc.height);
        if (bin) ocrOtsu(cc, cg); // 색 띠(초록 제목 띠 등) 위 글자: 잘라 낸 곳만의 기준으로 흑백
        const r = await OCR.worker.recognize(cc, {}, { blocks: true });
        if (MK.run !== run) return null;
        for (const b of r.data.blocks || []) for (const pa of b.paragraphs || []) for (const ln of pa.lines || []) {
          const ms = ocrMeanLine(ln.text, L); if (window.__dd) window.__dd.push(hw.t + ' x' + cs + ' c' + Math.round(ln.confidence) + ' ' + ln.text.trim() + ' => ' + JSON.stringify(ms)); if (!ms.length) continue;
          // 위치는 뜻이 시작되는 첫 한글 낱말로 (휘어 내려가는 긴 줄은 줄 전체 상자의 가운데가 실제보다 아래로 잡혀서 엉뚱한 줄이 뽑혔어요)
          const fw = (ln.words || []).find(w => /[가-힣]/.test(w.text || '') && w.bbox);
          const bb = (fw && fw.bbox) || ln.bbox || { x0: 0, x1: 0, y0: 0, y1: 0 };
          const lx = (bb.x0 + bb.x1) / 2 / cs + left, ly = (bb.y0 + bb.y1) / 2 / cs + top; // 잘라 낸 그림 안 위치 → 쪽 위치
          // 기울기로 본 표제어 줄의 높이 (뜻은 표제어보다 살짝 위에 맞춰 찍히는 책이 많아서 기울기는 절반만)
          const eyOf = j => { const h = heads[j]; return (h.y0 + h.y1) / 2 + slope * 0.5 * (lx - (h.x0 + h.x1) / 2); };
          const ey = eyOf(i);
          // 다른 표제어 줄에 더 가까운 뜻 줄은 그 표제어 것
          let closest = i, cd = Math.abs(ly - ey);
          for (let j = 0; j < heads.length; j++) if (j !== i && Math.abs(ly - eyOf(j)) < cd) { cd = Math.abs(ly - eyOf(j)); closest = j; }
          if (closest !== i) continue;
          const conf = clamp((+ln.confidence || 50) / 100, 0.2, 1);
          const sc = Math.min(8, ms.join('').length) * conf - Math.max(0, Math.abs(ly - ey) - hh * 0.5) / hh * 6 - (ms.fix || 0) * 0.5 - (ms.loose || 0) * 1.5;
          const lb = ln.bbox || bb;
          cands.push({ sc, ms, conf, b: { x0: lb.x0 / cs + left, y0: lb.y0 / cs + top, x1: lb.x1 / cs + left, y1: lb.y1 / cs + top } });
        }
      }
      // 여러 번 읽어서 같은 뜻이 또 나오면 믿을 만한 뜻 (한 번만 나온 뜻은 잘못 읽었을 가능성이 커요)
      const votes = new Map(); for (const cd of cands) for (const m of new Set(cd.ms)) votes.set(m, (votes.get(m) || 0) + 1);
      for (const cd of cands) { const v = cd.ms.reduce((a, m) => a + (votes.get(m) - 1), 0); cd.sc += v * 3; if (!best || cd.sc > best.sc) best = cd; }
      if (best) {
        rows.push(hw.t + ' - ' + best.ms.join(', '));
        if (OCR.boxes) ocrKeepBox(hw.t, ocrBox([hw, best.b]));
        if (best.conf < 0.5 || (hw.c || 0) < 85) OCR.low.add(hw.t); // 흐리게 읽힌 줄: 확인 화면에서 빨간 칸
      }
      ocrShow('', 0.3 + 0.7 * (OCR.i + 0.6 + 0.4 * (i + 1) / heads.length) / OCR.n);
    }
  } finally { await OCR.worker.setParameters({ tessedit_pageseg_mode: '4' }); }
  return rows.length >= 2 ? rows : null;
}
async function mkRead() {
  if (!MK.images.length) return;
  const run = MK.run = {};
  MK.err = ''; MK.step = 'reading'; OCR.i = 0; OCR.pass = 0; OCR.low = new Set(); OCR.n = Math.min(OCR_MAX, MK.images.length); renderMake();
  ocrShow('글자 읽는 도구 준비 중', 0.03);
  try {
    await ocrWorker();
    const dict = await ocrDict();
    if (MK.run !== run) return;
    const lines = [], snips = new Map(); let raw = '';
    const slowT = setTimeout(() => { const s = $('#ocrslow'); if (s && MK.run === run) s.hidden = false; }, 75000);
    for (let i = 0; i < OCR.n; i++) {
      OCR.boxes = new Map();
      OCR.i = i; OCR.pass = 0; ocrShow(`사진 ${i + 1}/${OCR.n} 읽는 중`, 0.3 + 0.7 * i / OCR.n);
      let c = await ocrImage(MK.images[i].file);
      if (MK.run !== run) return;
      // 영어 먼저: 사전식 쪽(큰 표제어 + 오른쪽 뜻)이면 표제어마다 뜻 자리만 따로 읽고 끝 (한국어 전체 읽기는 건너뜀)
      let r2 = await OCR.eng.recognize(c, {}, { text: true, blocks: true });
      if (MK.run !== run) return;
      // 옆으로 눕거나 거꾸로 찍힌 사진(사진 정보에 방향이 없을 때): 영어 낱말이 거의 안 읽힐 때만 작게 줄여 90°·270°·180°로 돌려 보고
      // 가장 잘 읽히는 방향으로 다시 읽음. 바로 찍힌 사진은 이 단계를 건너뛰어서 느려지지 않아요
      if (ocrDictHits(r2.data, dict) < 4) {
        ocrShow('사진 방향 확인 중', 0.3 + 0.7 * (i + 0.2) / OCR.n);
        let best = { n: ocrDictHits(r2.data, dict) * 1.5, deg: 0 };
        for (const deg of [90, 270, 180]) {
          const t = ocrTurn(c, deg, 1400), rr = await OCR.eng.recognize(t, {}, { text: true, blocks: true });
          if (MK.run !== run) return;
          const n = ocrDictHits(rr.data, dict); if (n > best.n) best = { n, deg };
        }
        if (best.deg) { c = ocrTurn(c, best.deg); r2 = await OCR.eng.recognize(c, {}, { text: true, blocks: true }); if (MK.run !== run) return; }
      }
      OCR.pass = 1;
      raw += ((r2.data && r2.data.text) || '') + '\n';
      const keepSnips = () => { for (const [en, b] of OCR.boxes) if (!snips.has(en)) { const u = ocrSnip(c, b); if (u) snips.set(en, u); } };
      const dictRows = await ocrDictPage(c, ocrWords(r2.data), dict, await koLex(), run);
      if (MK.run !== run) return;
      if (dictRows) { keepSnips(); lines.push(...dictRows); continue; }
      const r1 = await OCR.worker.recognize(c, {}, { text: true, blocks: true });
      if (MK.run !== run) return;
      raw += ((r1.data && r1.data.text) || '') + '\n';
      OCR.boxes = new Map();
      const pairs = ocrPairs(ocrMerge(ocrWords(r1.data), ocrWords(r2.data), dict), dict, ocrSlope(r1.data, r2.data));
      keepSnips();
      // 위치로 짝을 못 지으면 글자만으로
      lines.push(...(pairs.length ? pairs : ocrTidy((r1.data && r1.data.text) || '').split('\n')));
    }
    const tidy = ocrTidy(lines.join('\n'));
    const L = await koLex();
    const parsed = mkParse(tidy).map(r => Object.assign(r, { ko: ocrKo(r.ko) }));
    clearTimeout(slowT); OCR.boxes = null;
    const rows = mkDedupe(parsed.filter(ocrRowOk)).map(r => ocrCheckRow(r, dict, L)).filter(Boolean);
    // 확인 화면: 줄마다 사진 속 원래 줄을 함께 보여 줌 (영어 단어로 찾음)
    for (const r of rows) { const k = r.en.toLowerCase(); r.snip = snips.get(k) || snips.get(k.split(' ')[0]) || ''; }
    MK.paste = tidy;
    const day = (raw + '\n' + tidy).match(/\b(day|unit|lesson)\s*0*(\d{1,3})\b/i);
    if (day && !mkCleanKo(MK.name)) MK.name = day[1][0].toUpperCase() + day[1].slice(1).toLowerCase() + ' ' + day[2].padStart(2, '0');
    if (!rows.length) {
      MK.step = 'pick'; MK.pasteOpen = true;
      MK.err = '사진에서 ‘영어 단어 + 한글 뜻’ 줄을 찾지 못했어요. 아래 칸에 읽은 글자를 넣어 두었으니 고쳐서 ‘이 단어들로 확인하기’를 눌러 주세요.';
    } else {
      MK.rows = rows.slice(0, MK_MAX); MK.step = 'review';
      voiceWarm(); // 단어를 확인하는 동안 목소리를 미리 준비 (단어장을 다 만든 뒤 받기 시작하면 첫 이야기 줄이 늦게 나와요)
      const nf = rows.filter(r => r.flag).length;
      MK.note = `사진에서 ${rows.length}단어를 읽었어요.` + (nf ? ` 그중 ${nf}개는 빨간 칸으로 표시했어요. 꼭 확인하고 고쳐 주세요.` : ' 틀린 글자가 없는지 한 번 훑어봐 주세요.') + (rows.length > MK_MAX ? ` 앞의 ${MK_MAX}개만 가져왔어요.` : '');
    }
  } catch (e) {
    OCR.boxes = null;
    if (MK.run !== run) return;
    MK.step = 'pick';
    MK.err = e && e.code === 'ocr_load' ? '글자 읽는 도구를 불러오지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요. (처음 한 번 약 9MB를 받아요)' : e && e.code === 'image_rejected' ? '사진을 열 수 없어요. JPG·PNG 사진으로 해 주세요.' : '사진을 읽지 못했어요. 다른 사진으로 하거나 단어를 직접 입력해 주세요.';
    ocrStop();
  }
  MK.run = null;
  renderMake();
}

