/* ---------- 미션: 뜻을 직접 입력해 맞히기 ----------
   빨리 맞히면 남은 시간이 '모은 시간'에 쌓이고, 단어 시간이 다 되면 모은 시간을 보너스로 꺼내 써요.
   모은 시간까지 다 쓰면 하트 -1. 하트를 다 잃으면 미션 실패(목숨 -1), 목숨을 다 잃으면 처음부터. */
const HEART = on => `<svg viewBox="0 0 24 22" class="${on ? 'on' : 'off'}" aria-hidden="true"><path d="M12 20.4 3.7 12.3A5.2 5.2 0 0 1 12 5.3a5.2 5.2 0 0 1 8.3 7z"/></svg>`;
const usesBank = () => M.kind === 'scene' || M.kind === 'boss';
const showing = () => M.state === 'answer' || M.state === 'done';
// 이번 카드에서 맞혀야 할 것: 영어→뜻이면 뜻 묶음들, 뜻→영어면 영어 단어 하나
function keysFor(id) {
  if (SAVE.dir === 'en') return WORDS[id].ans;
  return [{ t: shortW(id), ok: [...new Set([norm(shortW(id)), norm(id)])] }];
}
// 입력에 이 뜻이 들어 있나: 영어는 그 단어 그대로(뒤에 s·ed 정도만 허용), 한국어는 들어 있으면 인정하되
// '부정확하게'처럼 맨 앞 한 글자가 뜻을 뒤집는 말이면 인정하지 않음
const NEG1 = '부불비무미몰';
// 뜻 바로 뒤에 붙어 뜻을 뒤집는 말: '결함 없는', '정확하지 않게', '의욕을 꺾다' …
const NEG_AFTER = /^(?:이|가|을|를|은|는|도)?(?:하|해)?(?:지않|지못|않|없|못|꺾|잃|떨어)/;
// 입력 n 안에서 뜻 a가 '그 뜻으로' 쓰인 자리 (없으면 -1)
function meaningAt(n, a) {
  if (!a) return -1;
  if (SAVE.dir === 'ko') return n === a || n === a + 's' || n === a + 'es' || n === a + 'd' || n === a + 'ed' ? 0 : -1;
  for (let i = n.indexOf(a); i >= 0; i = n.indexOf(a, i + 1)) {
    if (i === 1 && NEG1.includes(n[0])) continue;
    if (NEG_AFTER.test(n.slice(i + a.length)) && !/[않없못]/.test(a)) continue;
    return i;
  }
  return -1;
}
const hasMeaning = (n, a) => meaningAt(n, a) >= 0;
const keyBlocked = (id, n) => SAVE.dir === 'en' && !!WORDS[id] && !!WORDS[id].no && WORDS[id].no.some(x => n.includes(x));
const keyHit = (id, k, n) => !keyBlocked(id, n) && k.ok.some(a => hasMeaning(n, a));
// 입력이 채우는 뜻 칸들: 긴 뜻부터 자리를 차지해서, 한 글자 묶음이 두 칸을 동시에 채우지 않게 ('사용하다'는 '사용' 칸을 채우지 않음)
function keysFilled(id, keys, n) {
  const got = new Set();
  if (keyBlocked(id, n)) return got;
  const pairs = [];
  keys.forEach((k, i) => k.ok.forEach(a => pairs.push([i, a])));
  pairs.sort((x, y) => y[1].length - x[1].length);
  let rest = n;
  for (const [i, a] of pairs) {
    if (got.has(i)) continue;
    const at = meaningAt(rest, a);
    if (at < 0) continue;
    got.add(i);
    rest = rest.slice(0, at) + '\u0000'.repeat(a.length) + rest.slice(at + a.length);
  }
  return got;
}
const cardTime = keys => (DIFF[SAVE.diff].sec + DIFF[SAVE.diff].extra * Math.max(0, keys.length - 1)) * 1000;
function renderPlayShell() {
  $('#play').innerHTML = `
    <div class="playbar">
      <div class="topbar">
        <button type="button" class="iconbtn" data-act="pause" aria-label="일시정지">${ICON.pause}</button>
        <div class="pbtitle"><span><em id="pblab"></em><i class="dots" id="dots"></i><em class="left" id="leftn"></em></span><b id="pbtitle"></b></div>
        <span class="lives" id="lives" role="img"></span>
      </div>
      <div class="fuserow" id="fuserow"><span class="hearts" id="hearts" role="img"></span>${BOMB}<div class="fuse"><div class="fuse-fill" id="fusefill"></div>${SPARK}</div><span class="clock" id="clock">0초</span><span class="bank" id="bank" role="status" aria-label="모은 시간"></span></div>
    </div>
    <div class="cardwrap" id="cardwrap">
      <div class="card" id="card">
        <div id="ppanel"></div>
        <div class="cbody" id="cbody">
          <div class="cmeta"><span class="pos" id="pos"></span><span class="cscene" id="cscene"></span><button type="button" class="chip" data-act="dir" id="dirchip"></button></div>
          <div class="q" id="q"></div>
          <div class="slots" id="slots" aria-live="polite"></div>
          <div class="ans" id="ans" hidden>
            <div class="mfull" id="mfull"></div>
            <div class="ipa"><span class="pos" id="pos2"></span><span class="ipa-t" id="ipa"></span><span class="kr" id="kr"></span><button type="button" class="say" id="say" aria-label="발음 듣기">${ICON.speaker}</button></div>
            <button type="button" class="picbtn" id="picbtn" aria-expanded="false" aria-controls="picpanel">${ICON.pic}<span>그림해석</span></button>
            <div class="picpanel" id="picpanel" hidden></div>
          </div>
        </div>
      </div>
    </div>
    <form class="answerbar" id="answerbar" autocomplete="off" novalidate>
      <button type="button" class="btn-dont" id="dont">몰라요</button>
      <input class="ain" id="ain" type="text" enterkeyhint="send" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" aria-label="답 입력">
      <button type="submit" class="btn-go" id="go" aria-label="확인">${ICON.enter}</button>
      <button type="button" class="btn-next" id="next" hidden>다음 ${ICON.next}</button>
    </form>`;
  PP = new Panel($('#ppanel'), { zoomToggle: true, fluid: true });
  // 자판이 올라오거나 답이 펼쳐져 그림 칸 크기가 바뀌면 그 자리에서 다시 맞춤
  if (window.ResizeObserver) { let raf = 0; new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(ppRefit); }).observe($('#ppanel')); }
  const ain = $('#ain');
  ain.addEventListener('input', onType);
  ain.addEventListener('compositionend', onType);
  $('#answerbar').addEventListener('submit', e => { e.preventDefault(); if (M.state === 'answer' && performance.now() - (M.barAt || 0) < 400) return; onSubmit(); });
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const curId = () => M.queue[0];
function updateHearts(broke) {
  const el = $('#hearts'); if (!el) return;
  el.innerHTML = Array.from({ length: M.maxHearts }, (_, i) => HEART(i < M.hearts)).join('');
  el.classList.toggle('many', M.maxHearts > 3);
  el.setAttribute('aria-label', `하트 ${M.hearts}개 남음`);
  if (broke) { const lost = el.children[M.hearts]; if (lost) lost.classList.add('break'); }
}
function updateLives() {
  const el = $('#lives'); if (!el) return;
  el.hidden = !usesBank();
  el.innerHTML = livesHTML(); el.setAttribute('aria-label', `목숨 ${SAVE.lives}개`);
}
function updateBank(fx) {
  const el = $('#bank'); if (!el) return;
  el.hidden = !usesBank();
  el.innerHTML = `${ICON.clock}<b>${(SAVE.bank / 1000).toFixed(1)}</b>`;
  el.classList.toggle('spend', !!M.ot);
  el.classList.toggle('empty', SAVE.bank <= 0);
  if (fx) { el.classList.remove('gain'); void el.offsetWidth; el.classList.add('gain'); }
}
function bankAdd(ms) { SAVE.bank = clamp(SAVE.bank + ms, 0, BANK_MAX); }
function setVVH() {
  const v = window.visualViewport, h = Math.round(v ? v.height : window.innerHeight);
  document.documentElement.style.setProperty('--vvh', h + 'px');
  // 가로 화면에서 자판이 올라와 보이는 높이가 아주 낮으면 그림을 접고 단어·입력칸만 남김
  document.documentElement.classList.toggle('vv-short', h < 350);
}
function focusInput() { const a = $('#ain'); if (a && !$('#play').hidden) { try { a.focus({ preventScroll: true }); } catch (e) { a.focus(); } } }
function clearInput() {
  const a = $('#ain'); if (!a) return;
  a.value = '';
  // 한글 조합 중에 지우면 마지막 글자가 되살아나는 자판이 있어서 한 번 더 비움
  M.clearT = setTimeout(() => { if (M.state !== 'ask' || M.justOk) a.value = ''; M.justOk = false; }, 140);
}
// 미션 화면을 떠날 때: 남은 타이머를 모두 끄고, 결과 화면을 기다리던 성공·실패는 조용히 기록
function settlePending() {
  clearTimeout(M.nextT); clearTimeout(M.tickT); clearTimeout(M.cdT); clearTimeout(M.clearT); clearTimeout(M.failT);
  const p = M.pending; M.pending = null;
  // 하트를 잃은 채로 미션을 그만두면 실패로 쳐요 (목숨을 아끼려고 도중에 나가는 꼼수 방지)
  if (!p && usesBank() && M.active && !M.over && M.heartsLost > 0) { fail(true); return; }
  if (p === 'win') win(true); else if (p === 'fail') fail(true);
  else persist(); // 보너스로 쓴 시간·벌칙도 저장
}
function startPlay() {
  settlePending();
  leaveStory(); closeOverlay();
  if (!PP) renderPlayShell();
  const hearts = heartsFor(M.kind);
  Object.assign(M, {
    queue: shuffle(M.ids.slice()), cleared: new Set(), dontCount: 0, wrongCount: 0, dontBy: {}, combo: 0, maxCombo: 0,
    cardMs: 1, cardLeft: 0, timing: false, grace: 0, elapsed: 0, cards: 0, timeouts: 0, ot: false, otMax: 0, gained: 0, spent: 0,
    hearts, maxHearts: hearts, heartsLost: 0, over: false, paused: true, active: false, busy: false, lastSec: null,
    state: 'idle', full: false, matched: new Set(), keys: [], picOpen: false, fuseC: null, fuseW: 0, failed: false, pending: null,
    shown: new Set(), prevTail: null, prevAt: 0, barAt: 0
  });
  showScreen('play'); setVVH(); $('#play').classList.remove('paused');
  const s = M.kind === 'scene' ? sceneOf(M.key) : null;
  $('#pblab').textContent = s ? `EPISODE ${s.n}` : M.kind === 'boss' ? 'BOSS' : 'PRACTICE';
  $('#pbtitle').textContent = s ? s.title : M.kind === 'boss' ? `${M.ids.length}단어 총출동` : '오답 연습';
  setDirChip(); updateHearts(); updateLives(); updateBank();
  showCard(false);
  focusInput(); // ‘미션 시작’을 누른 그 순간에 입력칸을 잡아야 휴대폰 자판이 올라와요
  $('#play').classList.add('paused'); // 카운트다운 동안은 문제를 가려 둠 (시간 전에 미리 보기 없음)
  countdown(() => { if (M.over) return; $('#play').classList.remove('paused'); $('#ain').value = ''; M.active = true; M.paused = false; M.state = 'ask'; renderSlots(); armCard(300); zoomCard(); startTick(); focusInput(); if (document.hidden) pause(); });
}
function setDirChip() { const c = $('#dirchip'); if (c) c.textContent = SAVE.dir === 'en' ? '영→한' : '한→영'; }
function countdown(done) {
  const ov = openOverlay('', true), box = $('.ovc', ov);
  let n = 3;
  const step = () => {
    if (!$('#ov')) return;
    if (n > 0) { box.innerHTML = `<div class="count">${n}</div>`; Sound.play('count'); n--; M.cdT = setTimeout(step, 400); }
    else { box.innerHTML = '<div class="count go">시작!</div>'; Sound.play('go'); M.cdT = setTimeout(() => { closeOverlay(); done(); }, 340); }
  };
  step();
}
// 새 카드의 초시계 시작 (grace: 카드가 들어오는 동안은 시간이 흐르지 않음)
function armCard(grace) {
  M.cardLeft = M.cardMs; M.grace = grace; M.lastSec = null; M.timing = true; M.ot = false;
  $('#fuserow').classList.remove('bonus');
  updateFuse(true); fuseTo(1, 0);
  if (!(grace > 0) && M.active && !M.paused) fuseRun();
}
// 초시계: 0.1초마다 확인 (매 프레임 깨우지 않아 휴대폰이 덜 바빠요)
function startTick() { clearTimeout(M.tickT); M.last = performance.now(); M.tickT = setTimeout(tick, 100); }
function tick() {
  if (!M.active || M.paused || M.over) return;
  const now = performance.now(), dt = Math.min(250, now - M.last);
  M.last = now;
  if (M.timing && M.state === 'ask') {
    if (M.grace > 0) { M.grace -= dt; if (M.grace <= 0) fuseRun(); }
    else if (!M.ot) {
      M.elapsed += dt; M.cardLeft -= dt;
      if (M.cardLeft <= 0) { M.cardLeft = 0; if (usesBank() && SAVE.bank > 0) startOvertime(); else { updateFuse(); timeoutCard(); } }
      else updateFuse();
    } else {
      M.elapsed += dt;
      const use = Math.min(dt, SAVE.bank); bankAdd(-use); M.spent += use; updateBank();
      if (SAVE.bank <= 0) { updateFuse(); timeoutCard(); } else updateFuse();
    }
  }
  M.tickT = setTimeout(tick, 100);
}
// 단어 시간이 다 됨 → 모은 시간을 보너스로 꺼내 씀
function startOvertime() {
  M.ot = true; M.otMax = SAVE.bank;
  $('#fuserow').classList.add('bonus');
  Sound.play('bonus'); buzz(30);
  addFx('stamp bonus', '보너스 시간!', 900);
  updateBank(); updateFuse(true); fuseRun();
}
// 도화선은 CSS transform 전환으로 타들어 가게 (화면 합성만으로 움직여서 휴대폰이 바쁘지 않음)
function fuseTo(r, ms) {
  const fill = $('#fusefill'), spark = $('#spark');
  if (!fill) return;
  if (!M.fuseW) M.fuseW = fill.parentElement.clientWidth;
  const tr = ms > 0 ? `transform ${Math.round(ms)}ms linear` : 'none';
  fill.style.transition = spark.style.transition = tr;
  fill.style.transform = `scaleX(${r.toFixed(4)})`;
  spark.style.transform = `translateX(${(r * M.fuseW).toFixed(1)}px)`;
}
const fuseRatio = () => M.ot ? (M.otMax ? clamp(SAVE.bank / M.otMax, 0, 1) : 0) : clamp(M.cardLeft / M.cardMs, 0, 1);
function fuseRun() { fuseTo(fuseRatio(), 0); void $('#fusefill').offsetWidth; fuseTo(0, M.ot ? SAVE.bank : M.cardLeft); }
function fuseFreeze() { fuseTo(fuseRatio(), 0); }
function updateFuse(force) {
  const r = fuseRatio(), ms = M.ot ? SAVE.bank : M.cardLeft;
  const c = M.ot ? 'var(--bonus)' : r > .5 ? 'var(--good)' : r > .25 ? 'var(--star)' : 'var(--bad)';
  if (force || c !== M.fuseC) { M.fuseC = c; $('#fusefill').style.background = c; }
  const s = Math.ceil(ms / 1000);
  if (force || s !== M.lastSec) {
    M.lastSec = s;
    $('#clock').textContent = (M.ot ? '+' : '') + s + '초';
    const hurry = M.timing && M.state === 'ask' && s <= 3 && ms > 0 && (M.ot || !usesBank() || SAVE.bank <= 0);
    $('#fuserow').classList.toggle('hurry', hurry);
    if (hurry && !force) Sound.play('tick');
  }
}
function updateCounts() {
  const n = M.ids.length;
  $('#dots').innerHTML = n <= 12 ? M.ids.map(id => `<i class="${M.cleared.has(id) ? 'on' : ''}"></i>`).join('') : '';
  const left = M.queue.length - (M.state === 'done' ? 1 : 0);
  $('#leftn').textContent = n <= 12 ? `남은 ${left}` : `맞힘 ${M.cleared.size}/${n}`;
}
const picHTML = w => `<p><span class="pp-lab">암기 팁</span>${esc(w.tip)}</p><div><span class="pp-lab">예문</span><p class="pp-en">${exHTML(w.ex)}</p><p class="pp-ko">${esc(w.exKo)}</p></div>`;
function renderSlots() {
  const el = $('#slots'); if (!el) return;
  const en = SAVE.dir === 'en', n = M.keys.length;
  el.innerHTML = `<span class="slotlab">${en ? '뜻' : '영어'} ${n}개</span>` + M.keys.map((k, i) => {
    const ok = M.matched.has(i), show = ok || M.state === 'answer';
    return `<span class="slot${ok ? ' ok' : show ? ' shown' : ''}${en ? '' : ' en'}">${show ? esc(k.t) : '?'}</span>`;
  }).join('');
}
function fillCard(id) {
  const w = WORDS[id], en = SAVE.dir === 'en';
  $('#pos').textContent = $('#pos2').textContent = POS[w.pos] || '';
  $('#cscene').textContent = sceneOf(w.scene).title;
  const q = $('#q'); q.className = 'q' + (en ? '' : ' ko'); q.innerHTML = en ? esc(id) : mHTML(w.m);
  renderSlots();
  // 교재 뜻 전체(괄호·~ 등)가 칸에 다 안 보일 때만 아래에 따로 보여 줌
  const mf = $('#mfull'), plain = M.keys.map(k => k.t).join(', ');
  mf.innerHTML = en ? (w.m !== plain ? `전체 뜻: ${mHTML(w.m)}` : '') : `<b>${esc(id)}</b> · ${mHTML(w.m)}`;
  $('#ipa').textContent = w.ipa ? '/' + w.ipa + '/' : '';
  $('#kr').textContent = w.kr;
  $('#ans').hidden = true;
  $('#picbtn').setAttribute('aria-expanded', 'false');
  const pp = $('#picpanel'); pp.hidden = true; pp.innerHTML = picHTML(w);
  M.picOpen = false;
  const ain = $('#ain');
  ain.placeholder = en ? (M.keys.length > 1 ? `뜻 ${M.keys.length}개를 모두 입력` : '뜻을 입력하세요') : '영어 단어를 입력하세요';
  ain.lang = en ? 'ko' : 'en';
  fitWords();
}
const measure = document.createElement('canvas').getContext('2d');
function shrink(el) {
  el.style.fontSize = '';
  if (!el.offsetParent) return;
  const cs = getComputedStyle(el), max = parseFloat(cs.fontSize), avail = el.clientWidth - 6;
  measure.font = `${cs.fontWeight} ${max}px ${cs.fontFamily}`;
  const widest = Math.max(...el.textContent.split(/\s+/).map(t => measure.measureText(t).width));
  if (widest > avail && avail > 0) el.style.fontSize = Math.max(18, Math.floor(max * avail / widest)) + 'px';
}
function fitWords() { shrink($('#q')); }
// 입력칸 아래 버튼: 문제 풀 때는 [몰라요][입력][확인], 답을 볼 때는 [다음]
function setBar(mode) {
  M.barAt = performance.now(); // 단추가 바뀐 직후 0.4초 동안은 같은 자리 두 번째 탭을 무시
  const ans = mode === 'answer';
  $('#dont').hidden = $('#ain').hidden = $('#go').hidden = ans;
  $('#next').hidden = !ans;
  $('#answerbar').classList.toggle('next', ans);
}
function showCard(animate) {
  const id = curId(), w = WORDS[id], card = $('#card');
  clearTimeout(M.clearT);
  M.full = false; M.state = M.active ? 'ask' : 'idle'; M.matched = new Set(); M.ot = false;
  M.keys = keysFor(id); M.cardMs = cardTime(M.keys);
  if (M.shown) M.shown.add(id);
  card.classList.remove('ok', 'answer', 'in', 'shake');
  $('#ain').value = '';
  fillCard(id);
  setBar('ask');
  const changed = PP.setScene(w.scene);
  PP.clearFocus(); PP.showZoomBtn(false); PP.hideCaption();
  const h = PP.baseH();
  if (changed || !PP.h) PP.fullNow();
  if (M.active) zoomCard();
  else if (!changed) PP.go(PP.fullVB(PP.width(), h), h, 300, EZ.inout);
  if (animate) { void card.offsetWidth; card.classList.add('in'); }
  updateCounts();
  if (M.active) armCard(animate ? 280 : 0);
  else { M.cardLeft = M.cardMs; M.lastSec = null; updateFuse(true); fuseTo(1, 0); }
}
const capHTML = id => `<p><span class="pcap-lab">그림해석</span>${esc(WORDS[id].pic)}</p>`;
// 맞힐 단어가 나오면 곧바로 그 단어가 그려진 곳으로 확대 (뜻 이름표는 맞힌 뒤나 답을 볼 때)
function zoomCard() {
  const id = curId(), w = WORDS[id], h = PP.baseH();
  M.full = false;
  PP.clearFocus(); PP.showZoomBtn(false); PP.hideCaption();
  PP.burstSpeed(); Sound.play('zoom');
  PP.go(PP.fit(w.spot, PP.width(), h), h, 460, EZ.out, () => {
    if (M.full || showing() || curId() !== id) return;
    PP.focus(w.spot, null); PP.current = id; PP.showZoomBtn(true, '전체 그림');
  });
}
function zoomIn(soft) {
  const id = curId(), w = WORDS[id], h = PP.revealH(), wd = PP.width();
  M.full = false;
  PP.clearFocus(); PP.showZoomBtn(false);
  if (!soft) { PP.burstSpeed(); Sound.play('zoom'); }
  let target;
  if (M.picOpen) { const c = PP.showCaption(capHTML(id), w.spot); target = PP.fitCap(w.spot, wd, h, c.pos, c.ch); }
  else { PP.hideCaption(); target = PP.fit(w.spot, wd, h); }
  PP.go(target, h, soft ? 360 : 460, soft ? EZ.inout : EZ.out, () => {
    if (M.full || curId() !== id) return;
    PP.focus(w.spot, showing() && !M.picOpen ? tagHTML(id) : null); PP.current = id; PP.showZoomBtn(true, '전체 그림');
  });
}
function zoomOutFull() {
  M.full = true;
  PP.clearFocus(); PP.hideCaption();
  const h = PP.baseH();
  PP.go(PP.fullVB(PP.width(), h), h, 380, EZ.inout, () => { if (M.full) PP.showZoomBtn(true, '확대해서 보기'); });
}
// 자판이 열리고 닫히며 그림 칸 크기가 바뀌면 지금 보던 곳을 다시 맞춤 (크기가 그대로면 아무것도 안 함)
function ppRefit(force) {
  if (!PP || $('#play').hidden || !M.queue.length) return;
  const w = PP.width(), h = PP.baseH();
  if (!w || !h || (!force && w === PP.lw && h === PP.lh)) return;
  PP.lw = w; PP.lh = h;
  const fw = $('#fusefill').parentElement.clientWidth;
  if (fw !== M.fuseW) { M.fuseW = fw; if (M.timing && M.active && !M.paused && !(M.grace > 0)) fuseRun(); else fuseFreeze(); }
  const id = curId(), spot = WORDS[id].spot;
  let target;
  if (M.full) target = PP.fullVB(w, h);
  else if (M.picOpen) { const c = PP.showCaption(capHTML(id), spot); target = PP.fitCap(spot, w, h, c.pos, c.ch); }
  else target = PP.fit(spot, w, h);
  const after = () => {
    if (M.full) { PP.showZoomBtn(true, '확대해서 보기'); return; }
    if (M.state === 'idle' || curId() !== id) return;
    PP.focus(spot, showing() && !M.picOpen ? tagHTML(id) : null); PP.current = id; PP.showZoomBtn(true, '전체 그림');
  };
  if (PP.moving) { PP.go(target, h, 220, EZ.out, after); return; }
  PP.stop(); PP.setH(h); PP.setVB(target); after();
}
function togglePic() {
  if (M.state !== 'answer') return;
  M.picOpen = !M.picOpen;
  $('#picpanel').hidden = !M.picOpen;
  $('#picbtn').setAttribute('aria-expanded', String(M.picOpen));
  Sound.play('tap');
  zoomIn(true);
  if (M.picOpen) { PP.pulse(); requestAnimationFrame(() => { const cb = $('#cbody'); if (cb) cb.scrollTo({ top: cb.scrollHeight, behavior: reduceMotion ? 'auto' : 'smooth' }); }); }
}
function addFx(cls, html, ms) {
  const el = document.createElement('div'); el.className = cls; el.innerHTML = html;
  $('#cardwrap').appendChild(el);
  if (ms) setTimeout(() => el.remove(), ms);
  return el;
}
// 화면 가장자리 번쩍 (초록: 정답, 빨강: 오답·시간 초과)
function vignette(kind) {
  if (reduceMotion) return;
  const v = document.createElement('div'); v.className = 'vig ' + kind; document.body.appendChild(v);
  setTimeout(() => v.remove(), 650);
}
// '+3.2초'가 모은 시간 칸으로 날아가는 글자
function floatText(t, kind, from, to) {
  if (!from || reduceMotion) return;
  const a = from.getBoundingClientRect(), el = document.createElement('div');
  el.className = 'timefly ' + kind; el.textContent = t;
  const x0 = a.left + a.width / 2, y0 = a.top + 4;
  el.style.left = x0 + 'px'; el.style.top = y0 + 'px';
  document.body.appendChild(el);
  let dx = 0, dy = -46;
  if (to && to.offsetParent) { const b = to.getBoundingClientRect(); dx = b.left + b.width / 2 - x0; dy = b.top + b.height / 2 - y0; }
  if (el.animate) el.animate([{ transform: 'translate(-50%, 0) scale(1.25)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx.toFixed(0)}px), ${dy.toFixed(0)}px) scale(.7)`, opacity: .35 }], { duration: 700, easing: 'cubic-bezier(.3, .7, .4, 1)', fill: 'forwards' });
  setTimeout(() => el.remove(), 760);
}
// 입력할 때마다 맞힌 뜻이 있는지 바로 확인 → 다 맞히면 곧바로 정답
function onType() {
  const ain = $('#ain');
  if (M.state !== 'ask' || !M.active || M.paused) { if (M.state === 'done' || M.state === 'answer') ain.value = ''; return; }
  const n = norm(ain.value);
  if (!n) return;
  const id = curId();
  // 앞 카드 뜻의 뒷부분이 이 카드 입력칸으로 넘어온 것(자판으로 계속 치던 글자)은 조용히 지움
  // (앞 뜻의 '가운데·끝' 조각만, 새 카드가 나오고 0.9초 안에만: 새 답을 치기 시작한 건 지우지 않음)
  if (M.prevTail && performance.now() - M.prevAt < 900 && M.prevTail.some(t => t.indexOf(n) > 0) && !keyHit(id, { ok: M.keys.flatMap(k => k.ok) }, n)) { ain.value = ''; return; }
  const got = [...keysFilled(id, M.keys, n)].filter(i => !M.matched.has(i));
  got.forEach(i => M.matched.add(i));
  if (!got.length) return;
  if (M.matched.size === M.keys.length) { success(); return; }
  Sound.play('slot'); buzz(12);
  renderSlots();
  const slots = $('#slots').querySelectorAll('.slot');
  got.forEach(i => { if (slots[i]) slots[i].classList.add('pop'); });
}
function onSubmit() {
  if (M.state === 'answer') { nextCard(); return; }
  if (M.state !== 'ask' || !M.active || M.paused) return;
  const ain = $('#ain');
  if (!norm(ain.value)) { const b = $('#answerbar'); b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); return; }
  onType();
  if (M.state !== 'ask') return;
  if (!norm(ain.value)) return; // 앞 카드 뜻이 넘어온 글자라 지웠음
  // 이미 맞힌 뜻을 쓰고 확인을 누른 경우: 벌칙 없이 나머지 뜻을 쓰라고 알려 줌
  const n = norm(ain.value), id = curId();
  if (M.keys.some((k, i) => M.matched.has(i) && keyHit(id, k, n))) {
    Sound.play('tap'); ain.value = '';
    addFx('stamp info', `뜻 ${M.keys.length - M.matched.size}개 더!`, 800);
    const b = $('#answerbar'); b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge');
    return;
  }
  wrong();
}
// 틀린 답: 2초 벌칙 + 빨간 흔들림
function wrong() {
  M.wrongCount++; M.combo = 0;
  Sound.play('bad'); buzz([40, 30, 40]); vignette('bad');
  const bar = $('#answerbar'); bar.classList.remove('bad'); void bar.offsetWidth; bar.classList.add('bad');
  addFx('stamp bad', '땡!', 650);
  if (M.timing && !(M.grace > 0)) {
    if (M.ot) { const use = Math.min(PENALTY, SAVE.bank); bankAdd(-use); M.spent += use; updateBank(); }
    else M.cardLeft = Math.max(0, M.cardLeft - PENALTY);
    floatText('-2초', 'bad', $('#clock'));
    if (M.ot ? SAVE.bank <= 0 : false) { updateFuse(true); timeoutCard(); return; }
    updateFuse(true); fuseRun();
  }
  $('#ain').value = '';
  renderSlots();
}
// 정답: 남은 시간을 모은 시간에 넣고 다음 카드로
function success() {
  const id = curId(), w = WORDS[id];
  M.state = 'done'; M.timing = false; M.justOk = true; fuseFreeze(); M.cards++;
  M.prevTail = [norm(w.m), norm(id), ...M.keys.flatMap(k => [norm(k.t), ...k.ok])].filter(Boolean); M.prevAt = performance.now() + 640;
  const left = M.ot ? 0 : Math.max(0, M.cardLeft);
  M.cleared.add(id); SAVE.seen[id] = 1; M.combo++; M.maxCombo = Math.max(M.maxCombo, M.combo);
  let gain = 0;
  if (usesBank()) { gain = Math.min(left, BANK_MAX - SAVE.bank); bankAdd(gain); M.gained += gain; }
  M.ot = false; $('#fuserow').classList.remove('bonus', 'hurry');
  persist();
  renderSlots();
  const card = $('#card'); card.classList.remove('ok'); void card.offsetWidth; card.classList.add('ok');
  Sound.play(M.combo >= 3 ? 'combo' : 'ok'); if (gain >= 300) setTimeout(() => Sound.play('coin'), 140);
  buzz(18); vignette('good');
  addFx('stamp good', '정답!', 650);
  if (M.combo >= 2) addFx('combo', `COMBO ×${M.combo}`, 800);
  if (gain >= 100) floatText('+' + (gain / 1000).toFixed(1) + '초', 'gain', $('#slots'), $('#bank'));
  PP.focus(w.spot, tagHTML(id)); PP.showZoomBtn(false);
  updateCounts(); setTimeout(() => updateBank(true), 520);
  announce(`정답. ${id}, ${w.m}`);
  clearInput();
  const finished = M.queue.length === 1;
  if (finished) { M.active = false; clearTimeout(M.tickT); M.pending = 'win'; }
  // 맞힌 단어는 다음 카드를 낼 때 빼요 (그 사이에 화면이 다시 그려져도 다음 단어가 미리 보이지 않게)
  M.nextT = setTimeout(() => {
    if (finished) { M.queue.shift(); M.pending = null; win(); }
    else if (!M.over && M.state === 'done') { M.queue.shift(); showCard(true); }
  }, finished ? 700 : 640);
}
// 답을 펼쳐 보여 줌 (몰라요·시간 초과). 그 단어는 '다음'을 누르면 3장 뒤로
function showAnswer() {
  M.state = 'answer'; M.timing = false; M.ot = false; fuseFreeze();
  $('#fuserow').classList.remove('bonus', 'hurry');
  renderSlots();
  $('#ans').hidden = false;
  $('#card').classList.add('answer');
  setBar('answer');
  const ain = $('#ain'); ain.value = ''; ain.blur();
  zoomIn(true);
  updateBank();
}
function dont() {
  if (M.state !== 'ask' || !M.active || M.paused) return;
  const id = curId();
  M.dontCount++; M.dontBy[id] = (M.dontBy[id] || 0) + 1; SAVE.wrong[id] = (SAVE.wrong[id] || 0) + 1; M.combo = 0; M.cards++;
  persist();
  Sound.play('dont'); buzz(20);
  addFx('stamp info', '다시 나와요', 800);
  showAnswer();
}
// 시간도 모은 시간도 다 씀 → 하트 -1
function timeoutCard() {
  if (M.state !== 'ask' || !M.active || M.over) return;
  const id = curId();
  M.timeouts++; M.combo = 0; M.cards++; M.dontBy[id] = (M.dontBy[id] || 0) + 1; SAVE.wrong[id] = (SAVE.wrong[id] || 0) + 1;
  M.hearts = Math.max(0, M.hearts - 1); M.heartsLost++;
  persist();
  updateHearts(true);
  Sound.play('boom'); buzz([70, 40, 70]); vignette('bad');
  addFx('stamp bad', '시간 초과!', 1000);
  const card = $('#card'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
  showAnswer();
  if (M.hearts === 0) { M.active = false; clearTimeout(M.tickT); setBar('answer'); $('#next').hidden = true; M.pending = 'fail'; M.nextT = setTimeout(() => { M.pending = null; fail(); }, 1500); return; }
  addFx('combo heartloss', '하트 −1', 1000);
}
function nextCard() {
  if (M.state !== 'answer' || M.over || !M.active) return;
  const id = M.queue.shift();
  M.queue.splice(Math.min(3, M.queue.length), 0, id);
  Sound.play('tap');
  showCard(true);
  focusInput();
}
function pause() {
  if (!M.active || M.over || M.paused) return;
  M.paused = true; fuseFreeze(); $('#ain').blur(); $('#play').classList.add('paused');
  const left = M.queue.length - (M.state === 'done' ? 1 : 0);
  openOverlay(`<h2>일시정지</h2><p>남은 하트 ${M.hearts}개 · 남은 카드 ${left}장${usesBank() ? ` · 모은 시간 ${secTxt(SAVE.bank)}` : ''}</p>${usesBank() && M.heartsLost > 0 ? '<p class="warn">하트를 잃은 뒤에 그만두면 미션 실패로 쳐서 목숨 1개가 줄어요.</p>' : ''}
    <div class="ractions"><button type="button" class="btn good" data-ov="resume">계속하기</button><button type="button" class="btn" data-ov="again">처음부터 다시</button><button type="button" class="btn" data-ov="home">미션 목록으로</button></div>`);
}
function resume() {
  closeOverlay(); $('#play').classList.remove('paused');
  if (M.over || !M.active) return;
  M.paused = false;
  if (M.timing && !(M.grace > 0)) fuseRun();
  startTick();
  if (M.state === 'ask') focusInput();
}
function nextMission() {
  if (M.kind === 'scene') {
    const i = sceneIdx(M.key);
    if (i < SCENES.length - 1) return { kind: 'scene', key: SCENES[i + 1].key, label: `에피소드 ${i + 2}` };
    return bossOpen() ? { kind: 'boss', key: null, label: '보스 미션' } : null;
  }
  return null;
}
function confetti(n = 46) {
  if (reduceMotion) return;
  const colors = ['#FFD84D', '#E5544B', '#4C7BE0', '#3FA36B', '#EF7DA6', '#F08A3C'];
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i'); d.className = 'cf';
    d.style.left = (Math.random() * 100).toFixed(1) + 'vw';
    d.style.background = colors[i % colors.length];
    d.style.animationDuration = (1.6 + Math.random() * 1.6).toFixed(2) + 's';
    d.style.animationDelay = (Math.random() * .5).toFixed(2) + 's';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 4200);
  }
}
function win(silent) {
  M.over = true; M.active = false; M.timing = false; clearTimeout(M.tickT);
  if (!silent) $('#ain').blur();
  const crit = [true, M.heartsLost === 0, M.dontCount === 0], stars = crit.filter(Boolean).length;
  const key = M.kind === 'scene' ? M.key : M.kind, elapsed = Math.round(M.elapsed);
  let best = false, opened = null, bossNow = false;
  if (M.kind !== 'review') {
    const was = isCleared(key), wasBoss = bossOpen();
    const p = SAVE.best[key];
    if (!p || stars > p.stars || (stars === p.stars && elapsed < p.elapsed)) { SAVE.best[key] = { stars, elapsed, diff: SAVE.diff }; best = true; }
    if (M.kind === 'scene' && !was) { const i = sceneIdx(key); if (i < SCENES.length - 1) opened = i + 1; }
    if (M.kind === 'scene' && !wasBoss && bossOpen()) bossNow = true;
    if (M.kind === 'boss') SAVE.done = (SAVE.done || 0) + 1;
  } else M.ids.forEach(id => { if (!M.dontBy[id]) delete SAVE.wrong[id]; });
  persist();
  if (silent) return;
  if (M.kind === 'boss') { projectComplete(stars, elapsed); return; }
  Sound.play('win'); confetti();
  if (opened != null || bossNow) setTimeout(() => Sound.play('unlock'), 900);
  const next = nextMission(), avg = (M.elapsed / Math.max(1, M.cards) / 1000).toFixed(1);
  openOverlay(`
    <div class="badge">${badgeSVG('#FFD84D')}<span>미션 성공!</span></div>
    <div class="bigstars" role="img" aria-label="별 ${stars}개">${[0, 1, 2].map(i => STAR(i < stars, i)).join('')}</div>
    <ul class="crit"><li class="ok">모든 단어 뜻 맞히기</li><li class="${crit[1] ? 'ok' : ''}">하트 지키기 (시간 초과 0번)</li><li class="${crit[2] ? 'ok' : ''}">‘몰라요’ 0번</li></ul>
    <div class="rstats"><span>걸린 시간 <b>${fmt(M.elapsed)}</b></span><span>카드당 <b>${avg}</b>초</span>${usesBank() ? `<span>모은 시간 <b class="gain">+${secTxt(M.gained)}</b></span><span>보너스 사용 <b>${secTxt(M.spent)}</b></span>` : ''}<span>틀린 입력 <b>${M.wrongCount}</b>번</span><span>최고 콤보 <b>${M.maxCombo}</b></span></div>
    ${usesBank() ? `<p class="bankline">${ICON.clock}지금 모은 시간 <b>${secTxt(SAVE.bank)}</b> — 다음 미션에서 보너스로 써요</p>` : ''}
    ${opened != null ? `<p class="unlock">${ICON.lock}새 에피소드 열림! ${opened + 1}. ${esc(SCENES[opened].title)}</p>` : ''}
    ${bossNow ? `<p class="unlock boss">${ICON.lock}보스 미션이 열렸어요! ${totalWords()}단어 총출동</p>` : ''}
    ${best && M.kind !== 'review' ? '<p>새 최고 기록이에요!</p>' : ''}
    <div class="ractions">${next ? `<button type="button" class="btn good" data-ov="next">다음: ${esc(next.label)}</button>` : ''}<button type="button" class="btn" data-ov="again">다시 하기</button><button type="button" class="btn" data-ov="home">미션 목록</button></div>`);
}
// 보스까지 깸 → 단어 암기 프로젝트 완료
function projectComplete(stars, elapsed) {
  Sound.play('project'); confetti(70); setTimeout(() => confetti(50), 900);
  openOverlay(`
    <div class="badge">${badgeSVG('#7CF29C')}<span>프로젝트 완료!</span></div>
    <h2>단어 암기 프로젝트 완료</h2>
    <p>${esc(DECK.name)} — 에피소드 ${epN()}개와 보스 미션까지 모두 깼어요. ${totalWords()}단어를 직접 써서 맞혔어요!</p>
    <div class="bigstars" role="img" aria-label="별 ${stars}개">${[0, 1, 2].map(i => STAR(i < stars, i)).join('')}</div>
    <div class="rstats"><span>보스 걸린 시간 <b>${fmt(elapsed)}</b></span><span>모은 시간 <b class="gain">+${secTxt(M.gained)}</b></span><span>남은 목숨 <b>${SAVE.lives}</b>/${LIVES}</span></div>
    <div class="ractions"><button type="button" class="btn good" data-ov="home">미션 목록</button><button type="button" class="btn" data-ov="again">보스 다시 하기</button></div>`);
}
function fail(silent) {
  if (M.over && M.failed) return;
  M.over = true; M.failed = true; M.active = false; M.timing = false; clearTimeout(M.tickT); clearTimeout(M.nextT);
  if (!silent) $('#ain').blur();
  const remain = M.ids.filter(id => !M.cleared.has(id));
  remain.filter(id => M.shown && M.shown.has(id) && !M.dontBy[id]).forEach(id => { SAVE.wrong[id] = (SAVE.wrong[id] || 0) + 1; });
  let gameOver = false, lost = 0;
  if (usesBank()) { SAVE.lives = Math.max(0, SAVE.lives - 1); gameOver = SAVE.lives === 0; }
  if (gameOver) { lost = clearedN(); SAVE.best = {}; SAVE.bank = 0; SAVE.lives = LIVES; }
  persist();
  if (silent) { if (gameOver) toast('목숨을 모두 잃어서 에피소드 1부터 다시 시작해요'); return; }
  Sound.play('fail'); buzz([80, 50, 140]); vignette('bad');
  const app = $('#app'); app.classList.remove('shake'); void app.offsetWidth; app.classList.add('shake');
  const missLi = id => `<li><b>${esc(id)}</b><span>${mHTML(WORDS[id].m)}</span>${WORDS[id].ipa ? `<em>/${esc(WORDS[id].ipa)}/</em>` : ''}</li>`;
  // 틀린 단어가 많으면 5개만 보이고 나머지는 접어 둠 (단추가 화면 밖으로 밀리지 않게)
  const missHTML = `<ul class="miss">${remain.slice(0, 5).map(missLi).join('')}</ul>` +
    (remain.length > 5 ? `<details class="missmore"><summary>못 맞힌 단어 ${remain.length - 5}개 더 보기</summary><ul class="miss">${remain.slice(5).map(missLi).join('')}</ul></details>` : '');
  clearTimeout(M.failT);
  M.failT = setTimeout(() => {
    if (!M.over || $('#play').hidden) return;
    if (gameOver) { gameOverScreen(missHTML, lost); return; }
    if (usesBank()) setTimeout(() => { Sound.play('life'); buzz([120, 60, 200]); }, 450);
    openOverlay(`
      <div class="badge lose">${badgeSVG('#E5544B')}<span>BOOM!</span></div>
      <h2>미션 실패</h2>
      ${usesBank() ? `<div class="lifeloss" role="img" aria-label="목숨 ${SAVE.lives}개 남음">${Array.from({ length: LIVES }, (_, i) => `<span class="${i < SAVE.lives ? 'on' : i === SAVE.lives ? 'lost' : 'off'}">${LIFE(i < SAVE.lives || i === SAVE.lives)}</span>`).join('')}</div>
      <p><b class="warn">목숨 1개</b>를 잃었어요. 남은 목숨 ${SAVE.lives}개. 아직 못 맞힌 단어 ${remain.length}개를 보고 다시 도전해요.</p>` : `<p>하트를 모두 잃었어요. 아직 못 맞힌 단어 ${remain.length}개를 보고 다시 도전해요.</p>`}
      ${missHTML}
      <div class="ractions"><button type="button" class="btn primary" data-ov="again">다시 도전</button>${M.kind === 'scene' ? '<button type="button" class="btn" data-ov="story">스토리 다시 보기</button>' : ''}<button type="button" class="btn" data-ov="home">미션 목록</button></div>`);
  }, reduceMotion ? 0 : 380);
}
// 목숨을 모두 잃음 → 깬 에피소드·모은 시간 초기화, 에피소드 1부터 다시
function gameOverScreen(missHTML, lost) {
  Sound.play('gameover'); buzz([200, 80, 200, 80, 300]);
  openOverlay(`
    <div class="badge lose">${badgeSVG('#5A5F8A')}<span>GAME OVER</span></div>
    <h2>목숨을 모두 잃었어요</h2>
    <p>깬 에피소드 ${lost}개와 모은 시간이 모두 초기화됐어요. 목숨 3개로 에피소드 1부터 다시 깨 봐요!</p>
    ${missHTML}
    <div class="ractions"><button type="button" class="btn primary" data-ov="restart1">에피소드 1부터 다시</button><button type="button" class="btn" data-ov="home">미션 목록</button></div>`);
}

