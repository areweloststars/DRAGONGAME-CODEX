/* ---------- 오버레이 ---------- */
function openOverlay(html, bare) {
  closeOverlay();
  const ov = document.createElement('div');
  ov.className = 'ov'; ov.id = 'ov';
  ov.innerHTML = bare ? `<div class="ovc">${html}</div>` : `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(ov);
  const f = $('.btn', ov); if (f) f.focus({ preventScroll: true });
  return ov;
}
function closeOverlay() { const o = $('#ov'); if (o) { if ($('#story-art-dialog', o)) { STORY_ART.dialog = null; STORY_ART.busy = false; } o.remove(); } }

/* ---------- 이벤트 ---------- */
function bindEvents() {
  $('#home').addEventListener('click', e => {
    const sb = e.target.closest('.seg button');
    if (sb) {
      const set = sb.parentElement.dataset.set;
      SAVE[set] = set === 'sound' || set === 'narr' ? sb.dataset.v === 'true' : set === 'rate' ? parseFloat(sb.dataset.v) : sb.dataset.v;
      persist();
      if (set === 'sound' && SAVE.sound) { Sound.unlock(); Sound.play('know'); }
      if ((set === 'rate' || set === 'narr') && SAVE.narr) { Narr.unlock(); sayWord(SCENES[0].words[0], wordRate()).catch(() => { }); }
      renderHome();
      return;
    }
    const mc = e.target.closest('.mcard');
    if (mc) {
      Sound.unlock();
      if (mc.dataset.locked) { Sound.play('bad'); buzz(30); toast(mc.dataset.locked); mc.classList.remove('nope'); void mc.offsetWidth; mc.classList.add('nope'); return; }
      Sound.play('tap'); openMission(mc.dataset.boss ? 'boss' : 'scene', mc.dataset.scene); return;
    }
    if (e.target.closest('[data-review]')) { Sound.unlock(); Sound.play('tap'); openMission('review'); return; }
    if (e.target.closest('[data-decks]')) { Sound.unlock(); Sound.play('tap'); openDecks(); return; }
    if (e.target.closest('[data-make]')) { Sound.unlock(); Sound.play('tap'); openMake(); return; }
    const rs = e.target.closest('[data-reset]');
    if (rs) {
      // 한 번 더 눌러야 초기화 (실수 방지)
      if (rs.dataset.armed) { SAVE.best = {}; SAVE.bank = 0; SAVE.lives = LIVES; persist(); renderHome(); toast('진행을 처음부터 다시 시작해요'); }
      else { rs.dataset.armed = '1'; rs.textContent = '정말 초기화할까요? 한 번 더 누르면 깬 에피소드와 모은 시간이 지워져요'; rs.classList.add('armed'); }
    }
  });
  $('#story').addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a) {
      const act = a.dataset.act;
      if (act === 'home') goHome();
      else if (act === 'vplay') { Sound.unlock(); Narr.unlock(); if (SV.on) svPause(); else svPlay(); }
      else if (act === 'vvoice') {
        SAVE.narr = !SAVE.narr; SV.narrFail = false; persist(); Narr.unlock();
        if (SV.on) svShow(); else if (SV.busy && M.kind === 'scene') svShow(true); else { Narr.stop(); svCtl(); }
      }
      else if (act === 'vspeed') {
        SAVE.rate = RATES[(RATES.indexOf(SAVE.rate) + 1) % RATES.length]; persist(); Narr.unlock();
        Narr.setRate(SAVE.rate);
        // 읽던 줄은 새 속도로 처음부터 (진행 막대·시간이 맞게)
        if (SV.busy && M.kind === 'scene') svShow(!SV.on); else svCtl();
        fsQuiet(true);
      }
      else if (act === 'start') { Sound.unlock(); startPlay(); }
      else if (act === 'vfull') { Sound.unlock(); Narr.unlock(); if (FS.on) exitFS(); else enterFS(); }
      return;
    }
    const sb = e.target.closest('.seg button');
    if (sb) { SAVE.diff = sb.dataset.v; persist(); updateBrief(); return; }
    const chip = e.target.closest('.wchip');
    if (chip && SP) {
      Sound.unlock(); Narr.unlock();
      const id = chip.dataset.id;
      if (M.kind === 'scene') {
        const i = SV.lines.findIndex(l => l.word === id);
        // 지금 읽어 주는 단어를 한 번 더 누르면 멈춤
        if (SV.busy && !SV.on && SV.i === i) { svPause(); return; }
        svOne(i);
      }
      else svWord(id);
      return;
    }
    if (e.target.closest('#spanel') && SP) {
      if (FS.on && SP.host.classList.contains('quiet')) { fsQuiet(true); return; }
      if (M.kind === 'scene') { Narr.unlock(); if (SV.on) svPause(); else svPlay(); }
      else if (SP.current) { svHalt(); markChip(null); SP.zoomFull(); SP.current = null; setSub('<p>아래 단어를 누르면 그림 속 장면을 보여 줘요</p>'); }
    }
  });
  $('#play').addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a) {
      const act = a.dataset.act;
      if (act === 'pause') pause();
      else if (act === 'restart') { Sound.play('tap'); startPlay(); }
      else if (act === 'dir') {
        SAVE.dir = SAVE.dir === 'en' ? 'ko' : 'en'; persist(); setDirChip(); Sound.play('tap');
        // 풀던 카드는 새 방향으로 바꾸되 남은 시간은 그대로 (시간을 다시 채우는 꼼수 방지)
        if (M.queue.length && (M.state === 'ask' || M.state === 'idle')) {
          M.keys = keysFor(curId()); M.cardMs = cardTime(M.keys); M.matched = new Set(); $('#ain').value = ''; fillCard(curId());
          if (M.state === 'idle') { M.cardLeft = M.cardMs; M.lastSec = null; updateFuse(true); fuseTo(1, 0); }
          else { M.cardLeft = Math.min(M.cardLeft, M.cardMs); updateFuse(true); if (M.timing && !M.paused && !(M.grace > 0)) fuseRun(); focusInput(); }
        } else toast(`다음 카드부터 ${SAVE.dir === 'en' ? '영어 보고 뜻 쓰기' : '뜻 보고 영어 쓰기'}로 바뀌어요`);
      } else if (act === 'zoom') { if (!M.full) zoomOutFull(); else if (showing()) zoomIn(); else zoomCard(); }
      return;
    }
    if (e.target.closest('#say')) { const id = curId(); Narr.unlock(); sayWord(id, wordRate()).catch(() => { }); return; }
    if (e.target.closest('#picbtn')) { togglePic(); return; }
    const fresh = performance.now() - (M.barAt || 0) < 400;
    if (e.target.closest('#dont')) { if (fresh) return; Sound.unlock(); dont(); return; }
    if (e.target.closest('#next')) { if (fresh) return; nextCard(); return; }
  });
  document.addEventListener('click', e => {
    const dk = e.target.closest('[data-deck]');
    if (dk) { Sound.unlock(); Sound.play('tap'); if (dk.dataset.deck !== DECK.id && switchDeck(dk.dataset.deck)) toast(`‘${DECK.name}’ 단어장으로 바꿨어요`); goHome(); return; }
    const da = e.target.closest('[data-deckart]');
    if (da) { Sound.unlock(); Sound.play('tap'); openArt(da.dataset.deckart); return; }
    const dd = e.target.closest('[data-deckdel]');
    if (dd) {
      // 한 번 더 눌러야 지움 (실수 방지)
      if (!dd.dataset.armed) { dd.dataset.armed = '1'; dd.classList.add('armed'); dd.setAttribute('aria-label', '한 번 더 누르면 지워져요'); toast('한 번 더 누르면 이 단어장과 진행 기록이 지워져요'); return; }
      const id = dd.dataset.deckdel;
      if (DECK.id === id) switchDeck(DECK_BUILTIN.id);
      if (SAVE.decks) delete SAVE.decks[id];
      persist();
      DeckStore.del(id).then(() => { if ($('#ov .decklist')) openDecks(); });
      renderHome(); openDecks(); toast('단어장을 지웠어요');
      return;
    }
    const b = e.target.closest('[data-ov]');
    if (!b) return;
    const a = b.dataset.ov;
    if (a === 'resume') resume();
    else if (a === 'again') startPlay();
    else if (a === 'home') goHome();
    else if (a === 'story') openMission(M.kind, M.key);
    else if (a === 'next') { const n = nextMission(); if (n) openMission(n.kind, n.key); else goHome(); }
    else if (a === 'restart1') openMission('scene', SCENES[0].key);
    else if (a === 'make') openMake();
    else if (a === 'close') closeOverlay();
  });
  window.addEventListener('popstate', onNavBack);
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('keydown', e => {
    if (FS.on && e.key === 'Escape') { e.preventDefault(); exitFS(); return; }
    if (e.key === 'Escape' && $('#ov .decklist')) { e.preventDefault(); closeOverlay(); return; }
    if ($('#play').hidden || $('#ov') || !M.active) return;
    if (e.key === 'Escape') { e.preventDefault(); pause(); }
    else if (e.key === 'Enter' && M.state === 'answer' && document.activeElement !== $('#next')) { e.preventDefault(); if (performance.now() - (M.barAt || 0) >= 400) nextCard(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (M.active && !M.paused && !M.over) pause();
    if (!$('#story').hidden && (SV.on || SV.busy)) svPause(); // 화면이 꺼지면 스토리도 멈춤
    persist();
  });
  // 휴대폰 자판이 올라오면 보이는 높이에 맞춰 미션 화면을 줄여서 입력칸이 자판 바로 위에 오게
  setVVH();
  if (window.visualViewport) visualViewport.addEventListener('resize', () => { setVVH(); if (!$('#play').hidden && window.scrollY) window.scrollTo(0, 0); });
  let rz = 0;
  window.addEventListener('resize', () => {
    setVVH();
    if (window.innerWidth > window.innerHeight) { const r = $('#vrot'); if (r) r.hidden = true; }
    clearTimeout(rz);
    rz = setTimeout(() => {
      if (PP && !$('#play').hidden && M.queue.length) { ppRefit(); fitWords(); }
      if (SP && !$('#story').hidden) spRelayout();
    }, 150);
  });
}

function boot(data) {
  loadSave();
  if (data && data.save && typeof data.save === 'object') Object.assign(SAVE, data.save);
  snapshotBuiltin();
  bootDeck();
  if (!DIFF[SAVE.diff]) SAVE.diff = 'normal';
  if (SAVE.dir !== 'en' && SAVE.dir !== 'ko') SAVE.dir = 'en';
  if (typeof SAVE.narr !== 'boolean') SAVE.narr = true;
  if (!RATES.includes(SAVE.rate)) SAVE.rate = 1;
  for (const k of ['best', 'wrong', 'seen', 'decks']) if (!SAVE[k] || typeof SAVE[k] !== 'object' || Array.isArray(SAVE[k])) SAVE[k] = {};
  SAVE.sound = SAVE.sound !== false;
  if (!(SAVE.lives > 0)) { SAVE.best = {}; SAVE.bank = 0; SAVE.lives = LIVES; }
  SAVE.lives = Math.min(LIVES, Math.round(SAVE.lives)); SAVE.bank = clamp(+SAVE.bank || 0, 0, BANK_MAX);
  const keep = new Set([...SCENES.map(s => s.key), 'boss', 'review']);
  for (const k in SAVE.best) if (!keep.has(k) || !SAVE.best[k] || typeof SAVE.best[k].elapsed !== 'number') delete SAVE.best[k];
  document.documentElement.lang = 'ko';
  bindEvents();
  bindMake();
  bindStoryArt();
  renderHome();
  showScreen('home');
  artHydrateCurrent();
  mkInit();
  // 내 Claude 계정 저장소에 연결되면 다른 기기에서 만든 단어장도 목록에 보임
  DeckStore.onChange(() => { if ($('#ov .decklist')) openDecks(); });
  DeckStore.connect();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!$('#play').hidden && M.queue.length) fitWords(); });
}
const HOT = window.claude && window.claude.hot;
try { if (HOT && HOT.snapshot) HOT.snapshot(() => ({ save: SAVE })); } catch (e) { }
if (HOT && HOT.ready) HOT.ready(boot); else boot((HOT && HOT.data) || {});

