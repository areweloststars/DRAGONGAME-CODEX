/* ================= 사진으로 새 단어장 만들기 =================
   1) 단어장 사진 → 이 기기 안에서 글자 인식(OCR)으로 영어 단어와 뜻을 읽음 (API 없이)  2) 학생이 확인·수정
   3) 바로 만들기: 단어를 에피소드로 나누고, 뜻을 보고 그림 칸(이모지·사람·동물)을 자동으로 골라 게임으로
      (Claude를 쓸 수 있는 화면에서는 고르면 이야기·팁·예문까지 Claude가 써 줌)
   4) 그림 꾸미기: 단어마다 그림 칸을 눌러서 주인공·배경·글씨를 바꿈 → genScene()이 만화 한 쪽으로 그림 */
const MK = { useAI: false, run: null, art: null, step: 'pick', images: [], rows: [], name: '', ctl: null, err: '', note: '', log: [], sample: null, caps: null, ready: false, deck: null, paste: '', pasteOpen: null };
const MK_MIN = 4, MK_MAX = 80;
const POS_KEYS = ['n', 'v', 'a', 'd', 'p', 'x'];

async function mkInit() {
  try {
    if (!window.claude || typeof claude.use !== 'function') return;
    MK.sample = await claude.use('sample');
    if (MK.sample && MK.sample.limits) MK.caps = await MK.sample.limits().catch(() => null);
  } catch (e) { MK.sample = null; }
  finally { MK.ready = true; if (!$('#make').hidden) renderMake(); }
}
const mkCanAI = () => !!MK.sample;
const mkCanPhoto = () => !!(MK.sample && MK.caps && MK.caps.images);
// Claude 호출 실패를 학생에게 보일 말로
function mkErrText(e) {
  const c = e && e.code;
  if (c === 'cancelled') return '';
  if (c === 'not_granted' || c === 'sampling_disabled' || c === 'not_declared' || c === 'capability_disabled' || c === 'capability_removed') { MK.sample = null; return 'Claude 사용이 허락되지 않아서 자동으로 만들 수 없어요. 단어를 직접 입력하면 간단한 단어장으로 만들 수 있어요.'; }
  if (c === 'images_unavailable') { MK.caps = null; return '이 화면에서는 사진을 보낼 수 없어요. 단어를 직접 입력해 주세요.'; }
  if (c === 'image_rejected') return '사진을 읽을 수 없어요. 다른 사진(JPG·PNG)으로 해 주세요.';
  if (c === 'rate_limited') return 'Claude 사용량이 잠깐 많아요. 조금 뒤에 다시 눌러 주세요.';
  if (c === 'session_expired') return '로그인이 끝났어요. 다시 로그인한 뒤 해 주세요.';
  if (c === 'refused') return 'Claude가 이 내용은 만들 수 없다고 했어요. 단어를 조금 바꿔서 다시 해 보세요.';
  if (c === 'invalid_json' || c === 'empty_completion') return '답을 제대로 받지 못했어요. 다시 눌러 주세요.';
  if (c === 'prompt_too_large') return '단어가 너무 많아요. 단어 수를 줄여서 해 주세요.';
  return '잠깐 연결이 불안정해요. 다시 눌러 주세요.';
}
// 품사 표시(n. v. adj. …)와 발음기호([ˈ…], /…/)는 단어·뜻에서 뺌
const POS_TOK = /(^|\s)\(?(?:n|v|a|adj|adv|ad|prep|conj|vt|vi|pron|int)\.\)?(?=\s|$)/gi;
const IPA_TOK = /\[[^\]가-힣]*\]|\/[^/\s가-힣][^/가-힣]{0,30}\//g;
function mkCleanEn(s) { return String(s || '').replace(IPA_TOK, ' ').replace(POS_TOK, ' ').replace(/[{}|<>"]/g, '').replace(/\s+/g, ' ').replace(/^[\s\-–—:=~.,]+|[\s\-–—:=~.,]+$/g, '').trim().slice(0, 40); }
function mkCleanKo(s) { return String(s || '').replace(IPA_TOK, ' ').replace(POS_TOK, ' ').replace(/[{}|<>]/g, '').replace(/\s+/g, ' ').replace(/^[\s\-–—:=.,]+|[\s\-–—:=,]+$/g, '').trim().slice(0, 60); }
// 쓸 수 있는 줄: 영어와 (글자가 있는) 뜻이 다 있음
const mkRowOk = r => !!(mkCleanEn(r.en) && mkCleanKo(r.ko) && mkAnsFrom(null, mkCleanKo(r.ko)).length);
const mkValidRows = () => mkDedupe(MK.rows).filter(mkRowOk);

/* ---------- 화면 ---------- */
function openMake() {
  closeOverlay();
  if (MK.step === 'making') { showScreen('make'); renderMake(); return; }
  if (MK.step === 'art') MK.step = MK.deck ? 'done' : 'pick';
  if (MK.step === 'done' && !MK.deck) MK.step = 'pick'; // 완성된 단어장이 있으면 완성 화면을 다시 보여 줌
  showScreen('make'); renderMake();
}
function renderMake() {
  const el = $('#make'); if (!el) return;
  const head = `<div class="topbar"><button type="button" class="iconbtn" data-mk="home" aria-label="미션 목록으로">${ICON.back}</button><span class="toplab">${MK.step === 'art' ? 'DRAW PICTURES' : 'NEW WORD BOOK'}</span></div><h2 class="stitle">${MK.step === 'art' ? '그림 꾸미기' : '사진으로 새 단어장 만들기'}</h2>`;
  let body = '';
  if (MK.step === 'pick') body = mkPickHTML();
  else if (MK.step === 'reading') body = `<div class="mkwait ocr"><div class="spin" aria-hidden="true"></div><p><b>사진 속 단어를 읽고 있어요</b><br><small id="ocrlab">글자 읽는 도구 준비 중</small></p><button type="button" class="btn" data-mk="stop">그만두기</button><div class="ocrbar" aria-hidden="true"><i id="ocrbar"></i></div></div><p class="mksmall mkslow" id="ocrslow" hidden>오래 걸리고 있어요. 사진이 흐리거나 기울었으면 ‘그만두기’를 누르고 더 밝고 가깝게 다시 찍어 보세요. 단어를 직접 입력해도 돼요.</p><p class="mksmall">사진은 이 기기 안에서만 읽어요. 어디에도 보내지 않아요.</p>`;
  else if (MK.step === 'art') body = MK.art && MK.art.sel ? arEditHTML() : arGridHTML();
  else if (MK.step === 'review') body = mkReviewHTML();
  else if (MK.step === 'making') body = mkMakingHTML();
  else if (MK.step === 'done') body = mkDoneHTML();
  el.innerHTML = head + (MK.err ? `<p class="mkerr" role="alert">${esc(MK.err)}</p>` : '') + body;
  if (MK.step === 'review') mkBindRows();
}
function mkPickHTML() {
  const thumbs = MK.images.map((im, i) => `<div class="mkimg"><img src="${im.url}" alt="고른 사진 ${i + 1}"><button type="button" data-mk="rmimg" data-i="${i}" aria-label="사진 ${i + 1} 빼기">${ICON.close}</button></div>`).join('');
  return `
    <ol class="mksteps"><li><b>사진</b> 단어장 쪽을 찍어요</li><li><b>확인</b> 읽은 단어와 뜻을 고쳐요</li><li><b>완성</b> 그림·미션이 바로 생겨요</li></ol>
    <div class="mkpick">
      <label class="btn good mkbtn">${ICON.camera}<span>사진 찍기</span><input class="mkfile" type="file" accept="image/*" capture="environment" data-mkfile="1" aria-label="사진 찍기"></label>
      <label class="btn mkbtn">${ICON.pic}<span>앨범에서 고르기</span><input class="mkfile" type="file" accept="image/*" multiple data-mkfile="1" aria-label="앨범에서 고르기"></label>
    </div>
    <div class="mkdrop" id="mkdrop" contenteditable="true" role="textbox" aria-label="사진 붙여넣기" data-ph="사진 붙여넣기: 갤러리에서 사진을 ‘복사’한 뒤 여기를 길게 눌러 ‘붙여넣기’"></div>
    <details class="mkhelp"><summary>사진 버튼이 안 열려요</summary>
      <ol>
        <li><b>Claude 앱 안</b>에서는 휴대폰에 따라 사진 고르기 창이 안 열릴 수 있어요. 맨 위 <b>공유</b> 단추로 링크를 복사해 <b>Chrome·삼성 인터넷</b>에서 열면 잘 돼요.</li>
        <li>갤러리에서 사진을 <b>복사</b>해 위 점선 칸에 <b>붙여넣기</b> 해도 돼요.</li>
        <li>갤러리(구글 렌즈·삼성 ‘텍스트 추출’)로 사진 속 글자를 <b>복사</b>한 뒤, 아래 <b>단어 직접 입력·붙여넣기</b> 칸에 붙여넣어도 바로 단어장이 돼요.</li>
      </ol>
    </details>
    ${MK.images.length ? `<div class="mkimgs">${thumbs}</div><p class="mksmall">사진 ${MK.images.length}장 · 한 번에 ${OCR_MAX}장까지</p><button type="button" class="startbtn" data-mk="read">${ICON.play}사진 속 단어 읽기</button>` : '<p class="mksmall">‘영어 단어 + 한글 뜻’이 한 줄씩 나란히 있는 쪽을 <b>똑바로, 밝게</b> 찍으면 가장 잘 읽어요. 사진은 이 기기 안에서 읽고, 따로 API나 로그인이 필요 없어요.</p>'}
    <details class="mkpaste"${MK.pasteOpen ? ' open' : ''}><summary>${ICON.pen}단어 직접 입력·붙여넣기</summary>
      <p class="mksmall">한 줄에 하나씩 <b>영어 - 뜻</b> 모양으로 써요. 뜻이 여러 개면 쉼표로 나눠요.<br>예) implement - 시행하다, 실행하다</p>
      <textarea id="mkpaste" rows="7" placeholder="implement - 시행하다, 실행하다&#10;flaw - 결함">${esc(MK.paste)}</textarea>
      <button type="button" class="btn" data-mk="parse">이 단어들로 확인하기</button>
    </details>`;
}
function mkReviewHTML() {
  const n = mkValidRows().length;
  const rows = MK.rows.map((r, i) => `<div class="mkrow${r.flag ? ' flag' : ''}" data-i="${i}"><input class="mken" value="${esc(r.en)}" placeholder="영어" aria-label="${i + 1}번 영어" autocapitalize="off" autocorrect="off" spellcheck="false"><input class="mkko" value="${esc(r.ko)}" placeholder="뜻 (쉼표로 여러 개)" aria-label="${i + 1}번 뜻"><button type="button" data-mk="rmrow" data-i="${i}" aria-label="${i + 1}번 지우기">${ICON.close}</button>${r.snip ? `<img class="mksnip" src="${r.snip}" alt="${i + 1}번 줄의 사진 속 원래 모습">` : ''}${r.flag && OCR_FLAG[r.flag] ? `<span class="mkguess bad">⚠ ${OCR_FLAG[r.flag]}</span>` : ''}${r.guess ? '<span class="mkguess">사진에 뜻이 없어 Claude가 채운 뜻</span>' : ''}${r.ko && !mkAnsFrom(null, mkCleanKo(r.ko)).length ? '<span class="mkguess">뜻을 한글이나 영어 글자로 써 주세요</span>' : ''}</div>`).join('');
  const ok = n >= MK_MIN && n <= MK_MAX;
  return `
    ${MK.note ? `<p class="mknote">${esc(MK.note)}</p>` : ''}
    <p class="mksmall">잘못 읽은 글자가 있으면 고쳐 주세요. <b>뜻이 여러 개면 쉼표로</b> 나눠요. 게임에서는 쉼표로 나눈 뜻을 <b>모두</b> 써야 정답이에요.${MK.rows.some(r => r.snip) ? ' 줄마다 아래에 사진 속 원래 줄을 함께 보여 줘요(이 화면에만 보이고 저장하지 않아요).' : ''}</p>
    <label class="mklab">단어장 이름<input id="mkname" value="${esc(MK.name)}" maxlength="24" placeholder="예) Day 03 단어"></label>
    <div class="mkrows">${rows}</div>
    <button type="button" class="linkbtn" data-mk="addrow">＋ 단어 추가</button>
    <p class="mkcount">${n}단어${n < MK_MIN ? ` · ${MK_MIN}단어 이상 필요해요` : n > MK_MAX ? ` · ${MK_MAX}단어까지만 만들 수 있어요` : ` · 에피소드 약 ${Math.max(1, Math.round(n / 6))}개`}</p>
    <button type="button" class="startbtn" data-mk="make"${ok ? '' : ' disabled'}>${ICON.play}바로 게임 만들기</button>
    ${mkCanAI() ? `<div class="mkalt"><button type="button" class="btn" data-mk="makeai"${ok ? '' : ' disabled'}>Claude로 이야기·예문까지 만들기 <small>(1~3분)</small></button></div>` : ''}
    <button type="button" class="linkbtn" data-mk="restart">처음으로</button>`;
}
function mkMakingHTML() {
  const items = MK.log.map(l => `<li class="${l.state}"><span>${esc(l.text)}${l.state === 'run' ? '<i class="dotdot" aria-hidden="true"></i>' : ''}</span></li>`).join('');
  return `<div class="mkwait"><div class="spin" aria-hidden="true"></div><p><b>게임을 만들고 있어요</b><br><small>에피소드마다 30초~1분쯤 걸려요. 이 화면을 열어 두세요.</small></p></div>
    <ol class="mklog">${items}</ol>
    <button type="button" class="btn" data-mk="stop">그만두기</button>`;
}
function mkDoneHTML() {
  const d = MK.deck; if (!d) return '';
  const n = Object.keys(d.words).length;
  return `<div class="mkdone"><div class="badge">${badgeSVG('#7CF29C')}<span>완성!</span></div>
    <p><b>${esc(d.name)}</b> — ${n}단어, 에피소드 ${d.scenes.length}개</p>
    <div class="mkthumbs">${d.scenes.map(s => `<div><img src="${'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">${genScene(d.panels[s.key] || [])}</svg>`)}" alt=""><span>${esc(s.title)}</span></div>`).join('')}</div>
    ${MK.saveNote ? `<p class="mksmall">${esc(MK.saveNote)}</p>` : ''}
    <button type="button" class="startbtn" data-mk="play">${ICON.play}이 단어장으로 게임 시작</button>
    <div class="ractions"><button type="button" class="btn" data-mk="art">${ICON.pen}그림 꾸미기</button></div></div>`;
}
function mkLog(text, state = 'run') { MK.log.push({ text, state }); if (!$('#make').hidden) renderMake(); return MK.log.length - 1; }
function mkLogSet(i, state, text) { if (MK.log[i]) { MK.log[i].state = state; if (text) MK.log[i].text = text; } if (!$('#make').hidden) renderMake(); }
function mkBindRows() {
  for (const inp of document.querySelectorAll('#make .mkrow input')) inp.addEventListener('input', () => {
    const i = +inp.closest('.mkrow').dataset.i, r = MK.rows[i]; if (!r) return;
    if (inp.classList.contains('mken')) r.en = inp.value; else { r.ko = inp.value; r.guess = false; }
    if (r.flag) { r.flag = ''; const row = inp.closest('.mkrow'); row.classList.remove('flag'); const g = row.querySelector('.mkguess.bad'); if (g) g.remove(); }
    mkCountOnly();
  });
  const nm = $('#mkname'); if (nm) nm.addEventListener('input', () => { MK.name = nm.value; });
}
function mkCountOnly() {
  const n = mkValidRows().length, c = $('#make .mkcount'), b = $('#make [data-mk="make"]'), b2 = $('#make [data-mk="makeai"]');
  if (b2) b2.disabled = !(n >= MK_MIN && n <= MK_MAX);
  if (c) c.textContent = `${n}단어${n < MK_MIN ? ` · ${MK_MIN}단어 이상 필요해요` : n > MK_MAX ? ` · ${MK_MAX}단어까지만 만들 수 있어요` : ` · 에피소드 약 ${Math.max(1, Math.round(n / 6))}개`}`;
  if (b) b.disabled = !(n >= MK_MIN && n <= MK_MAX);
}
// "영어 - 뜻" 줄들을 단어 목록으로. 번호·글머리표·품사·표(탭) 칸도 정리하고, 못 읽은 줄 수도 셈
const HANGUL = /[가-힣]/, LATIN = /[A-Za-z]/;
function mkParse(text) {
  const rows = []; let skipped = 0;
  for (const raw of String(text || '').split(/\n+/)) {
    let line = raw.replace(/\r/g, '').trim(); if (!line) continue;
    let en = '', ko = '';
    if (line.includes('\t')) {
      // 표에서 복사: 영어 칸(숫자·품사 칸 제외)과 한글 칸
      const cells = line.split('\t').map(c => c.trim()).filter(Boolean);
      en = cells.find(c => LATIN.test(c) && !HANGUL.test(c) && !/^\(?(?:n|v|a|adj|adv|ad|prep|conj)\.?\)?$/i.test(c)) || '';
      ko = cells.find(c => HANGUL.test(c)) || '';
    } else {
      line = line.replace(/^(?:\(?\d{1,3}[.)]?|[①-⑳]|[•·▪■□☐✓✔*\-–—])\s*/, '');
      const m = line.match(/^(.+?)\s+[-–—]\s+(.+)$/) || line.match(/^([^가-힣:=]+?)\s*[:=]\s*(.+)$/) || line.match(/^([^가-힣]+?)\s{2,}(.+)$/);
      if (m && LATIN.test(m[1]) && !HANGUL.test(m[1])) { en = m[1]; ko = m[2]; }
      else {
        const k = line.search(HANGUL), j = line.search(LATIN);
        if (k > 0 && j >= 0 && j < k) { en = line.slice(0, k); ko = line.slice(k); }
        else if (k === 0 && j > 0) { ko = line.slice(0, j); en = line.slice(j); } // 한글이 먼저 나온 줄
      }
    }
    en = mkCleanEn(en); ko = mkCleanKo(ko);
    if (en && ko && LATIN.test(en)) rows.push({ en, ko, pos: 'x' }); else skipped++;
  }
  rows.skipped = skipped;
  return rows;
}
// 같은 단어(대소문자 무시)는 하나로: 뜻이 다르면 합침
function mkDedupe(rows) {
  const at = new Map(), out = [];
  for (const r of rows) {
    const en = mkCleanEn(r.en), k = en.toLowerCase(), ko = mkCleanKo(r.ko);
    if (!en) continue;
    if (at.has(k)) {
      const o = out[at.get(k)], have = o.ko.split(/\s*,\s*/);
      for (const part of ko.split(/\s*,\s*/)) if (part && !have.includes(part)) have.push(part);
      o.ko = have.filter(Boolean).join(', ').slice(0, 60);
      continue;
    }
    at.set(k, out.length);
    out.push({ en, ko, pos: POS_KEYS.includes(r.pos) ? r.pos : 'x', guess: !!r.guess, flag: r.flag || '' });
  }
  return out;
}

