// 실행: npm test  (먼저 npm install로 jsdom을 받아요)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { build, out } = require('../build.cjs');
const { bootPage } = require('./page.cjs');

const STORE_KEY = 'day02-voca-mission-v1';
// 일반 사전 뜻으로 만든 연습용 단어 목록 (교재 내용 아님)
const ROWS = [
  ['bandage', '붕대', 'n'], ['barrier', '장벽, 장애물', 'n'], ['bundle', '다발, 꾸러미', 'n'], ['bind', '묶다', 'v'],
  ['explain', '설명하다', 'v'], ['ancient', '고대의', 'a'], ['quickly', '빠르게', 'd'], ['brave', '용감한', 'a'],
  ['decide', '결정하다', 'v'], ['carefully', '조심스럽게', 'd'], ['harvest', '수확', 'n'], ['shiver', '떨다', 'v']
].map(([en, ko, pos]) => ({ en, ko, pos }));

test('word-game/index.html is built from app/src (run: npm run build)', () => {
  assert.ok(fs.readFileSync(out, 'utf8') === build(), 'word-game/index.html differs from app/src — run: npm run build');
});

test('boots with the original demo deck and no errors', async () => {
  const p = bootPage();
  try {
    assert.match(p.document.querySelector('#home').textContent, /창작 데모/);
    const s = p.json('({ deck: SAVE.deck, scenes: SCENES.length, words: Object.keys(WORDS).length })');
    assert.equal(s.deck, 'tales-v1');
    assert.equal(s.scenes, 7);
    await new Promise(r => setTimeout(r, 50));
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});

test('demo deck: each story line marks its own words once, every word has answers', () => {
  const p = bootPage();
  try {
    const scenes = p.json(`SCENES.map(s => ({ key: s.key, words: s.words, marks: s.lines.join('\\n').match(/\\{[^|}]+\\|[^}]+\\}/g) || [] }))`);
    for (const s of scenes) {
      const ids = s.marks.map(m => m.slice(1, m.indexOf('|')));
      assert.deepEqual(ids, s.words, `scene ${s.key}: words in story order`);
    }
    const bad = p.json(`Object.keys(WORDS).filter(id => !WORDS[id].ans || !WORDS[id].ans.length || !WORDS[id].m || !WORDS[id].scene)`);
    assert.deepEqual(bad, []);
    // 그림은 장면마다 있음
    const art = p.json('SCENES.filter(s => !ART[s.key] || !/<svg/.test(ART[s.key])).map(s => s.key)');
    assert.deepEqual(art, []);
  } finally { p.close(); }
});

test('old progress (the earlier built-in deck) is kept under its own deck id and survives the first save', () => {
  const oldBest = { s1: { stars: 3, elapsed: 61000 } };
  const p = bootPage({ [STORE_KEY]: { v: 2, dir: 'ko', best: oldBest, lives: 2, bank: 4200, done: 1 } });
  try {
    const s = p.json('({ deck: SAVE.deck, dir: SAVE.dir, best: SAVE.best, lives: SAVE.lives, old: SAVE.decks.day02 })');
    assert.equal(s.deck, 'tales-v1');
    assert.equal(s.dir, 'ko'); // 설정은 그대로
    assert.deepEqual(s.best, {});
    assert.equal(s.lives, 3);
    assert.deepEqual(s.old.best, oldBest);
    p.run('persist()');
    const saved = JSON.parse(p.storage()[STORE_KEY]);
    assert.deepEqual(saved.decks.day02.best, oldBest);
    assert.equal(saved.decks.day02.bank, 4200);
  } finally { p.close(); }
});

test('a deck made on this device is saved, reopened after reload, and keeps its own progress', async () => {
  const p = bootPage();
  let store;
  try {
    p.run(`MK.rows = ${JSON.stringify(ROWS)}; MK.useAI = false;`);
    await p.run('mkMake()');
    const made = p.json('({ step: MK.step, err: MK.err, id: MK.deck && MK.deck.id, scenes: MK.deck && MK.deck.scenes.length, words: MK.deck && Object.keys(MK.deck.words).length })');
    assert.equal(made.err, '');
    assert.equal(made.step, 'done');
    assert.equal(made.words, ROWS.length);
    assert.ok(made.scenes >= 2);
    assert.deepEqual(p.errors, []);
    p.run(`switchDeck(${JSON.stringify(made.id)}); SAVE.best[SCENES[0].key] = { stars: 2, elapsed: 30000 }; persist();`);
    store = p.storage();
    var id = made.id;
  } finally { p.close(); }
  const q = bootPage(store);
  try {
    const s = q.json('({ deck: SAVE.deck, cur: DECK.id, words: Object.keys(WORDS).length, best: Object.keys(SAVE.best).length })');
    assert.equal(s.deck, id);
    assert.equal(s.cur, id);
    assert.equal(s.words, ROWS.length);
    assert.equal(s.best, 1);
    // 기본 단어장으로 돌아가도 사진 단어장 기록은 남음
    q.run(`switchDeck('tales-v1')`);
    assert.equal(q.json(`SAVE.decks[${JSON.stringify(id)}].best ? Object.keys(SAVE.decks[${JSON.stringify(id)}].best).length : 0`), 1);
  } finally { q.close(); }
});

test('OCR layout: pairs words with meanings on the same row or below, column by column', () => {
  const p = bootPage();
  try {
    const W = (t, x, y, c = 92, w = t.length * 14) => ({ t, x0: x, y0: y, x1: x + w, y1: y + 22, c });
    const words = [
      W('1', 4, 10), W('bandage', 30, 10), W('n.', 150, 10), W('붕대', 190, 10),
      W('2', 4, 60), W('barrier', 30, 60), W('장벽,', 190, 60), W('장애물', 250, 60),
      W('3', 4, 110), W('bundle', 30, 110), W('다발', 34, 140), // 뜻이 아랫줄에 있는 사전식
      W('river', 520, 10), W('강', 640, 10), W('quickly', 520, 60), W('빠르게', 640, 60)
    ];
    const dict = [['bandage', 1], ['barrier', 2], ['bundle', 3], ['river', 4], ['quickly', 5]];
    const rows = p.json(`ocrPairs(${JSON.stringify(words)}, new Map(${JSON.stringify(dict)}))`);
    assert.deepEqual(rows, ['bandage - 붕대', 'barrier - 장벽, 장애물', 'bundle - 다발', 'river - 강', 'quickly - 빠르게']);
    // 확인 화면용 '사진 속 원래 줄' 상자: 영어 단어와 뜻을 함께 감쌈 (기울기를 펴도 원래 위치로)
    const boxes = p.json(`(() => { OCR.boxes = new Map(); ocrPairs(${JSON.stringify(words)}, new Map(${JSON.stringify(dict)}), 0.01); const b = Object.fromEntries(OCR.boxes); OCR.boxes = null; return b; })()`);
    assert.deepEqual(Object.keys(boxes).sort(), ['bandage', 'barrier', 'bundle', 'quickly', 'river']);
    assert.deepEqual(boxes.barrier, { x0: 30, y0: 60, x1: 292, y1: 82 });
    assert.deepEqual(boxes.bundle, { x0: 30, y0: 110, x1: 114, y1: 162 });
    // 사전 한 글자 차이 고치기: 'barrler' → 'barrier'
    assert.equal(p.json(`ocrFix('barrler', new Map(${JSON.stringify(dict)}))`), 'barrier');
  } finally { p.close(); }
});

test('typed list parser reads numbered, colon, tab and Korean-first lines', () => {
  const p = bootPage();
  try {
    const rows = p.json(`mkParse(${JSON.stringify('1. bandage - 붕대\nbarrier: 장벽, 장애물\nbundle\t다발\n묶다 bind\n그냥 메모')}).map(r => r.en + '=' + r.ko)`);
    assert.deepEqual(rows, ['bandage=붕대', 'barrier=장벽, 장애물', 'bundle=다발', 'bind=묶다']);
  } finally { p.close(); }
});

test('answers: meaning variants count, negated meanings do not', () => {
  const p = bootPage();
  try {
    const r = p.json(`(() => {
      SAVE.dir = 'en';
      const ans = mkAnsFrom(null, '정확하게, 묶다');
      const ok = (s, k) => ans[k].ok.some(a => hasMeaning(norm(s), a));
      return { groups: ans.map(g => g.t), exact: ok('정확하게', 0), stem: ok('정확', 0), neg1: ok('부정확하게', 0), neg2: ok('정확하지 않게', 0), tie: ok('묶다', 1) };
    })()`);
    assert.deepEqual(r.groups, ['정확하게', '묶다']);
    assert.equal(r.exact, true);
    assert.equal(r.stem, true);
    assert.equal(r.neg1, false);
    assert.equal(r.neg2, false);
    assert.equal(r.tie, true);
  } finally { p.close(); }
});

test('auto story: every word once, no template leftovers, no repeated lines', () => {
  const p = bootPage();
  try {
    for (let n = 0; n < 8; n++) {
      const s = p.json(`(() => {
        const rows = {}; for (const r of ${JSON.stringify(ROWS)}) rows[r.en] = r;
        const ids = Object.keys(rows).slice(0, 7), st = mkStory(ids, rows, ${n}), ep = mkEpisode('t', st.title, ids, rows, st);
        return { ids, lines: ep.scene.lines, order: ep.scene.words };
      })()`);
      const marks = s.lines.join('\n').match(/\{[^|}]+\|[^}]+\}/g) || [];
      assert.deepEqual(marks.map(m => m.slice(1, m.indexOf('|'))).sort(), s.ids.slice().sort(), `story ${n}: each word marked once`);
      for (const l of s.lines) {
        assert.doesNotMatch(l, /\{[HFVPW]|\{(이가|은는|을를|와과)\}|undefined|null/, `story ${n}: leftover in "${l}"`);
        assert.doesNotMatch(l, /을\(를\)|이\(가\)|은\(는\)/, `story ${n}: unresolved particle in "${l}"`);
      }
      assert.equal(new Set(s.lines).size, s.lines.length, `story ${n}: repeated line`);
    }
  } finally { p.close(); }
});
