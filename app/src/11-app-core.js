/* ================= 앱 동작 ================= */
const STORE_KEY = 'day02-voca-mission-v1';
const SAVE = { v: 2, dir: 'en', diff: 'normal', sound: true, narr: true, rate: 1, best: {}, wrong: {}, seen: {}, lives: 3, bank: 0, done: 0 };
function loadSave() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        // 규칙이 바뀐 예전 기록(‘알아요’ 방식)의 클리어 기록은 새 게임에 넘기지 않음
        if (d.v !== 2) { delete d.best; delete d.lives; delete d.bank; delete d.done; }
        Object.assign(SAVE, d); SAVE.v = 2;
      }
    }
  } catch (e) { /* 저장소를 쓸 수 없는 환경이면 기록 없이 진행 */ }
}
function persist() { try { stashProgress(); localStorage.setItem(STORE_KEY, JSON.stringify(SAVE)); } catch (e) { } }

// 단어 1개당 제한 시간
// 단어 1개당 제한 시간 (뜻이 하나 늘 때마다 extra초 더)
const DIFF = { hard: { label: '도전', sec: 7, extra: 4 }, normal: { label: '보통', sec: 10, extra: 5 }, easy: { label: '여유', sec: 15, extra: 7 }, relax: { label: '느긋', sec: 25, extra: 10 } };
const LIVES = 3, BANK_MAX = 120000, PENALTY = 2000;
const DIFF_ORDER = ['hard', 'normal', 'easy', 'relax'];
const RATES = [0.8, 1, 1.2, 1.5];
const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const $ = (s, el = document) => el.querySelector(s);
const clamp = (v, a, b) => b < a ? a : Math.max(a, Math.min(b, v));
const ART = {};
for (const k in SCENE_ART) ART[k] = SCENE_ART[k]();
const sceneOf = key => SCENES.find(s => s.key === key);
const shortW = id => id.replace(/ A to-v$/, '').replace(/ ~$/, '');
const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const mHTML = m => esc(m).replace(/\(([^)]*)\)/g, '<small>($1)</small>');
const exHTML = s => esc(s).replace(/\[([^\]]+)\]/g, '<b>$1</b>');

const ICON = {
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4.5 7.5 12 15 19.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 15V6.5a2.2 2.2 0 0 1 4.4 0V13l.3-.1a2.2 2.2 0 0 1 3.9 1.1 2.2 2.2 0 0 1 3.4 1.6 2 2 0 0 1 3 1.8v4.3c0 4.4-3.3 7.8-7.6 7.8h-1.8c-2.4 0-4.4-1-5.9-2.9l-4.2-5.4a2.2 2.2 0 0 1 3.3-2.8z" fill="currentColor" stroke="#23253F" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 7.5 4.5 5M9.5 4.6 9 1.6M5.8 11H2.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  pic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="9" cy="10" r="2" fill="currentColor"/><path d="M4.5 17.5l5-5 3.5 3.5 2.5-2.5 4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
  full: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 8.5V13l3 2M9.5 2.8h5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  enter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h13M13 6.5 18.5 12 13 17.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5 15.5 12 9 18.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5c2.6-1.2 5.3-1.2 8 .8 2.7-2 5.4-2 8-.8v13c-2.6-1.2-5.3-1.2-8 .8-2.7-2-5.4-2-8-.8z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 6.3v13" stroke="currentColor" stroke-width="2.2"/></svg>',
  down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9.5 12 15.5 18 9.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 8.5a2 2 0 0 1 2-2h2.3L9.3 4h5.4l1.5 2.5h2.3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.6" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 19.5l1-4.2L15.8 5a2 2 0 0 1 2.8 0l.4.4a2 2 0 0 1 0 2.8L8.7 18.5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M13.8 7l3.2 3.2" stroke="currentColor" stroke-width="2.2"/></svg>'
};
const LIFE = on => `<svg viewBox="0 0 24 22" class="${on ? 'on' : 'off'}" aria-hidden="true"><path d="M12 20.4 3.7 12.3A5.2 5.2 0 0 1 12 5.3a5.2 5.2 0 0 1 8.3 7z"/><path class="plus" d="M12 9.2v6M9 12.2h6"/></svg>`;
const secTxt = ms => (Math.max(0, ms) / 1000).toFixed(1) + '초';
const BOMB = '<svg class="bomb" viewBox="0 0 32 32" aria-hidden="true"><circle cx="14" cy="18.5" r="11" fill="#2B2F55" stroke="#9AA0C8" stroke-width="1.6"/><rect x="17.5" y="4.5" width="8" height="6.5" rx="1.6" transform="rotate(40 21.5 7.75)" fill="#7A819E" stroke="#23253F" stroke-width="1.5"/><circle cx="9.8" cy="14.2" r="3" fill="#FFFFFF" opacity=".4"/></svg>';
const SPARK = '<span class="spark-pos" id="spark"><svg class="fuse-spark" viewBox="0 0 22 22" aria-hidden="true"><polygon points="11,0 13.4,7 21,5.5 15.4,11 21,16.5 13.4,15 11,22 8.6,15 1,16.5 6.6,11 1,5.5 8.6,7" fill="#FFD84D" stroke="#F08A3C" stroke-width="1.4" stroke-linejoin="round"/><circle cx="11" cy="11" r="3" fill="#FFFFFF"/></svg></span>';
const STAR = (on, i) => `<svg viewBox="0 0 24 24" style="animation-delay:${(.25 + i * .22).toFixed(2)}s" aria-hidden="true"><path d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 18l-6.4 3.4L7 14.3l-5.3-5 7.2-.9z" style="fill:${on ? '#FFD23F' : 'var(--surface2)'};stroke:${on ? '#23253F' : 'var(--muted)'}" stroke-width="1.6" stroke-linejoin="round"${on ? '' : ' stroke-dasharray="3 2.4"'}/></svg>`;
function burstE(cx, cy, rx, ry, n, fill) {
  const p = [];
  for (let i = 0; i < n * 2; i++) { const k = i % 2 ? .7 : 1, a = i / (n * 2) * Math.PI * 2; p.push((cx + Math.cos(a) * rx * k).toFixed(1) + ',' + (cy + Math.sin(a) * ry * k).toFixed(1)); }
  return `<polygon points="${p.join(' ')}" fill="${fill}" stroke="#23253F" stroke-width="4" stroke-linejoin="round"/>`;
}
const badgeSVG = fill => `<svg viewBox="0 0 240 130" aria-hidden="true">${burstE(120, 65, 116, 62, 15, fill)}</svg>`;
const bossArt = n => {
  let o = rect(0, 0, 800, 500, '#2F3A6B', 0, 0) + burst(400, 250, 250, 170, 16, '#FFD84D', 6);
  o += txE(400, 222, 'BOSS', 66, '#23253F') + txE(400, 340, String(n), n > 99 ? 96 : 130, '#E5544B', { stroke: '#23253F', 'stroke-width': 5 });
  for (const [x, y] of [[90, 80], [710, 90], [110, 420], [690, 410]]) o += sparkle(x, y, 26, '#FFFFFF');
  return o;
};
const thumbSVG = art => `<svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${art}</svg>`;
// 목록 썸네일은 장면을 이미지로 만들어 재사용 (복잡한 그림을 화면에 여러 장 직접 그리지 않음).
// 처음엔 목록부터 바로 보여 주고, 그림은 한가할 때 한 장씩 채워요
const IMG = {};
const thumbIMG = key => IMG[key] ? `<img src="${IMG[key]}" alt="" decoding="async" draggable="false">` : `<img data-thumb="${key}" alt="" decoding="async" draggable="false">`;
const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 250 }) : setTimeout(f, 30));
function fillThumbs() {
  // 지금 보이는 화면의 썸네일만 (숨은 화면 것까지 그리느라 스토리 재생을 방해하지 않게)
  const el = [...document.querySelectorAll('img[data-thumb]')].find(im => im.offsetParent);
  if (!el) return;
  const k = el.dataset.thumb;
  IMG[k] = IMG[k] || 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">${artSceneMarkup(k)}</svg>`);
  for (const im of document.querySelectorAll(`img[data-thumb="${k}"]`)) { im.src = IMG[k]; im.removeAttribute('data-thumb'); }
  idle(fillThumbs);
}
const SPEED_SVG = (() => {
  let p = '';
  const n = 30, P = (a, r) => (50 + Math.cos(a) * r).toFixed(1) + ',' + (50 + Math.sin(a) * r).toFixed(1);
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + (i % 3) * .04, r1 = 40 + (i % 4) * 5, w = .026 + (i % 2) * .018; p += `<polygon points="${P(a - w, 85)} ${P(a + w, 85)} ${P(a, r1)}"/>`; }
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${p}</svg>`;
})();
function rrPath(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

