/* ---------- 화면 전환 ---------- */
const M = { kind: null, key: null, ids: [], queue: [], active: false, over: true, paused: false, busy: false };
let SP = null, PP = null;
const SV = { on: false, busy: false, i: 0, tok: 0, t: 0, stop: null, lines: [], ended: false };
function showScreen(id) {
  for (const s of ['home', 'story', 'play', 'make']) $('#' + s).hidden = s !== id;
  window.scrollTo(0, 0);
  navSync();
}
function goHome() { if (typeof settlePending === 'function') settlePending(); leaveStory(); closeOverlay(); M.active = false; M.over = true; renderHome(); showScreen('home'); }
/* 휴대폰 '뒤로'(안드로이드 뒤로 제스처): 앱을 떠나지 않고 한 단계씩 돌아가게 방문 기록을 맞춰 둠
   홈 = 0칸, 다른 화면 = 1칸, 전체화면이면 1칸 더. 화면이 바뀔 때마다 navSync()가 기록 깊이를 맞춰요.
   (뒤로 이동은 비동기라, 이동이 끝나기 전에는 새 기록을 쌓지 않고 끝난 뒤에 다시 맞춤) */
const NAV = { depth: 0, skip: 0 };
const navWanted = () => ($('#home').hidden ? 1 : 0) + (FS.on ? 1 : 0);
function navSync() {
  if (NAV.skip > 0) return;
  const want = navWanted();
  try {
    while (NAV.depth < want) { history.pushState({ voca: NAV.depth + 1 }, ''); NAV.depth++; }
    if (NAV.depth > want) { const n = NAV.depth - want; NAV.skip++; NAV.depth = want; history.go(-n); }
  } catch (e) { NAV.skip = 0; }
}
function onNavBack() {
  const d = (history.state && +history.state.voca) || 0;
  if (NAV.skip > 0) { NAV.skip--; NAV.depth = d; navSync(); return; } // 앱 단추로 돌아가며 정리한 기록
  NAV.depth = d;
  if (FS.on && d < navWanted()) { exitFS(); return; }
  if ($('#home').hidden && d === 0) {
    // 미션 중이면 바로 나가지 않고 일시정지 창을 보여 줌
    if (!$('#play').hidden && M.active && !M.over) { if (!M.paused) pause(); navSync(); return; }
    goHome();
  }
}

/* ---------- 진행: 목숨 3개, 에피소드는 차례로 열리고, 모두 깨면 보스 ---------- */
const isCleared = key => !!SAVE.best[key];
const sceneIdx = key => SCENES.findIndex(s => s.key === key);
const isUnlocked = key => { const i = sceneIdx(key); return i <= 0 || isCleared(SCENES[i - 1].key); };
const bossOpen = () => SCENES.every(s => isCleared(s.key));
const clearedN = () => SCENES.filter(s => isCleared(s.key)).length;
const totalWords = () => SCENES.reduce((a, s) => a + s.words.length, 0);
const epN = () => SCENES.length;
// 숫자 뒤 조사: 1(일)을, 2(이)를 …
const eul = n => n + ('013678'.includes(String(n).slice(-1)) ? '을' : '를');
const livesHTML = (n = SAVE.lives) => Array.from({ length: LIVES }, (_, i) => LIFE(i < n)).join('');
function toast(msg) {
  const old = $('.toast'); if (old) old.remove();
  const t = document.createElement('div'); t.className = 'toast' + ($('#play') && !$('#play').hidden ? ' high' : ''); t.setAttribute('role', 'status'); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2200);
}

/* ---------- 홈 ---------- */
function segBtn(name, v, label) {
  const on = SAVE[name] === v;
  return `<button type="button" class="${on ? 'on' : ''}" aria-pressed="${on}" data-v="${v}">${label}</button>`;
}
const diffSeg = () => DIFF_ORDER.map(k => segBtn('diff', k, `${DIFF[k].label} <small>${DIFF[k].sec}초</small>`)).join('');
const rateSeg = () => RATES.map(r => segBtn('rate', r, r.toFixed(1) + '×')).join('');
const heartsFor = kind => kind === 'boss' ? 5 : 3;
const ruleLine = n => `${n}단어 · 단어당 ${DIFF[SAVE.diff].sec}초 · 하트 `;
function bestLine(b) {
  return `<span class="stars" aria-label="별 ${b.stars}개">${'★'.repeat(b.stars)}${'☆'.repeat(3 - b.stars)}</span><span>${fmt(b.elapsed)} 만에 클리어</span>`;
}
function missionCard(s, i) {
  const b = SAVE.best[s.key], open = isUnlocked(s.key);
  const st = b ? bestLine(b) : open ? `<span class="new">도전!</span><span>${ruleLine(s.words.length)}${heartsFor('scene')}개</span>`
    : `<span class="lockt">${ICON.lock}에피소드 ${eul(i)} 깨면 열려요</span>`;
  return `<button type="button" class="mcard${open ? '' : ' locked'}${b ? ' clear' : ''}" data-scene="${s.key}"${open ? '' : ` data-locked="에피소드 ${eul(i)} 먼저 깨야 열려요"`}><div class="thumb">${thumbIMG(s.key)}${open ? '' : `<span class="lockic">${ICON.lock}</span>`}${b ? '<span class="clearic">CLEAR</span>' : ''}</div><div class="minfo"><span class="mnum">EPISODE ${s.n}</span><span class="mtitle">${esc(s.title)}</span><span class="mwords">${s.words.map(esc).join(' · ')}</span><span class="mstat">${st}</span></div></button>`;
}
function bossCard() {
  const b = SAVE.best.boss, n = SCENES.reduce((a, s) => a + s.words.length, 0), open = bossOpen();
  const st = b ? bestLine(b) : open ? `<span class="new">보스 등장!</span><span>${ruleLine(n)}${heartsFor('boss')}개</span>` : `<span class="lockt">${ICON.lock}에피소드 ${epN()}개를 모두 깨면 열려요 (${clearedN()}/${epN()})</span>`;
  return `<button type="button" class="mcard boss${open ? '' : ' locked'}" data-boss="1"${open ? '' : ` data-locked="에피소드 ${epN()}개를 모두 깨야 보스 미션이 열려요"`}><div class="thumb">${thumbSVG(bossArt(totalWords()))}${open ? '' : `<span class="lockic">${ICON.lock}</span>`}</div><div class="minfo"><span class="mnum">BOSS MISSION</span><span class="mtitle">${n}단어 총출동</span><span class="mwords">${epN()}개 에피소드의 단어가 섞여 나와요</span><span class="mstat">${st}</span></div></button>`;
}
function renderHome() {
  const cleared = clearedN();
  const seen = Object.keys(SAVE.seen).filter(id => WORDS[id]).length;
  const wrongN = Object.keys(SAVE.wrong).filter(id => WORDS[id]).length;
  // 다시 그려도 펼쳐 둔 칸은 그대로
  const openR = !!$('#home details.rules[open]'), openS = !!$('#home details.setbox[open]');
  const setSum = `${SAVE.dir === 'en' ? '영→한' : '한→영'} · ${DIFF[SAVE.diff].label} ${DIFF[SAVE.diff].sec}초 · 더빙 ${SAVE.narr ? '켬' : '끔'} · 효과음 ${SAVE.sound ? '켬' : '끔'}`;
  $('#home').innerHTML = `
    <button type="button" class="deckchip" data-decks="1">${ICON.book}<span>${esc(DECK.name)}</span><small>${totalWords()}단어</small>${ICON.down}</button>
    <button type="button" class="art-entry" data-story-art="${esc(DECK.id)}">${ICON.pic} 이야기 삽화 넣기</button>
    <h1>그림 스토리 <em>단어 미션</em></h1>
    <p class="lede">${totalWords()}단어를 이야기 ${epN()}편에 담았어요. 스토리 영상을 보고, 단어 뜻을 직접 입력해 맞혀요. 빨리 맞힐수록 남은 시간이 모여서 어려운 단어에서 쓸 수 있어요.</p>
    <button type="button" class="makecta" data-make="1">${ICON.camera}<span><b>사진 찍어 새 단어장 만들기</b><br><small>단어장 사진을 찍으면 이 기기 안에서 단어를 읽고 그림·미션을 바로 만들어요</small></span></button>
    ${SAVE.done ? `<div class="trophy">${ICON.play}<span><b>단어 암기 프로젝트 완료!</b> 보스까지 모두 깼어요${SAVE.done > 1 ? ` · ${SAVE.done}번째` : ''}</span></div>` : ''}
    <div class="statrow">
      <span class="stat lifestat" role="img" aria-label="목숨 ${SAVE.lives}개">목숨 <span class="lives">${livesHTML()}</span></span>
      <span class="stat bankstat">${ICON.clock}모은 시간 <b>${secTxt(SAVE.bank)}</b></span>
      <span class="stat">클리어 <b>${cleared}</b>/${epN()}${isCleared('boss') ? ' + 보스' : ''}</span>
      <span class="stat">익힌 단어 <b>${seen}</b>/${totalWords()}</span>
    </div>
    <details class="rules"${openR ? ' open' : ''}><summary>게임 방법</summary><ol>
      <li><b>뜻 입력</b> — 단어가 나오면 뜻을 직접 입력해요. 뜻이 여러 개면 <b>모두</b> 써야 정답이에요.</li>
      <li><b>시간 모으기</b> — 빨리 맞힐수록 남은 시간이 <b>모은 시간</b>에 쌓여요.</li>
      <li><b>보너스 시간</b> — 단어 시간이 다 되면 모은 시간을 꺼내 써요. 모은 시간도 없으면 <b>하트</b>가 깨져요.</li>
      <li><b>몰라요</b> — 누르면 바로 답을 보고 넘어가요. 그 단어는 뒤에 다시 나와요.</li>
      <li><b>목숨</b> — 하트 3개를 모두 잃으면 미션 실패, 목숨이 1개 줄어요. 목숨 3개를 다 잃으면 깬 에피소드가 모두 초기화돼요.</li>
      <li><b>보스</b> — 에피소드 ${epN()}개를 차례로 깨면 보스 미션이 열리고, 보스를 깨면 프로젝트 완료!</li>
    </ol></details>
    <details class="rules setbox"${openS ? ' open' : ''}><summary>설정 <small>${setSum}</small></summary><div class="settings">
      <div class="setrow"><span class="setlab">문제 방향</span><div class="seg" data-set="dir">${segBtn('dir', 'en', '영어 보고 뜻 쓰기')}${segBtn('dir', 'ko', '뜻 보고 영어 쓰기')}</div></div>
      <div class="setrow"><span class="setlab">단어 1개당 제한 시간 <small>(뜻이 하나 늘 때마다 +${DIFF[SAVE.diff].extra}초)</small></span><div class="seg" data-set="diff">${diffSeg()}</div></div>
      <div class="setrow"><span class="setlab">스토리 음성(더빙)</span><div class="seg" data-set="narr">${segBtn('narr', true, '켜기')}${segBtn('narr', false, '끄기')}</div></div>
      <div class="setrow"><span class="setlab">음성 속도</span><div class="seg" data-set="rate">${rateSeg()}</div></div>
      <div class="setrow"><span class="setlab">효과음</span><div class="seg" data-set="sound">${segBtn('sound', true, '켜기')}${segBtn('sound', false, '끄기')}</div></div>
    </div></details>
    <div class="sectlab">에피소드 <span>차례로 깨면 다음 에피소드가 열려요</span></div>
    <div class="missions">${SCENES.map(missionCard).join('')}${bossCard()}</div>
    ${wrongN ? `<button type="button" class="reviewbtn" data-review="1"><span><b>오답 연습</b><br><span>몰랐거나 시간이 지나 놓친 단어 ${wrongN}개 · 목숨은 줄지 않아요</span></span>${ICON.play}</button>` : ''}
    <div class="resetrow"><button type="button" class="linkbtn" data-reset="1">진행 처음부터 다시 하기</button></div>
    <p class="foot">진행 기록은 이 기기에만 저장돼요. 사진으로 만든 단어장은 이 기기${DeckStore.cloud ? '와 내 Claude 계정' : ''}에 저장돼요.</p>`;
  idle(fillThumbs);
}

/* ---------- 스토리(미션 소개) ---------- */
const MARK = /\{([^|}]+)\|([^}]+)\}/g;
function parseLine(line) {
  let word = null;
  line.replace(MARK, (_, id) => { word = word || id; return ''; });
  return {
    word,
    plain: line.replace(MARK, (_, id, t) => t),
    sub: esc(line).replace(MARK, (_, id, t) => `<mark><i>${esc(shortW(id))}</i>${t}</mark>`),
    text: esc(line).replace(MARK, (_, id, t) => `<button type="button" class="wchip" data-id="${id}"><i>${esc(shortW(id))}</i>${t}</button>`)
  };
}
// 스토리 영상 뒤에 이어지는 단어 복습 한 장면
function recapItem(id, k, n) {
  const w = WORDS[id];
  return { recap: true, word: id, plain: w.m, sub: `<span class="rvtag">복습 ${k + 1}/${n}</span><mark><i>${esc(shortW(id))}</i>${mHTML(w.m)}</mark>`, text: '' };
}
const mosaicHTML = () => `<div class="mosaic">${SCENES.map(s => `<div>${thumbIMG(s.key)}</div>`).join('')}<div>${thumbSVG(bossArt(totalWords()))}</div></div>`;
function openMission(kind, key) {
  if (kind === 'scene' && !isUnlocked(key)) { toast(`에피소드 ${eul(sceneIdx(key))} 먼저 깨야 열려요`); return; }
  if (kind === 'boss' && !bossOpen()) { toast(`에피소드 ${epN()}개를 모두 깨야 보스 미션이 열려요`); return; }
  settlePending(); closeOverlay(); leaveStory(); Narr.unlock();
  M.active = false; M.over = true;
  M.kind = kind; M.key = key || null;
  M.ids = kind === 'scene' ? sceneOf(key).words.slice()
    : kind === 'boss' ? SCENES.flatMap(s => s.words)
      : Object.keys(SAVE.wrong).filter(id => WORDS[id]).sort((a, b) => SAVE.wrong[b] - SAVE.wrong[a]);
  if (!M.ids.length) { goHome(); return; }
  showScreen('story');
  renderStory();
}
function renderStory() {
  const n = M.ids.length;
  let label, title, body;
  if (M.kind === 'scene') {
    const s = sceneOf(M.key);
    label = `EPISODE ${s.n} / ${epN()}`; title = s.title;
    SV.lines = s.lines.map(parseLine);
    const story = SV.lines.map((l, i) => `<span class="sline" data-i="${i}">${l.text}</span>`).join(' ');
    s.words.forEach((id, k) => SV.lines.push(recapItem(id, k, s.words.length)));
    body = `<p class="vhint" id="vhint"></p>
      <div class="storylab">장면 스토리 <span>자막 전체 · 단어를 누르면 그 장면을 다시 보여 줘요</span></div><p class="story">${story}</p>`;
  } else if (M.kind === 'boss') {
    label = 'BOSS MISSION'; title = `${n}단어 총출동`;
    body = `<p class="story" style="margin-top:14px">${epN()}개 에피소드의 단어 ${n}개가 무작위로 섞여 나와요. 카드가 나오면 그 단어가 있던 장면으로 바로 날아가 확대돼요. 모은 시간을 아껴 쓰며 끝까지 버텨 보세요. 보스를 깨면 단어 암기 프로젝트 완료!</p>`;
  } else {
    label = 'PRACTICE'; title = '오답 연습';
    body = `<p class="vhint" id="vhint"></p><p class="story">‘몰라요’를 눌렀거나 시간 안에 못 맞힌 단어예요. 단어를 누르면 그림 속 장면과 그림해석을 자막으로 보여 줘요. 연습이라 목숨은 줄지 않고, 한 번에 맞힌 단어는 목록에서 빠져요.</p>
      <div class="chiplist">${M.ids.map(id => `<button type="button" class="wchip" data-id="${esc(id)}"><i>${esc(shortW(id))}</i>${mHTML(WORDS[id].m)}</button>`).join('')}</div>`;
  }
  $('#story').innerHTML = `
    <div class="topbar"><button type="button" class="iconbtn" data-act="home" aria-label="미션 목록으로">${ICON.back}</button><span class="toplab">${label}</span></div>
    <h2 class="stitle">${esc(title)}</h2>
    <div class="sframe">${M.kind === 'boss' ? mosaicHTML() : '<div id="spanel"></div>'}</div>
    ${body}
    <div class="brief">
      <div class="brief-row"><b>미션</b><span>${n}단어의 뜻을 직접 입력해 모두 맞히기. 뜻이 여러 개면 <b>모두</b> 써요.</span></div>
      <div class="brief-row"><b>시간</b><span>단어마다 <strong class="briefsec">${DIFF[SAVE.diff].sec}초</strong>(뜻 하나 더 +<span class="briefx">${DIFF[SAVE.diff].extra}</span>초). ${M.kind === 'review' ? '' : '빨리 맞히면 남은 시간이 <b>모은 시간</b>에 쌓이고, 시간이 다 되면 모은 시간을 보너스로 써요.'}</span></div>
      <div class="brief-row"><b>하트</b><span>${M.kind === 'review' ? '시간이 다 되면' : '시간도 모은 시간도 다 쓰면'} 하트 1개가 깨져요. 틀리게 입력하면 2초가 줄어요. ‘몰라요’는 바로 답을 보고 넘어가요(하트는 그대로).</span></div>
      ${M.kind === 'review' ? '' : `<div class="brief-row"><b>목숨</b><span>하트 ${heartsFor(M.kind)}개를 모두 잃으면 <span class="warn">미션 실패</span> · 목숨 1개 감소 (남은 목숨 <span class="lives inline">${livesHTML()}</span>). 목숨을 다 잃으면 깬 에피소드가 모두 초기화돼요.</span></div>`}
      ${M.kind === 'review' ? '' : `<div class="brief-row"><b>모은 시간</b><span class="bankline">${ICON.clock}<b>${secTxt(SAVE.bank)}</b></span></div>`}
      <div class="brief-row"><b>설정</b><div class="seg" data-set="diff">${diffSeg()}</div></div>
    </div>
    <button type="button" class="startbtn" data-act="start">${ICON.play}미션 시작</button>`;
  SP = null;
  if (M.kind === 'boss') idle(fillThumbs);
  if (M.kind !== 'boss') {
    SP = new Panel($('#spanel'));
    SP.setScene(M.kind === 'scene' ? M.key : WORDS[M.ids[0]].scene);
    SP.fullNow();
    buildPlayer();
    if (M.kind === 'scene') SV.t = setTimeout(svPlay, 300);
  }
}
function markChip(id) {
  for (const c of document.querySelectorAll('#story .wchip')) c.classList.toggle('on', c.dataset.id === id);
}
/* ---------- 스토리 영상 (자막 + 더빙) ---------- */
function buildPlayer() {
  const scene = M.kind === 'scene';
  // 그림 위에는 진행 막대·큰 재생 단추만. 자막과 조절 단추는 그림 아래 줄에 두어 단어 칸을 가리지 않게
  // (전체화면에서는 moveBar()가 자막·단추를 그림 위로 옮겨요)
  SP.host.insertAdjacentHTML('beforeend', `
    ${scene ? `<div class="vprog" aria-hidden="true">${SV.lines.map(l => `<i${l.recap ? ' class="rv"' : ''}><b></b></i>`).join('')}</div>` : ''}
    ${scene ? `<div class="vbigs"><button type="button" class="vbig" data-act="vplay" id="vbig"></button><button type="button" class="vbig vgo" data-act="start" id="vgo" hidden>${ICON.play}미션 시작</button></div>` : ''}
    <div class="vrot" id="vrot" hidden>휴대폰을 가로로 돌리면 더 크게 보여요</div>`);
  SP.host.insertAdjacentHTML('afterend', `<div class="vbar" id="vbar">
    <div class="vctl">
      ${scene ? `<button type="button" class="vbtn" data-act="vplay" id="vplay"></button>` : ''}
      <button type="button" class="vbtn" data-act="vvoice" id="vvoice"></button>
      <button type="button" class="vbtn vspeed" data-act="vspeed" id="vspeed"></button>
    </div>
    ${scene ? '<button type="button" class="vbtn vfull" data-act="vfull" id="vfull"></button>' : ''}
    <div class="vsub" id="vsub" aria-live="polite"></div>
  </div>`);
  SV.on = false; SV.busy = false; SV.i = 0; SV.ended = false; SV.failN = 0; SV.narrFail = !canSpeak && M.kind === 'scene';
  voiceWarm(true); voicePrefetch(); // 목소리를 준비하고 영어 단어 발음을 미리 만들어 둠 (읽는 중간에 끊기지 않게)
  if (!scene) setSub('<p>아래 단어를 누르면 그림 속 장면을 보여 줘요</p>');
  svCtl();
}
// 자막·조절 단추를 전체화면이면 그림 위로, 아니면 그림 아래 줄로
function moveBar() {
  const bar = $('#vbar'); if (!SP || !bar) return;
  const parts = ['.vctl', '#vfull', '#vsub'].map(q => $(q, SP.host) || $(q, bar)).filter(Boolean);
  const to = FS.on ? SP.host : bar;
  for (const el of parts) if (el.parentElement !== to) to.appendChild(el);
}
// 전체화면에서 재생 중이면 잠시 뒤 단추를 숨겨 그림을 가리지 않게 (그림을 누르면 다시 보임)
function fsQuiet(on) {
  if (!SP) return;
  clearTimeout(FS.qT); SP.host.classList.remove('quiet');
  if (on && FS.on && SV.on) FS.qT = setTimeout(() => { if (FS.on && SV.on && SP) SP.host.classList.add('quiet'); }, 2600);
}
function setSub(html) {
  const el = $('#vsub'); if (!el) return;
  el.innerHTML = html;
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
}
const readMs = t => clamp(1300 + t.length * 85, 2600, 7000);
function markLine(i) {
  for (const l of document.querySelectorAll('#story .sline')) l.classList.toggle('on', +l.dataset.i === i);
}
// 진행 막대도 transform으로 채워서 화면 합성만으로 움직이게
function progSet(i, ms) {
  const bars = document.querySelectorAll('#spanel .vprog b');
  bars.forEach((b, k) => { b.style.transition = 'none'; b.style.transform = `scaleX(${k < i ? 1 : 0})`; });
  const cur = bars[i];
  if (cur && ms) { void cur.offsetWidth; cur.style.transition = `transform ${Math.round(ms)}ms linear`; cur.style.transform = 'scaleX(1)'; }
}
function progFreeze() {
  for (const b of document.querySelectorAll('#spanel .vprog b')) { const t = getComputedStyle(b).transform; b.style.transition = 'none'; b.style.transform = t && t !== 'none' ? t : 'scaleX(0)'; }
}
// 자막이 가리지 않는 위쪽에 단어 영역을 맞춰 확대
function svCamera(id) {
  const h = SP.baseH(), w = SP.width();
  SP.clearFocus();
  if (id) {
    const spot = WORDS[id].spot;
    if (SP.setScene(WORDS[id].scene)) SP.fullNow();
    SP.burstSpeed();
    SP.go(spView(spot, w, h), h, 520, EZ.out, () => { SP.focus(spot, null); });
    SP.current = id;
  } else {
    SP.go(SP.fullVB(w, h), h, 450, EZ.inout);
    SP.current = null;
  }
}
function spRelayout() {
  if (!SP) return;
  const id = SP.current, h = SP.baseH(), w = SP.width(), spot = id && WORDS[id].spot;
  SP.stop(); SP.setH(h);
  SP.setVB(id ? spView(spot, w, h) : SP.fullVB(w, h));
  if (id) SP.focus(spot, null);
}
// 단어 칸 보기: 그림 아래에 자막이 있으면 칸을 꽉 차게, 전체화면(자막이 그림 위)이면 자막 자리를 비워 두고
const spView = (spot, w, h) => FS.on ? SP.fitCap(spot, w, h, 'bottom', ($('#vsub') || {}).offsetHeight || 0) : SP.fit(spot, w, h);
/* ---------- 스토리 영상 전체화면 (휴대폰 화면 가득) ---------- */
const FS = { on: false, api: false, rotT: 0, y: 0, qT: 0 };
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
function enterFS() {
  if (!SP || FS.on) return;
  const el = SP.host;
  FS.on = true; FS.api = false; FS.y = window.scrollY;
  SP.fs = true; el.classList.add('fs'); document.documentElement.classList.add('fsmode');
  // 진짜 전체화면을 먼저 시도하고, 안 되는 화면(앱 안 미리보기 등)은 화면 가득 채우기로 대신해요
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  try {
    const p = req && req.call(el, { navigationUI: 'hide' });
    if (p && p.then) p.then(() => {
      FS.api = !!fsEl();
      try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => { }); } catch (e) { }
    }).catch(() => { });
  } catch (e) { }
  moveBar(); navSync();
  spRelayout(); requestAnimationFrame(spRelayout);
  svCtl(); fsQuiet(true);
  const rot = $('#vrot');
  clearTimeout(FS.rotT);
  if (rot) { rot.hidden = !(window.innerHeight > window.innerWidth); FS.rotT = setTimeout(() => { rot.hidden = true; }, 3200); }
  if (M.kind === 'scene' && !SV.on && !SV.busy) svPlay();
}
function exitFS() {
  if (!FS.on) return;
  FS.on = false;
  navSync();
  clearTimeout(FS.rotT);
  if (fsEl()) { try { const x = document.exitFullscreen || document.webkitExitFullscreen; const p = x && x.call(document); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
  try { const o = screen.orientation; if (o && o.unlock) o.unlock(); } catch (e) { }
  FS.api = false;
  document.documentElement.classList.remove('fsmode');
  if (SP) { SP.fs = false; SP.host.classList.remove('fs', 'quiet'); clearTimeout(FS.qT); moveBar(); const r = $('#vrot'); if (r) r.hidden = true; spRelayout(); svCtl(); }
  const y = FS.y; window.scrollTo(0, y); requestAnimationFrame(() => window.scrollTo(0, y));
}
function onFsChange() {
  if (fsEl()) { FS.api = true; spRelayout(); return; }
  if (FS.on && FS.api) exitFS(); // 뒤로 가기·ESC로 나온 경우
  else spRelayout();
}
const narrOn = () => SAVE.narr && !SV.narrFail;
// 한 줄 길이: 음성 없이 자막만 보여 줄 때 읽는 시간
function lineMs(i, L) {
  if (L.recap) return 2600 / SAVE.rate;
  return readMs(L.plain) / SAVE.rate + (L.word ? 700 : 0);
}
function svSpeak(i, L, ms, after) {
  if (L.recap) { svRecap(L, ms, after); return; }
  if (narrOn() && canSpeak) { svTTS(L, ms, after); return; }
  SV.t = setTimeout(after, ms);
}
// 자막을 한국어 목소리로 읽고, 단어는 영어로 한 번 더
async function svTTS(L, ms, after) {
  const tok = SV.tok, t0 = Date.now(), live = () => tok === SV.tok;
  let ok = true;
  try { await tts(L.plain, 'ko-KR', SAVE.rate); SV.failN = 0; }
  catch (e) {
    if (e && e.name === 'AbortError') return;
    ok = false;
    if (++SV.failN >= 3) { SV.narrFail = true; svCtl(); } // 세 번 연달아 안 될 때만 자막으로 바꿈
  }
  if (!live()) return;
  // 영어 단어 발음은 따로: 안 돼도 이야기는 계속
  if (L.word && ok) { await sleep(120); if (!live()) return; try { await sayWord(L.word, SAVE.rate); } catch (e) { } }
  if (!live()) return;
  if (ok) after(); else SV.t = setTimeout(after, Math.max(400, ms - (Date.now() - t0)));
}
// 복습 때 읽어 줄 뜻: 게임이 정답으로 받는 뜻(정리된 뜻) 그대로
const meanSay = id => { const w = WORDS[id] || {}; const t = (w.ans || []).map(g => g.t).filter(Boolean).join(', '); return (t || String(w.m || '')).replace(/\([^)]*\)/g, '').trim(); };
// 이야기 속 영어 단어 발음을 순서대로 미리 만들어 둠 (기기 안 영어 목소리를 쓸 때만)
function voicePrefetch() {
  if (!Voice.ready('en') || (hasSS && ssHas('en')) || !SV.lines || !SV.lines.length) return;
  for (const L of SV.lines) if (L.word && WORDS[L.word]) Voice.synth(WORDS[L.word].say || shortW(L.word), 'en-US', Math.min(SAVE.rate, 1) * .85).catch(() => { });
}
Voice.onChange(() => {
  if (Voice.ready('en') && !Voice._told) { Voice._told = true; if (!$('#story').hidden) toast('영어 발음용 고품질 목소리가 준비됐어요'); }
  if (!$('#story').hidden) voicePrefetch();
});
// 복습: 영어 발음 → 잠깐 쉼 → 한국어 뜻
function svRecap(L, ms, after) {
  const tok = SV.tok, t0 = Date.now();
  if (!narrOn() || !canSpeak) { SV.t = setTimeout(after, ms); return; }
  const live = () => tok === SV.tok;
  sayWord(L.word, wordRate())
    .then(() => live() && sleep(120))
    .then(() => live() && tts(meanSay(L.word), 'ko-KR', SAVE.rate))
    .then(() => live() && sleep(200))
    .then(() => { if (live()) after(); })
    .catch(e => { if (!live()) return; if (!(e && e.name === 'AbortError') && ++SV.failN >= 3) { SV.narrFail = true; svCtl(); } SV.t = setTimeout(after, Math.max(400, ms - (Date.now() - t0))); });
}
function svShow(single) {
  if (!SP || !SV.lines.length) return;
  clearTimeout(SV.t); Narr.stop(); ttsStop();
  const tok = ++SV.tok, i = SV.i, L = SV.lines[i];
  setSub(`<p>${L.sub}</p>`);
  markLine(i); markChip(L.word);
  svCamera(L.word);
  const ms = lineMs(i, L);
  progSet(i, ms);
  SV.busy = true;
  svSpeak(i, L, ms, () => {
    if (tok !== SV.tok) return;
    SV.busy = false;
    progSet(i + 1, 0);
    SV.i = i + 1;
    if (single || !SV.on) { if (SV.i >= SV.lines.length) svEnd(); else svCtl(); return; }
    if (SV.i >= SV.lines.length) { svEnd(); return; }
    SV.t = setTimeout(() => { if (tok === SV.tok && SV.on) svShow(); }, 220);
  });
  svCtl();
}
function svPlay() {
  if (!SP || M.kind !== 'scene') return;
  if (SV.ended || SV.i >= SV.lines.length) SV.i = 0;
  SV.ended = false; SV.on = true;
  if (!FS.on && window.innerWidth > window.innerHeight) { const f = SP.host.closest('.sframe'); if (f) f.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); }
  svShow(); fsQuiet(true);
}
function svHalt() { SV.on = false; SV.busy = false; SV.tok++; clearTimeout(SV.t); Narr.stop(); ttsStop(); }
function svPause() { svHalt(); progFreeze(); svCtl(); fsQuiet(false); }
function svOne(i) {
  if (i < 0) return;
  SV.on = false; SV.ended = false; SV.i = i;
  svShow(true);
}
function svEnd() {
  svHalt(); SV.ended = true; SV.i = 0;
  setSub(`<p>스토리 끝! 이제 ${FS.on ? '' : '아래 '}<mark>미션 시작</mark>을 눌러 보세요.</p>`);
  markLine(-1); markChip(null);
  SP.clearFocus(); SP.zoomFull(); SP.current = null;
  svCtl();
}
// 오답 복습: 단어 장면 + 그림해석 자막 + 영어 발음
function svWord(id) {
  if (!SP) return;
  svHalt();
  const w = WORDS[id];
  setSub(`<p><mark><i>${esc(shortW(id))}</i>${mHTML(w.m)}</mark> ${esc(w.pic)}</p>`);
  markChip(id);
  svCamera(id);
  if (SAVE.narr) sayWord(id, wordRate()).catch(() => { });
}
function leaveStory() { svHalt(); exitFS(); }
function svCtl() {
  if (!SP) return;
  const play = $('#vplay'), big = $('#vbig'), voice = $('#vvoice'), speed = $('#vspeed'), hint = $('#vhint'), full = $('#vfull'), go = $('#vgo');
  const speaking = SV.on || SV.busy;
  if (full) { full.innerHTML = FS.on ? `${ICON.close}<span>닫기</span>` : `${ICON.full}<span>전체화면</span>`; full.setAttribute('aria-label', FS.on ? '전체화면 닫기' : '전체화면으로 보기'); }
  if (go) go.hidden = !(FS.on && SV.ended && !speaking);
  if (play) { play.innerHTML = SV.on ? `${ICON.pause}<span>멈춤</span>` : `${ICON.play}<span>재생</span>`; play.setAttribute('aria-label', SV.on ? '스토리 멈춤' : '스토리 재생'); }
  if (big) { big.hidden = speaking; big.innerHTML = SV.ended ? '↻ 다시 보기' : SV.i > 0 ? `${ICON.play}이어서 보기` : `${ICON.play}스토리 재생`; }
  SP.host.classList.toggle('vidle', !!big && !speaking);
  if (voice) {
    voice.innerHTML = `${ICON.speaker}<span>${SAVE.narr ? '음성 켬' : '음성 끔'}</span>`;
    voice.classList.toggle('off', !SAVE.narr);
    voice.setAttribute('aria-pressed', String(SAVE.narr));
  }
  if (speed) { speed.textContent = SAVE.rate.toFixed(1) + '×'; speed.setAttribute('aria-label', `음성 속도 ${SAVE.rate.toFixed(1)}배. 누르면 바뀌어요`); }
  if (hint) hint.textContent = M.kind === 'review' ? (SAVE.narr ? '단어를 누르면 그 단어가 그려진 칸을 크게 보여 주고, 영어 발음과 그림해석을 들려줘요.' : '단어를 누르면 그 단어가 그려진 칸을 크게 보여 주고 그림해석을 보여 줘요. 발음은 ‘음성’ 버튼으로 켤 수 있어요.')
    : !SAVE.narr ? '음성이 꺼져 있어요. 그림 아래 ‘음성’ 버튼으로 켤 수 있어요.'
    : SV.narrFail ? '이 화면에서는 소리를 재생하지 못해 자막으로만 보여 줘요. 휴대폰 미디어 음량도 확인해 주세요.'
      : '자막을 한국어 음성으로 읽어 주고, 단어는 영어 발음으로 들려줘요. 이야기가 끝나면 단어를 하나씩 다시 짚는 복습이 이어져요. 그림 아래 숫자(1.0×)로 음성 속도를, ‘전체화면’으로 크게 볼 수 있어요.';
}
function updateBrief() {
  const sec = DIFF[SAVE.diff].sec;
  for (const el of document.querySelectorAll('#story .briefsec')) el.textContent = sec + '초';
  for (const el of document.querySelectorAll('#story .briefx')) el.textContent = DIFF[SAVE.diff].extra;
  for (const b of document.querySelectorAll('#story .seg button')) { const on = b.dataset.v === SAVE.diff; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
}

