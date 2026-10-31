/* ---------- 3) 그림 꾸미기: 단어마다 그림 칸을 눌러서 고르기만 하면 돼요 ---------- */
const AR_EMO = ['📘', '📚', '✏️', '💡', '🔑', '🎯', '⏰', '💰', '📈', '📉', '🔧', '⚖️', '🚌', '💼', '🏥', '🍱', '🏠', '🌳', '🌊', '🔍', '🎁', '✉️', '📱', '💻', '🎤', '⭐', '✨', '🚀', '🏁', '🛡️', '💪', '🔄', '❤️', '👍', '👎', '❓', '🎉', '😀', '😢', '😡', '😱', '🤔', '😴', '🐶', '🐱', '🍎', '☀️', '🌧️', '🔥', '🏆'];
const AR_HOLD = ['', '📄', '📚', '🎤', '🎁', '💰', '☕', '🍎', '🔑', '📱', '🌹', '⚽', '🔨', '🧪'];
const AR_ANIMAL = [['pig', '돼지'], ['bunny', '토끼'], ['bear', '곰'], ['frog', '개구리'], ['tortoise', '거북이'], ['bird', '새'], ['dragon', '용'], ['fish', '물고기'], ['horse', '말'], ['wolf', '늑대'], ['squirrel', '다람쥐'], ['octopus', '문어']];
const AR_POSE = [['stand', '서기'], ['cheer', '만세'], ['point', '가리키기'], ['wave', '손 흔들기'], ['hold', '들기'], ['think', '생각'], ['run', '달리기'], ['shrug', '으쓱'], ['sad', '슬픔'], ['sleep', '잠']];
const AR_FACE = [['smile', '미소'], ['happy', '기쁨'], ['wow', '놀람'], ['worry', '걱정'], ['angry', '화남'], ['serious', '진지']];
const AR_HAIR = [['short', '짧은'], ['long', '긴'], ['pony', '묶은'], ['curly', '곱슬'], ['bun', '올림'], ['bald', '대머리']];
const AR_BG = { sky: '#E3F1FB', warm: '#FBEFD9', mint: '#E4F4E1', lavender: '#EEE8FB', blush: '#FCE8EC', sand: '#F8ECD2', sea: '#D2EEF4', grey: '#ECEEF3', night: '#34407A' };
const AR_OUT = { blue: '#3D7DD8', red: '#E05A4F', green: '#3FA36B', yellow: '#F2C230', orange: '#F08A24', purple: '#8B5CF6', pink: '#F07AA8', navy: '#2F3A6B', white: '#FFFFFF', brown: '#A0703F' };
const AR_MARK = [['none', '없음'], ['check', '✓'], ['cross', '✕'], ['heart', '♥'], ['up', '↑'], ['down', '↓'], ['exclaim', '!'], ['question', '?'], ['idea', '전구'], ['star', '★'], ['money', '$'], ['clock', '시계'], ['music', '♪'], ['sweat', '땀']];
const AR_SIGN = [['board', '팻말'], ['bubble', '말풍선'], ['banner', '현수막']];
const arSvg = (spec, W, H) => `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="${W}" height="${H}" fill="${genPanelBg(spec)}"/>${genPanel(spec, W, H)}</svg>`;
const arDeck = () => MK.art && DeckStore.get(MK.art.deckId);
function openArt(id) {
  closeOverlay();
  if (!DeckStore.get(id)) { toast('이 단어장을 찾지 못했어요'); return; }
  if (MK.step === 'reading' || MK.step === 'making') { toast('단어장을 만드는 중이에요. 다 만든 뒤에 그림을 꾸며 주세요'); openMake(); return; }
  MK.art = { deckId: id, sel: null, spec: null, back: MK.step === 'done' ? 'done' : 'home' };
  MK.err = ''; MK.step = 'art';
  showScreen('make'); renderMake(); window.scrollTo(0, 0);
}
function arGridHTML() {
  const d = arDeck(); if (!d) return '<p class="mknote">단어장을 찾지 못했어요.</p>';
  const eps = d.scenes.map(s => `<p class="areps">${esc(s.title)}</p><div class="argrid">${s.words.map((id, k) => {
    const w = d.words[id]; if (!w) return '';
    return `<button type="button" class="arcard" data-mk="arpick" data-key="${esc(s.key)}" data-k="${k}">${arSvg((d.panels[s.key] || [])[k] || {}, 256, 180)}<b>${esc(shortW(id))}</b><small>${esc(w.m || '')}</small></button>`;
  }).join('')}</div>`).join('');
  return `<p class="mksmall"><b>${esc(d.name)}</b> · 그림을 누르면 주인공·배경·글씨를 바꿀 수 있어요. 고친 그림은 게임에 바로 나와요.</p>${eps}
    <button type="button" class="startbtn" data-mk="ardone">${ICON.play}다 꾸몄어요</button>`;
}
const arChips = (list, cur, act, cls = '') => `<div class="archips ${cls}">${list.map(([v, t]) => `<button type="button" class="${v === cur ? 'on' : ''}" data-mk="${act}" data-v="${esc(v)}" aria-pressed="${v === cur}">${esc(t)}</button>`).join('')}</div>`;
const arSw = (map, cur, act, names) => `<div class="archips sw">${Object.entries(map).map(([v, c]) => `<button type="button" class="${v === cur ? 'on' : ''}" style="background:${c}" data-mk="${act}" data-v="${v}" aria-label="${esc(names[v] || v)}" aria-pressed="${v === cur}"></button>`).join('')}</div>`;
const AR_BG_NAME = { sky: '하늘색', warm: '살구색', mint: '민트색', lavender: '연보라', blush: '분홍', sand: '모래색', sea: '바다색', grey: '회색', night: '밤' };
const AR_OUT_NAME = { blue: '파랑', red: '빨강', green: '초록', yellow: '노랑', orange: '주황', purple: '보라', pink: '분홍', navy: '남색', white: '흰색', brown: '갈색' };
function arEditHTML() {
  const d = arDeck(), a = MK.art, sp = a.spec, sj = sp.subject;
  const id = d.scenes.find(s => s.key === a.sel.key).words[a.sel.k], w = d.words[id] || {};
  const kind = sj.kind === 'emoji' ? 'emoji' : sj.kind === 'person' ? 'person' : 'animal';
  let who = '';
  if (kind === 'emoji') who = `${arChips(AR_EMO.map(e => [e, e]), sj.emoji, 'aremo', 'emo')}<div class="arin"><input id="aremo" placeholder="다른 이모지를 입력해도 돼요" aria-label="이모지 직접 입력" maxlength="8" autocomplete="off"></div>`;
  else if (kind === 'person') who = `<b>자세</b>${arChips(AR_POSE, sj.pose, 'arpose')}<b>표정</b>${arChips(AR_FACE, sj.face, 'arface')}<b>머리</b>${arChips(AR_HAIR, sj.hair, 'arhair')}<b>옷 색</b>${arSw(AR_OUT, sj.outfit, 'arout', AR_OUT_NAME)}`;
  else who = arChips(AR_ANIMAL, sj.kind, 'aranimal');
  return `<div class="ared">
    <div class="arprev"><div id="arprev">${arSvg(sp, 320, 230)}</div><p class="arword"><b>${esc(shortW(id))}</b>${esc(w.m || '')}</p></div>
    <div class="arsec"><b>주인공</b>${arChips([['emoji', '이모지 하나'], ['person', '사람'], ['animal', '동물']], kind, 'arkind')}${who}</div>
    ${kind === 'emoji' ? '' : `<div class="arsec"><b>손에 든 것</b>${arChips(AR_HOLD.map(e => [e, e || '없음']), sp.hold || '', 'arhold', 'emo')}</div>`}
    <div class="arsec"><b>배경</b>${arSw(AR_BG, sp.bg, 'arbg', AR_BG_NAME)}</div>
    <div class="arsec"><b>그림 속 글씨</b> <div class="arin"><input id="arsign" value="${esc(sp.sign || '')}" maxlength="22" placeholder="예) ${esc(shortW(id))}" autocomplete="off" aria-label="그림 속 글씨"></div>${arChips(AR_SIGN, sp.signStyle, 'arsignst')}<small class="mksmall">정답 뜻을 그대로 쓰면 게임이 너무 쉬워져요. 영어 단어나 힌트를 써 보세요.</small></div>
    <div class="arsec"><b>작은 표시</b>${arChips(AR_MARK, sp.mark || 'none', 'armark')}</div>
    <div class="arbtns"><button type="button" class="btn" data-mk="arrand">랜덤</button><button type="button" class="btn" data-mk="arcancel">취소</button><button type="button" class="btn good" data-mk="arsave">저장</button></div>
  </div>`;
}
function arPreview() { const p = $('#arprev'); if (p && MK.art && MK.art.spec) p.innerHTML = arSvg(MK.art.spec, 320, 230); }
const arRand = list => list[Math.floor(Math.random() * list.length)];
// 그림 칸 고치기: 누른 단추 하나 → 사양 한 곳
function arAct(a, v) {
  const sp = MK.art.spec;
  if (a === 'arkind') {
    if (v === 'emoji') sp.subject = { kind: 'emoji', emoji: AR_EMO[0] };
    else if (v === 'person') sp.subject = { kind: 'person', pose: 'stand', hair: 'short', outfit: 'blue', face: 'smile', skin: 0 };
    else sp.subject = { kind: 'bunny', pose: 'wave' };
  }
  else if (a === 'aremo') sp.subject = { kind: 'emoji', emoji: v };
  else if (a === 'arpose') { sp.subject.pose = v; if (v === 'sleep' || v === 'sad') sp.subject.face = v === 'sad' ? 'worry' : 'smile'; }
  else if (a === 'arface') sp.subject.face = v;
  else if (a === 'arhair') sp.subject.hair = v;
  else if (a === 'arout') sp.subject.outfit = v;
  else if (a === 'aranimal') sp.subject = { kind: v, pose: ['pig', 'bunny', 'bear', 'frog'].includes(v) ? 'wave' : 'stand' };
  else if (a === 'arhold') sp.hold = v;
  else if (a === 'arbg') { sp.bg = v; delete sp.ground; }
  else if (a === 'arsignst') sp.signStyle = v;
  else if (a === 'armark') sp.mark = v;
  else if (a === 'arrand') {
    const r = Math.random();
    sp.bg = arRand(Object.keys(AR_BG).slice(0, 6)); delete sp.ground;
    sp.mark = arRand(AR_MARK)[0];
    if (r < 0.45) { sp.subject = { kind: 'emoji', emoji: arRand(AR_EMO) }; sp.hold = ''; }
    else if (r < 0.85) { sp.subject = { kind: 'person', pose: arRand(AR_POSE)[0], hair: arRand(AR_HAIR)[0], outfit: arRand(Object.keys(AR_OUT)), face: arRand(AR_FACE)[0], skin: Math.floor(Math.random() * 3) }; sp.hold = Math.random() < 0.5 ? arRand(AR_HOLD.slice(1)) : ''; }
    else { const an = arRand(AR_ANIMAL)[0]; sp.subject = { kind: an, pose: 'wave' }; sp.hold = ''; }
  }
  MK.art.spec = genNormalize(sp);
}
async function arSave() {
  const d = arDeck(), a = MK.art; if (!d || !a.sel) return;
  if (!d.panels || typeof d.panels !== 'object') d.panels = {};
  if (!Array.isArray(d.panels[a.sel.key])) d.panels[a.sel.key] = [];
  d.panels[a.sel.key][a.sel.k] = genNormalize(a.spec);
  a.sel = null; a.spec = null; renderMake();
  await DeckStore.put(d);
  if (DECK.id === d.id) switchDeck(d.id); // 지금 쓰는 단어장이면 게임 그림도 바로 바꿈
  toast('그림을 저장했어요');
}

