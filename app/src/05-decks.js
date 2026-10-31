/* ================= 단어장: 기본(창작 데모) + 사진으로 만든 단어장 =================
   앱은 언제나 WORDS·SCENES·ART 하나를 보고 움직여요. 단어장을 바꾸면 그 안의 내용만 갈아 끼우고,
   진행 기록(클리어·목숨·모은 시간·오답)은 단어장마다 따로 보관해요. */
const DECK_BUILTIN = { id: 'tales-v1', name: '창작 데모 · 동화 7편', builtin: true };
// 예전 기본 단어장(교재 Day 02)의 진행 기록은 SAVE.decks.day02에 지우지 않고 그대로 둠
const OLD_BUILTIN_ID = 'day02';
let DECK = DECK_BUILTIN;
let BUILTIN = null;
const PROG_KEYS = ['best', 'wrong', 'seen', 'lives', 'bank', 'done'];

function snapshotBuiltin() { BUILTIN = { words: Object.assign({}, WORDS), scenes: SCENES.slice(), art: Object.assign({}, ART) }; }
function applyDeckData(d) {
  for (const k of Object.keys(WORDS)) delete WORDS[k];
  Object.assign(WORDS, d.words);
  SCENES.length = 0; SCENES.push(...d.scenes);
  for (const k of Object.keys(ART)) delete ART[k];
  Object.assign(ART, d.art);
  for (const k of Object.keys(TPL)) delete TPL[k];
  for (const k of Object.keys(IMG)) delete IMG[k];
  if (SP) SP.key = null;
  if (PP) PP.key = null;
}
function stashProgress() {
  if (!SAVE.decks || typeof SAVE.decks !== 'object') SAVE.decks = {};
  SAVE.decks[SAVE.deck || DECK_BUILTIN.id] = Object.fromEntries(PROG_KEYS.map(k => [k, SAVE[k]]));
}
function loadProgress(id) {
  const p = (SAVE.decks || {})[id] || {};
  SAVE.best = p.best && typeof p.best === 'object' ? p.best : {};
  SAVE.wrong = p.wrong && typeof p.wrong === 'object' ? p.wrong : {};
  SAVE.seen = p.seen && typeof p.seen === 'object' ? p.seen : {};
  SAVE.lives = typeof p.lives === 'number' && p.lives > 0 ? Math.min(LIVES, p.lives) : LIVES;
  SAVE.bank = Math.max(0, +p.bank || 0);
  SAVE.done = Math.max(0, +p.done || 0);
  SAVE.deck = id;
}
// 저장된 단어장(JSON) → 앱이 쓰는 WORDS·SCENES·ART
function deckRuntime(deck) {
  const words = {}, scenes = [], art = {};
  for (const [id, w] of Object.entries(deck.words || {})) {
    if (!w || typeof w !== 'object') continue;
    const ans = (Array.isArray(w.ans) ? w.ans : []).filter(g => g && Array.isArray(g.ok)).map(g => ({ t: String(g.t), ok: g.ok.map(String).filter(Boolean) })).filter(g => g.ok.length);
    if (!ans.length) continue; // 정답이 없는 단어는 깰 수 없으니 뺌
    // 화면·복습에 보일 뜻은 게임이 정답으로 받는 뜻으로 (사진 글자 오류가 남은 옛 단어장도 깔끔하게)
    words[id] = Object.assign({}, w, { id, m: ans.map(g => g.t).join(', ') || String(w.m || ''), ans });
  }
  const has = id => Object.prototype.hasOwnProperty.call(words, id);
  (Array.isArray(deck.scenes) ? deck.scenes : []).forEach((s, i) => {
    if (!s || !Array.isArray(s.words)) return;
    // 자막의 단어 표시는 이 단어장에 실제로 있는 단어만
    const lines = (Array.isArray(s.lines) ? s.lines : []).filter(l => typeof l === 'string').map(l => l.replace(/\{([^|}]+)\|([^}]+)\}/g, (all, id, t) => has(id) ? all : t));
    const sc = { key: String(s.key), title: String(s.title || '에피소드'), words: s.words.filter(has), lines, n: i + 1 };
    if (!sc.words.length) return;
    sc.n = scenes.length + 1;
    scenes.push(sc);
    const P = comicPanels(sc.words.length);
    sc.words.forEach((id, k) => { words[id].scene = sc.key; words[id].spot = P[k]; });
    const specs = (deck.panels && deck.panels[sc.key]) || [];
    const all = s.words; // 그림 칸 설계는 원래 단어 순서대로 저장돼 있음
    art[sc.key] = genScene(sc.words.map(id => specs[all.indexOf(id)] || { subject: { kind: 'emoji', emoji: '📘' }, sign: shortW(id).slice(0, 18) }));
  });
  return { words, scenes, art };
}
// 시작할 때: 마지막으로 쓰던 단어장을 다시 엶 (저장된 진행 기록은 그 단어장 것)
function bootDeck() {
  if (!SAVE.decks || typeof SAVE.decks !== 'object') SAVE.decks = {};
  // 예전 기본 단어장을 쓰던 기록(단어장 표시가 없던 더 옛날 기록 포함)은 그 이름 그대로 보관하고, 창작 데모를 새로 시작
  if (SAVE.deck === OLD_BUILTIN_ID || (!SAVE.deck && SAVE.best && Object.keys(SAVE.best).length)) { SAVE.deck = OLD_BUILTIN_ID; stashProgress(); loadProgress(DECK_BUILTIN.id); }
  const id = typeof SAVE.deck === 'string' && SAVE.deck ? SAVE.deck : DECK_BUILTIN.id;
  SAVE.deck = id;
  if (id === DECK_BUILTIN.id) return;
  const d = DeckStore.get(id);
  let rt = null;
  try { rt = d ? deckRuntime(d) : null; } catch (e) { rt = null; }
  if (rt && rt.scenes.length) { DECK = { id: d.id, name: d.name, builtin: false }; applyDeckData(rt); }
  else { stashProgress(); loadProgress(DECK_BUILTIN.id); }
}
// 단어장 바꾸기. 바라던 단어장을 열었으면 true
function switchDeck(id) {
  if ($('#story-art-dialog')) artCloseDialog();
  stashProgress();
  const d = id && id !== DECK_BUILTIN.id ? DeckStore.get(id) : null;
  let ok = !id || id === DECK_BUILTIN.id;
  if (!d) { DECK = DECK_BUILTIN; applyDeckData(BUILTIN); loadProgress(DECK_BUILTIN.id); }
  else {
    let rt = null;
    try { rt = deckRuntime(d); } catch (e) { rt = null; }
    if (!rt || !rt.scenes.length) { DECK = DECK_BUILTIN; applyDeckData(BUILTIN); loadProgress(DECK_BUILTIN.id); toast('이 단어장은 망가져서 열 수 없어요. 기본 단어장을 열었어요'); }
    else { DECK = { id: d.id, name: d.name, builtin: false }; applyDeckData(rt); loadProgress(d.id); ok = true; }
  }
  persist();
  artHydrateCurrent();
  return ok;
}

/* ---------- 단어장 보관함: 이 기기(localStorage) + 가능하면 Claude 저장소(db, 내 계정 전용) ---------- */
const DeckStore = (() => {
  const KEY = 'voca-decks-v1', DEL = 'voca-decks-del-v1';
  let cache = {}, tomb = {}, db = null, uid = null, listeners = [];
  const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  function loadLocal() {
    try { cache = obj(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { cache = {}; }
    try { tomb = obj(JSON.parse(localStorage.getItem(DEL) || '{}')); } catch (e) { tomb = {}; }
  }
  function saveLocal() { try { localStorage.setItem(KEY, JSON.stringify(cache)); localStorage.setItem(DEL, JSON.stringify(tomb)); return true; } catch (e) { return false; } }
  const valid = d => d && typeof d === 'object' && d.id && Array.isArray(d.scenes) && !d.deleted;
  const coll = () => db.doc('data/users/' + uid + '/profile').collection('decks');
  const changed = () => listeners.forEach(f => { try { f(); } catch (e) { } });
  loadLocal();
  return {
    list() { return Object.values(cache).filter(valid).sort((a, b) => (b.updated || 0) - (a.updated || 0)); },
    get(id) { return Object.prototype.hasOwnProperty.call(cache, id) && valid(cache[id]) ? cache[id] : null; },
    onChange(f) { listeners.push(f); },
    get cloud() { return !!db; },
    async put(deck) {
      deck.updated = Date.now();
      if (uid && !deck.owner) deck.owner = uid;
      cache[deck.id] = deck; delete tomb[deck.id];
      const local = saveLocal();
      let cloud = false;
      if (db) { try { await coll().doc(deck.id).set(deck); cloud = true; } catch (e) { cloud = false; } }
      changed();
      return { local, cloud };
    },
    // 지울 때는 '지웠다'는 표시를 남겨서, 다른 기기나 늦게 연결된 저장소가 다시 올리지 않게
    async del(id) {
      const now = Date.now();
      delete cache[id]; tomb[id] = now; saveLocal();
      if (db) { try { await coll().doc(id).set({ id, deleted: true, updated: now }); } catch (e) { } }
      changed();
    },
    // 내 계정 저장소에 연결해서, 다른 기기에서 만든 단어장도 가져옴
    async connect() {
      try {
        if (!window.claude || typeof claude.use !== 'function') return;
        const [d, u] = await Promise.all([claude.use('db'), claude.use('user')]);
        if (!d || !u) return;
        const id = await u.id();
        if (!id) return;
        db = d; uid = id;
        const snap = await coll().get();
        let any = false;
        const ids = new Set();
        for (const doc of snap.docs) {
          const v = doc.data(); ids.add(doc.id);
          if (!v || !v.id) continue;
          const mine = cache[v.id], up = +v.updated || 0;
          if (v.deleted) { // 다른 기기에서 지운 단어장
            if (mine && (+mine.updated || 0) <= up) { delete cache[v.id]; any = true; }
            if ((+tomb[v.id] || 0) < up) { tomb[v.id] = up; any = true; }
            continue;
          }
          if ((+tomb[v.id] || 0) >= up) { try { await coll().doc(v.id).set({ id: v.id, deleted: true, updated: +tomb[v.id] }); } catch (e) { } continue; } // 이 기기에서 지웠는데 저장소엔 남아 있던 것
          if (!Array.isArray(v.scenes)) continue;
          if (!mine || up > (+mine.updated || 0)) { cache[v.id] = JSON.parse(JSON.stringify(v)); any = true; }
        }
        // 이 기기에만 있던 내 단어장(또는 로그인 전에 만든 것)만 계정 저장소에 올림. 다른 사람 단어장은 올리지 않음
        for (const v of Object.values(cache)) {
          if (!valid(v) || ids.has(v.id) || tomb[v.id] || (v.owner && v.owner !== uid)) continue;
          v.owner = uid; any = true;
          try { await coll().doc(v.id).set(v); } catch (e) { }
        }
        if (any) { saveLocal(); changed(); }
      } catch (e) { db = null; }
    }
  };
})();

