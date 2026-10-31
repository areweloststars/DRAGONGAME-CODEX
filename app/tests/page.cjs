// 테스트용: 게임 화면을 jsdom에서 켜요. 네트워크·음성·그림 그리기(캔버스)는 없는 휴대폰 앱 화면처럼 흉내 내요.
const vm = require('node:vm');
const { JSDOM, VirtualConsole } = require('jsdom');
const { build, parts } = require('../build.cjs');

// 캔버스 2D: 글자 너비 재기만 대충, 나머지 그리기 함수는 아무 일도 안 함
function fakeCanvas() {
  const ctx = { measureText: t => ({ width: String(t).length * 8 }) };
  return new Proxy(ctx, { get: (o, k) => (k in o ? o[k] : () => { }) });
}

// store: localStorage에 미리 넣어 둘 값 { 키: 글 또는 객체 }
function bootPage(store = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(e.message));
  vc.on('error', (...a) => errors.push(a.map(String).join(' ')));
  const dom = new JSDOM(build(), { url: 'https://example.test/word-game/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window;
  w.scrollTo = () => { };
  w.matchMedia = () => ({ matches: false, addEventListener() { }, removeEventListener() { }, addListener() { }, removeListener() { } });
  w.HTMLCanvasElement.prototype.getContext = fakeCanvas;
  w.HTMLMediaElement.prototype.play = () => Promise.resolve();
  w.HTMLMediaElement.prototype.pause = () => { };
  w.HTMLMediaElement.prototype.load = () => { };
  w.URL.createObjectURL = () => 'blob:test';
  w.URL.revokeObjectURL = () => { };
  w.fetch = () => Promise.reject(new Error('no network in tests'));
  for (const [k, v] of Object.entries(store)) w.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
  const ctx = dom.getInternalVMContext();
  w.addEventListener('error', e => errors.push(String(e.message || e.error)));
  vm.runInContext(parts().js, ctx, { filename: 'word-game/app.js' });
  const run = code => vm.runInContext(code, ctx);
  return {
    window: w,
    document: w.document,
    errors,
    run,
    // 페이지 안 값은 다른 실행 환경의 객체라서 JSON으로 꺼내 비교
    json: code => JSON.parse(run(`JSON.stringify(${code})`)),
    storage: () => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; },
    close: () => w.close()
  };
}

module.exports = { bootPage };
