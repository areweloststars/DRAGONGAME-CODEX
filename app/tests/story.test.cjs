// 이야기 자동 만들기: 한국어 활용·조사와 문장 품질 회귀 테스트
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { bootPage } = require('./page.cjs');

let page;
const P = () => page || (page = bootPage());
test.after(() => page && page.close());

test('Korean conjugation follows the irregular rules', () => {
  const past = P().json(`Object.fromEntries(${JSON.stringify(['묶', '설명하', '미루', '짓', '돕', '모르', '쓰', '듣', '받', '오', '마시', '되', '보내', '떨', '잡', '무섭', '그렇', '하얗', '좋', '따르', '서두르', '아프', '바쁘', '모으', '다치', '이루', '건네', '덥', '길', '책임을 지', '신경 쓰'])}.map(s => [s, koPast(s, '')]))`);
  assert.deepEqual(past, {
    묶: '묶었어요', 설명하: '설명했어요', 미루: '미뤘어요', 짓: '지었어요', 돕: '도왔어요', 모르: '몰랐어요', 쓰: '썼어요', 듣: '들었어요', 받: '받았어요', 오: '왔어요',
    마시: '마셨어요', 되: '됐어요', 보내: '보냈어요', 떨: '떨었어요', 잡: '잡았어요', 무섭: '무서웠어요', 그렇: '그랬어요', 하얗: '하얬어요', 좋: '좋았어요', 따르: '따랐어요',
    서두르: '서둘렀어요', 아프: '아팠어요', 바쁘: '바빴어요', 모으: '모았어요', 다치: '다쳤어요', 이루: '이뤘어요', 건네: '건넸어요', 덥: '더웠어요', 길: '길었어요',
    '책임을 지': '책임을 졌어요', '신경 쓰': '신경 썼어요'
  });
  const r = P().json(`({ ryeo: ['묶', '떨', '듣', '돕', '짓', '하'].map(s => koVerbForms(s, '').ryeo), neun: ['묶', '떨', '만들'].map(koVerbAttr), attr: ['무섭', '용감하', '작', '빨갛', '길', '재미있', '크'].map(s => koAdjAttr(s, '')) })`);
  assert.deepEqual(r.ryeo, ['묶으려고', '떨려고', '들으려고', '도우려고', '지으려고', '하려고']);
  assert.deepEqual(r.neun, ['묶는', '떠는', '만드는']);
  assert.deepEqual(r.attr, ['무서운', '용감한', '작은', '빨간', '긴', '재미있는', '큰']);
  const parts = P().json(`[['기사', '이'], ['용', '이'], ['학교', '로'], ['길', '로'], ['집', '로'], ['붕대', '을'], ['다발', '을'], ['토토', '와'], ['민', '과'], ['‘유대’', '이라고'], ['방패', '이었어요']].map(([w, p]) => koP(w, p))`);
  assert.deepEqual(parts, ['기사가', '용이', '학교로', '길로', '집으로', '붕대를', '다발을', '토토와', '민과', '‘유대’라고', '방패였어요']);
});

test('part of speech is guessed from the Korean meaning (with English hints)', () => {
  const cases = [['붕대', 'bandage', 'n'], ['묶다', 'bind', 'v'], ['용감한', 'brave', 'a'], ['고대의', 'ancient', 'a'], ['빠르게', 'quickly', 'd'], ['단지', 'merely', 'd'],
    ['그렇지 않으면', 'otherwise', 'd'], ['중요하다', 'important', 'a'], ['예방하다', 'prevent', 'v'], ['효과적인', 'effective', 'a'], ['제한', 'limit', 'n'], ['행운', 'luck', 'n'],
    ['큰', 'big', 'a'], ['가게', 'store', 'n'], ['회의', 'meeting', 'n'], ['공급', 'supply', 'n'], ['꺼리는', 'reluctant', 'a'], ['피할 수 없는', 'inevitable', 'a'], ['의심하다', 'suspect', 'v']];
  const got = P().json(`${JSON.stringify(cases)}.map(([m, en]) => koKind(m, en, 'x').kind)`);
  assert.deepEqual(got, cases.map(c => c[2]));
});

// 일반 사전 뜻으로 만든 단어 목록 (명사·동사·형용사·부사·숙어가 섞임)
const WORDS = [
  ['barrier', '울타리, 장애물, 장벽'], ['bandage', '붕대(를 감다)'], ['bundle', '다발, 꾸러미'], ['bind', '묶다, 결속시키다'], ['bond', '유대, 결속'], ['band', '띠, 끈'], ['bar', '막대'],
  ['explain', '설명하다'], ['ancient', '고대의'], ['quickly', '빠르게'], ['brave', '용감한'], ['decide', '결정하다'], ['carefully', '조심스럽게'], ['harvest', '수확'],
  ['implement', '시행하다, 실행하다'], ['revenue', '수익'], ['postpone', '연기하다, 미루다'], ['reluctant', '꺼리는, 마지못한'], ['inevitable', '피할 수 없는'], ['abundant', '풍부한'], ['merely', '단지'],
  ['give up', '포기하다'], ['look forward to', '~을 고대하다'], ['in advance', '미리'], ['take part in', '~에 참가하다'], ['be about to', '막 ~하려 하다'], ['rather', '오히려, 꽤'], ['otherwise', '그렇지 않으면'],
  ['get along with', '~와 잘 지내다'], ['because of', '~ 때문에'], ['afford', '~할 여유가 있다'], ['curious', '호기심이 많은'], ['shiver', '떨다'], ['repair', '수리하다'], ['steal', '훔치다'],
  ['suspect', '의심하다, 용의자'], ['necessary', '필요한'], ['frighten', '겁먹게 하다'], ['citizen', '시민'], ['library', '도서관'], ['fear', '두려움'], ['deadline', '마감']
];
const STORIES = () => P().json(`(() => {
  const W = ${JSON.stringify(WORDS)}, rows = {}; for (const [en, ko] of W) rows[en] = { en, ko, pos: 'x' };
  const ids = Object.keys(rows), out = [];
  for (let n = 0; n < SF.length; n++) for (let k = 0; k * 7 < ids.length; k++) {
    const ep = ids.slice(k * 7, k * 7 + 7), st = mkStory(ep, rows, n + k), e = mkEpisode('t', st.title, ep, rows, st);
    out.push({ ids: ep, lines: e.scene.lines, order: e.scene.words });
  }
  return out;
})()`);

test('auto story: every word once, grammatical particles, no leftovers or repeats', () => {
  const finals = P().json(`(${JSON.stringify(WORDS.map(w => w[1]))}).length`);
  assert.equal(finals, WORDS.length);
  const fin = s => { const c = s.charCodeAt(s.length - 1) - 0xAC00; return c >= 0 && c < 11172 ? c % 28 : 0; };
  for (const st of STORIES()) {
    const marks = st.lines.join('\n').match(/\{[^|}]+\|[^}]+\}/g) || [];
    assert.deepEqual(marks.map(m => m.slice(1, m.indexOf('|'))).sort(), st.ids.slice().sort(), 'each word marked exactly once');
    assert.equal(new Set(st.lines).size, st.lines.length, 'no repeated line');
    for (const l of st.lines) {
      const plain = l.replace(/\{[^|}]+\|([^}]+)\}/g, '$1');
      assert.doesNotMatch(plain, /[{}|~]|undefined|null|\s\s/, `leftover in "${plain}"`);
      assert.match(plain, /[.!?”]$/, `line ends without punctuation: "${plain}"`);
      // 단어 바로 뒤 조사가 받침에 맞는지
      for (const m of l.matchAll(/\{[^|}]+\|([^}]+)\}’?(을|를|이|가|은|는|과|와|으로|로)(?=[\s.,!?”]|$)/g)) {
        const f = fin(m[1]), p = m[2];
        const want = { 을: f ? '을' : '를', 를: f ? '을' : '를', 이: f ? '이' : '가', 가: f ? '이' : '가', 은: f ? '은' : '는', 는: f ? '은' : '는', 과: f ? '과' : '와', 와: f ? '과' : '와', 으로: f && f !== 8 ? '으로' : '로', 로: f && f !== 8 ? '으로' : '로' }[p];
        assert.equal(p, want, `particle after "${m[1]}" in "${plain}"`);
      }
      // '로봇 삐삐가 로봇 삐삐와'처럼 같은 이름이 한 문장에서 자기 자신과 엮이지 않음
      assert.doesNotMatch(plain, /((?:\S+ )?\S+)[이가은는] \1[와과]/, `self-pairing in "${plain}"`);
    }
  }
});

test('auto story: problems come before resolutions, meanings drive the scene', () => {
  const s = P().json(`(() => {
    const rows = {}; for (const [en, ko] of [['bond', '유대, 결속'], ['bind', '묶다'], ['barrier', '울타리, 장애물']]) rows[en] = { en, ko, pos: 'x' };
    const st = mkStory(['bond', 'bind', 'barrier'], rows, 0);
    return { lines: st.lines, pic: Object.fromEntries(Object.entries(st.words).map(([k, w]) => [k, w.panel.subject.emoji || w.panel.subject.kind])) };
  })()`);
  const at = id => s.lines.findIndex(l => l.includes(`{${id}|`));
  assert.ok(at('barrier') < at('bind') && at('bind') < at('bond'), s.lines.join('\n'));
  assert.match(s.lines[at('barrier')], /가로막|넘으려고/);
  assert.match(s.lines[at('bind')], /\{bind\|묶었어요\}/);
  assert.deepEqual(s.pic, { bond: '🤝', bind: '🪢', barrier: '🚧' });
});
