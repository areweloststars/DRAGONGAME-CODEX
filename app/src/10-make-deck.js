/* ---------- 2) 게임 만들기 ---------- */
// 뜻 하나(화면에 보일 말) → 정답으로 인정할 말들: 앞의 '~을/~에' 빼기, 어간('열망하는'→'열망'), 기본형('짧은'→'짧다')
function mkForms(t) {
  const base = String(t || '').replace(IPA_TOK, ' ').replace(POS_TOK, ' ').replace(/\s+/g, ' ').trim();
  const noParen = base.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const core = noParen.replace(/^~?\s*(?:을|를|에게|에서|에|와|과|의|으로|로|이|가)\s+/, '').replace(/~/g, '').trim();
  const out = [base, noParen, core];
  let m;
  if ((m = core.match(/^(.{2,}?)(하다|하는|한|하게|해서|했다|함)$/))) out.push(m[1], m[1] + '하다');
  else if ((m = core.match(/^(.+?)(적인|적으로)$/))) out.push(m[1] + '적', m[1]);
  else if ((m = core.match(/^(.{2,})의$/))) out.push(m[1]);
  else if ((m = core.match(/^(.+?)[은는]$/))) out.push(m[1] + '다');
  else if ((m = core.match(/^(.{2,})다$/))) out.push(m[1]);
  // 괄호 속 말뿐인 뜻('(감탄사)')도 칠 수 있게
  if (!out.some(x => norm(x))) out.push(base.replace(/[()]/g, ''));
  return out;
}
// 뜻 묶음 정리: [{t: 화면에 보일 뜻, ok: [인정할 말…]}]. 같은 말이 두 칸에 들어가지 않게 (겹치는 말은 게임에서 긴 말부터 자리를 차지)
function mkAnsFrom(raw, ko) {
  const str = x => typeof x === 'string' ? x.trim() : '';
  let groups = Array.isArray(raw) ? raw.filter(g => Array.isArray(g) && g.length).map(g => g.map(str).filter(Boolean)).filter(g => g.length) : [];
  if (!groups.length) groups = String(ko || '').replace(/\([^)]*\)/g, m => m.replace(/[,，;/]/g, ' ')).split(/[,，;/]/).map(t => t.trim()).filter(Boolean).map(t => [t]);
  let out = groups.slice(0, 4).map(g => {
    const t = g[0].replace(IPA_TOK, ' ').replace(POS_TOK, ' ').replace(/\s+/g, ' ').trim().slice(0, 24) || g[0].slice(0, 24);
    const t0 = norm(mkForms(t).find(x => norm(x)) || '');
    // 한 글자짜리 다른 표현은 너무 쉽게 맞아서 뺌 (화면에 보일 뜻 자체는 그대로)
    const ok = [...new Set([...mkForms(t), ...g.slice(1)].map(norm).filter(a => a && (a.length >= 2 || a === t0)))];
    return { t, ok, t0 };
  }).filter(g => g.ok.length);
  // 다른 묶음과 똑같은 말은 그 말이 '화면에 보일 뜻'인 묶음(없으면 먼저 나온 묶음)에만 남김
  out = out.map((g, i) => ({ t: g.t, ok: g.ok.filter(a => !out.some((h, j) => j !== i && h.ok.includes(a) && (h.t0 === a ? g.t0 !== a || j < i : g.t0 !== a && j < i))) }))
    .filter(g => g.ok.length);
  return out;
}
const MK_EMOJI = { n: '📦', v: '🏃', a: '✨', d: '⏩', p: '💬', x: '📘' };
// 에피소드 하나를 앱이 쓰는 모양으로 (자막의 {단어|뜻} 표시 확인·보정 포함)
function mkEpisode(key, title, epWords, rows, res) {
  const byLow = Object.create(null); for (const id of epWords) byLow[id.toLowerCase()] = id;
  const words = {}, order = [], used = new Set();
  // 글줄만, 너무 긴 줄은 뺌
  let lines = Array.isArray(res && res.lines) ? res.lines.filter(l => typeof l === 'string').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l && l.length <= 140).slice(0, 14) : [];
  // 한 줄에 단어 표시는 하나만, 이 에피소드 단어만. 표시 밖에 남은 { } | 글자는 지움
  lines = lines.map(line => {
    let got = false, out = '', last = 0;
    const re = /\{([^{|}]+)\|([^{|}]+)\}/g;
    const clean = x => x.replace(/[{}|]/g, '');
    for (let m; (m = re.exec(line));) {
      out += clean(line.slice(last, m.index)); last = re.lastIndex;
      const real = byLow[String(m[1]).trim().toLowerCase()], t = clean(m[2]).trim();
      if (!real || got || used.has(real) || !t) { out += t; continue; }
      got = true; used.add(real); order.push(real); out += `{${real}|${t}}`;
    }
    return (out + clean(line.slice(last))).trim();
  }).filter(Boolean);
  if (!lines.length) lines.push(`${title}! 이제 단어를 만나 볼까요?`);
  // 이야기에 빠진 단어는 마지막 마무리 줄(단어 없는 줄)들 앞에 넣음
  let ins = lines.length;
  while (ins > 1 && !/\{[^|}]+\|[^}]+\}/.test(lines[ins - 1])) ins--;
  if (ins === 1 && !/\{[^|}]+\|[^}]+\}/.test(lines[0])) ins = lines.length > 1 ? 1 : lines.length;
  for (const id of epWords) if (!used.has(id)) { lines.splice(ins++, 0, `잊지 말아야 할 단어: {${id}|${rows[id].ko.split(',')[0].trim()}}!`); order.push(id); used.add(id); }
  const info = (res && res.words && typeof res.words === 'object' && !Array.isArray(res.words)) ? res.words : {};
  const infoLow = Object.create(null); for (const k of Object.keys(info)) if (info[k] && typeof info[k] === 'object') infoLow[k.toLowerCase()] = info[k];
  const sstr = (v, n) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '';
  const specs = [];
  for (const id of order) {
    const r = rows[id], w = infoLow[id.toLowerCase()] || {};
    let ans = mkAnsFrom(w.ans, r.ko);
    if (!ans.length) ans = mkAnsFrom(null, r.ko);
    if (!ans.length) continue;
    words[id] = {
      ipa: sstr(w.ipa, 60).replace(/^\/|\/$/g, ''), kr: sstr(w.kr, 30), pos: POS_KEYS.includes(w.pos) ? w.pos : r.pos,
      // Claude가 뜻을 정리해 줬으면(사진 글자 오류를 고친 것) 그 뜻을 화면·복습 음성에 씀
      m: w.ans && ans.length ? ans.map(g => g.t).join(', ') : r.ko, ans: ans.map(g => ({ t: g.t, ok: g.ok })),
      tip: sstr(w.tip, 160), ex: sstr(w.ex, 160), exKo: sstr(w.exKo, 160),
      pic: sstr(w.pic, 140) || `‘${id}’을(를) 떠올리게 하는 그림이에요.`,
      say: id.replace(/ A to-v$/, '').replace(/ ~$/, '')
    };
    // 그림 칸 설계가 없으면 이모지 + 영어 단어 (정답 뜻을 그림에 쓰지 않음)
    const panel = w.panel && typeof w.panel === 'object' ? w.panel : mkAutoPanel(id, r.ko, words[id].pos, mkPicN++);
    const spec = typeof genNormalize === 'function' ? genNormalize(panel) : panel;
    specs.push(spec);
  }
  return { scene: { key, title: String(title || '에피소드').slice(0, 24), words: order.filter(id => words[id]), lines }, words, specs };
}
function mkChunk(list, size = 6) {
  const k = Math.max(1, Math.round(list.length / size)), out = [];
  for (let i = 0; i < k; i++) out.push(list.slice(Math.round(i * list.length / k), Math.round((i + 1) * list.length / k)));
  return out.filter(x => x.length);
}
async function mkMake() {
  const rows0 = mkValidRows();
  if (rows0.length < MK_MIN || rows0.length > MK_MAX) {
    MK.err = rows0.length < MK_MIN ? `쓸 수 있는 단어가 ${rows0.length}개예요. ${MK_MIN}단어 이상 필요해요 (같은 단어는 하나로 쳐요).` : `${MK_MAX}단어까지만 만들 수 있어요.`;
    renderMake(); return;
  }
  MK.err = ''; MK.log = []; MK.step = 'making'; MK.saveNote = ''; mkPicN = 0;
  const storySeed = Math.floor(Math.random() * SF.length);
  const ctl = MK.ctl = new AbortController(), id = 'u' + Date.now().toString(36);
  const rows = Object.create(null); for (const r of rows0) rows[r.en] = r;
  // Claude를 더 부를 수 없는 오류(허락 안 됨·로그인 끝남·사용량 초과)가 나면 남은 에피소드는 부르지 않고 간단하게
  let aiOff = '';
  const STOP = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'session_expired', 'rate_limited'];
  const noteErr = e => { if (e && STOP.includes(e.code)) aiOff = mkErrText(e) || aiOff || 'Claude를 쓸 수 없어요.'; };
  const list = rows0.map(r => `- ${r.en} | ${r.ko} | ${r.pos}`).join('\n');
  const deck = { v: 1, id, name: mkCleanKo(MK.name) || `사진 단어장 ${new Date().getMonth() + 1}/${new Date().getDate()}`, created: Date.now(), updated: Date.now(), source: MK.images.length ? 'photo' : 'text', words: {}, scenes: [], panels: {} };
  renderMake();
  try {
    let plan = null;
    if (MK.useAI && mkCanAI()) {
      const li = mkLog('단어를 이야기 에피소드로 나누는 중');
      try {
        plan = await MK.sample.json(`너는 한국 학생이 지하철에서 하는 영어 단어 게임의 이야기 작가야. 아래 단어 ${rows0.length}개로 '에피소드'를 만들 거야.
1) 단어를 4~7개씩 묶어 에피소드로 나눠(에피소드 수는 약 ${Math.max(1, Math.round(rows0.length / 6))}개). 모든 단어를 정확히 한 번씩, 철자 그대로 써.
2) 에피소드마다 누구나 아는 이야기(명작 동화, 영웅담, 전래 동화, 유명 소설, 신화)나 웃긴 상황을 비틀어 코믹하고 긍정적이며 건전하고 기억에 잘 남는 이야기 주제를 정해. 에피소드마다 다른 이야기로.
3) 에피소드 안 단어 순서는 이야기에 등장할 순서로.
단어 (영어 | 뜻 | 품사):
${list}
JSON으로만 답해. 형식: {"deckName": "단어장 이름(12자 이내)", "episodes": [{"title": "에피소드 제목(14자 이내)", "theme": "어떤 이야기를 어떻게 비트는지 한 문장", "words": ["영어 단어", "..."]}]}`, { signal: ctl.signal, modelTier: 'default' });
        mkLogSet(li, 'ok', '에피소드 나누기 완료');
      } catch (e) {
        if (e && e.code === 'cancelled') throw e;
        noteErr(e);
        mkLogSet(li, 'warn', '자동 나누기가 안 돼서 순서대로 나눴어요');
        plan = null;
      }
    }
    // 계획 확인: 빠진 단어는 마지막 에피소드에, 없는 단어는 버림
    let eps = [];
    if (plan && Array.isArray(plan.episodes)) {
      const low = Object.create(null); for (const r of rows0) low[r.en.toLowerCase()] = r.en;
      const used = new Set();
      for (const ep of plan.episodes) {
        const ws = (Array.isArray(ep && ep.words) ? ep.words : []).map(w => typeof w === 'string' ? low[w.trim().toLowerCase()] : undefined).filter(w => w && !used.has(w));
        ws.forEach(w => used.add(w));
        if (ws.length) eps.push({ title: (typeof ep.title === 'string' && mkCleanKo(ep.title)) || '에피소드', theme: typeof ep.theme === 'string' ? ep.theme.slice(0, 200) : '', words: ws.slice(0, 8), rest: ws.slice(8) });
      }
      const extra = eps.flatMap(e => e.rest).concat(rows0.map(r => r.en).filter(w => !used.has(w)));
      for (const part of mkChunk(extra)) eps.push({ title: '보너스 이야기', theme: '앞 이야기의 주인공들이 다시 모이는 웃긴 후일담', words: part });
      if (typeof plan.deckName === 'string' && !mkCleanKo(MK.name)) deck.name = mkCleanKo(plan.deckName).slice(0, 24) || deck.name;
    }
    if (!eps.length) eps = mkChunk(rows0.map(r => r.en)).map((ws, i) => ({ title: `단어 미션 ${i + 1}`, theme: '', words: ws }));
    // 너무 작은 에피소드(1~2단어)는 앞 에피소드와 합침(최대 8단어)
    for (let i = eps.length - 1; i > 0; i--) if (eps[i].words.length < 3 && eps[i - 1].words.length + eps[i].words.length <= 8) { eps[i - 1].words.push(...eps[i].words); eps.splice(i, 1); }
    for (let k = 0; k < eps.length; k++) {
      const ep = eps[k], key = `${id}-e${k + 1}`;
      let res = null;
      if (MK.useAI && mkCanAI() && !aiOff) {
        const li = mkLog(`에피소드 ${k + 1}/${eps.length} ‘${ep.title}’ 이야기·그림 만드는 중`);
        const wl = ep.words.map(w => `- ${w} | ${rows[w].ko} | ${rows[w].pos}`).join('\n');
        try {
          res = await MK.sample.json(`너는 한국 학생용 영어 단어 게임의 이야기 작가이자 그림 연출가야.
에피소드 제목: "${ep.title}"${ep.theme ? `\n이야기 주제: ${ep.theme}` : ''}
단어 (영어 | 교재 뜻 | 품사) — 이 순서대로 이야기에 한 번씩 등장:
${wl}

다음을 JSON으로만 만들어.
A. "lines": 이야기 자막 ${Math.min(9, ep.words.length + 2)}줄 안팎(한국어, 한 줄 45자 이내). 첫 줄은 이야기 시작(단어 없이). 그다음 줄부터 위 단어를 순서대로 한 줄에 정확히 하나씩 {영어단어|문장 속 한국어 뜻 표현} 모양으로 넣어(예: "새 왕은 무료 간식법을 {implement|시행했답니다}!"). 표시 안의 영어 단어는 위 철자 그대로. 마지막에 단어 없는 웃긴 마무리 한 줄을 넣어도 돼. 코믹하고 따뜻하고 건전하게, 장면이 눈에 그려지게.
B. "words": 단어마다 객체 하나(키는 영어 단어 그대로):
 - "ipa": 미국식 발음기호(슬래시 없이), "kr": 한글 발음, "pos": n|v|a|d|p|x
 - "ans": 뜻 묶음 배열. 교재 뜻은 사진 글자 인식으로 읽은 것이라 깨진 글자(없는 낱말, 이상한 글자)가 섞일 수 있어. 깨져 보이면 그 영어 단어의 올바른 한국어 뜻으로 바로잡아. 교재 뜻을 쉼표로 나눈 뜻 하나가 묶음 하나(괄호 속 말은 설명이니 묶음으로 나누지 마). 묶음 = [화면에 보일 뜻, 학생이 칠 만한 다른 표현들(어간, 띄어쓰기만 다른 형태, 아주 가까운 동의어)]. 예: [["시행하다","시행"],["실행하다","실행"]]. 다른 묶음의 말이 서로 포함되지 않게.
 - "tip": 외우기 팁(어원이나 연상, 한국어 한 문장), "ex": 쉬운 영어 예문(단어를 [대괄호]로 감싸), "exKo": 예문 해석
 - "panel": 이 단어의 그림 칸 설계(아래 형식). 한 칸 = 이야기의 그 장면, 주인공 하나를 크게. "sign"은 장면 속 표지판·대사처럼 뜻을 떠올리게 하는 말(한국어 2줄 이내, 줄당 9자 이내). 정답 뜻을 그대로 쓰지는 마.
 - "pic": 그 그림 칸에 무엇이 있고 왜 이 뜻인지 1~2문장(90자 이내, 한국어)
그림 칸 형식 설명:
${typeof GEN_SPEC_DOC === 'string' ? GEN_SPEC_DOC : ''}

답 형식 예: {"lines": ["..."], "words": {"implement": {"ipa": "ˈɪmplɪment", "kr": "임플러멘트", "pos": "v", "ans": [["시행하다","시행"],["실행하다","실행"]], "tip": "...", "ex": "The city will [implement] the plan.", "exKo": "...", "panel": {}, "pic": "..."}}}`, { signal: ctl.signal, modelTier: 'default' });
          mkLogSet(li, 'ok', `에피소드 ${k + 1} ‘${ep.title}’ 완성`);
        } catch (e) {
          if (e && e.code === 'cancelled') throw e;
          noteErr(e);
          mkLogSet(li, 'warn', `에피소드 ${k + 1}: 자동 만들기가 안 돼서 간단하게 만들었어요`);
          res = null;
        }
      }
      if (!res) {
        // Claude 없이: 단어마다 한 줄, 그림 칸에는 뜻 힌트
        // Claude 없이: 이야기 틀로 바로 (에피소드마다 다른 이야기)
        res = mkStory(ep.words, rows, storySeed + k);
        ep.title = res.title;
      }
      const out = mkEpisode(key, ep.title, ep.words, rows, res);
      deck.scenes.push(out.scene); Object.assign(deck.words, out.words); deck.panels[key] = out.specs;
    }
    deck.scenes = deck.scenes.filter(sc => sc.words.length);
    if (!deck.scenes.length) throw { code: 'empty_completion' };
    const saved = await DeckStore.put(deck);
    MK.saveNote = (aiOff ? `Claude를 쓸 수 없어서 일부 에피소드는 이야기 없이 간단하게 만들었어요. (${aiOff}) ` : '') + (MK.useAI ? '' : '이야기와 그림은 이 기기에서 바로 만들었어요. 그림은 ‘그림 꾸미기’에서 바꿀 수 있어요. ') +
      (saved.cloud ? '내 Claude 계정에도 저장했어요. 다른 기기에서 이 앱을 열어도 보여요.' : saved.local ? '이 기기에 저장했어요.' : '저장 공간이 없어 이번 방문 동안만 쓸 수 있어요.');
    MK.deck = deck; MK.step = 'done'; MK.images.forEach(im => URL.revokeObjectURL(im.url)); MK.images = []; MK.rows = []; MK.name = ''; MK.paste = ''; MK.note = '';
    Sound.play('project');
    voiceWarm(); // 게임을 열기 전에 목소리를 미리 준비
    // 만드는 동안 다른 화면에 가 있었으면 다 됐다고 알려 줌
    if ($('#make').hidden) toast(`‘${deck.name}’ 단어장이 완성됐어요! 홈 위 단어장 단추에서 골라요`);
  } catch (e) {
    MK.step = 'review'; MK.err = mkErrText(e) || '만들기를 멈췄어요.';
    if ($('#make').hidden && e && e.code !== 'cancelled') toast('단어장을 만들지 못했어요. ‘사진 찍어 새 단어장 만들기’를 다시 눌러 확인해 주세요');
  }
  if (!$('#make').hidden) renderMake();
}

/* ---------- 이벤트 ---------- */
function bindMake() {
  const el = $('#make');
  // 직접 입력한 단어 목록은 화면이 다시 그려져도 남게
  el.addEventListener('input', e => {
    if (e.target.id === 'mkpaste') MK.paste = e.target.value;
    else if (e.target.id === 'arsign' && MK.art && MK.art.spec) { MK.art.spec.sign = e.target.value; arPreview(); }
    else if (e.target.id === 'aremo' && MK.art && MK.art.spec && e.target.value.trim()) { const sp = genNormalize({ subject: { kind: 'emoji', emoji: e.target.value } }); if (sp.subject.emoji !== '⭐' || e.target.value.includes('⭐')) { MK.art.spec.subject = sp.subject; arPreview(); } }
  });
  el.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('mkpaste')) MK.pasteOpen = e.target.open; }, true);
  // 사진 붙여넣기 (파일 고르기 창이 안 열리는 앱 화면에서도 됨)
  el.addEventListener('paste', e => {
    if (MK.step !== 'pick' || e.target.id === 'mkpaste') return;
    const files = Array.from((e.clipboardData && e.clipboardData.files) || []).filter(f => /^image\//.test(f.type));
    if (!files.length) { if (e.target.id === 'mkdrop') { const t = e.clipboardData && e.clipboardData.getData('text'); e.preventDefault(); if (t && t.trim()) { MK.paste = (MK.paste ? MK.paste + '\n' : '') + t.trim(); MK.pasteOpen = true; renderMake(); toast('붙여넣은 글자를 아래 입력 칸에 넣었어요'); } else toast('사진을 찾지 못했어요. 갤러리에서 사진을 ‘복사’한 뒤 붙여넣어 주세요'); } return; }
    e.preventDefault();
    for (const file of files) { if (MK.images.length >= OCR_MAX) break; MK.images.push({ file, url: URL.createObjectURL(file) }); }
    MK.err = ''; renderMake(); toast(`사진 ${files.length}장을 넣었어요`);
  });
  el.addEventListener('beforeinput', e => { if (e.target.id === 'mkdrop' && !/paste/i.test(e.inputType || '')) e.preventDefault(); });
  el.addEventListener('change', e => {
    const f = e.target.closest('[data-mkfile]'); if (!f) return;
    const max = OCR_MAX;
    for (const file of Array.from(f.files || [])) { if (MK.images.length >= max) break; MK.images.push({ file, url: URL.createObjectURL(file) }); }
    f.value = ''; MK.err = ''; renderMake();
  });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-mk]'); if (!b) return;
    const a = b.dataset.mk;
    Sound.unlock();
    if (a.startsWith('ar') && a !== 'arpick' && a !== 'ardone' && a !== 'arcancel' && a !== 'arsave' && MK.art && MK.art.spec) { arAct(a, b.dataset.v || ''); const y = window.scrollY; renderMake(); window.scrollTo(0, y); return; }
    if (a === 'home') { if (MK.step === 'reading' || MK.step === 'making') { toast('만드는 중이에요. 다 만들면 알려 드릴게요'); } goHome(); }
    else if (a === 'rmimg') { const i = +b.dataset.i, im = MK.images[i]; if (im) { URL.revokeObjectURL(im.url); MK.images.splice(i, 1); } renderMake(); }
    else if (a === 'read') mkRead();
    else if (a === 'stop') { if (MK.step === 'reading') { ocrStop(); MK.step = 'pick'; renderMake(); } else if (MK.ctl) MK.ctl.abort(); }
    else if (a === 'art') { if (MK.deck) openArt(MK.deck.id); }
    else if (a === 'arpick') { const d = arDeck(); if (!d) return; const key = b.dataset.key, k = +b.dataset.k; MK.art.sel = { key, k }; MK.art.spec = genNormalize(JSON.parse(JSON.stringify(((d.panels || {})[key] || [])[k] || {}))); renderMake(); window.scrollTo(0, 0); }
    else if (a === 'arcancel') { MK.art.sel = null; MK.art.spec = null; renderMake(); }
    else if (a === 'arsave') arSave();
    else if (a === 'ardone') { const back = MK.art && MK.art.back; MK.art = null; if (back === 'done' && MK.deck) { MK.step = 'done'; renderMake(); window.scrollTo(0, 0); } else { MK.step = 'pick'; goHome(); } }
    else if (a === 'parse') {
      MK.paste = ($('#mkpaste') || {}).value || '';
      const parsed = mkParse(MK.paste), rows = mkDedupe(parsed);
      if (!rows.length) { MK.err = '‘영어 - 뜻’ 모양의 줄을 찾지 못했어요.'; renderMake(); return; }
      MK.note = [parsed.skipped ? `읽지 못한 줄 ${parsed.skipped}개는 뺐어요.` : '', rows.length > MK_MAX ? `단어가 많아서 앞의 ${MK_MAX}개만 가져왔어요.` : ''].filter(Boolean).join(' ');
      MK.rows = rows.slice(0, MK_MAX); MK.err = ''; MK.step = 'review'; voiceWarm(); renderMake();
    }
    else if (a === 'rmrow') { MK.rows.splice(+b.dataset.i, 1); renderMake(); }
    else if (a === 'addrow') { MK.rows.push({ en: '', ko: '', pos: 'x' }); renderMake(); const ins = document.querySelectorAll('#make .mken'); if (ins.length) ins[ins.length - 1].focus(); }
    else if (a === 'make' || a === 'makeai') { const nm = $('#mkname'); if (nm) MK.name = nm.value; MK.useAI = a === 'makeai'; mkMake(); }
    else if (a === 'restart') { MK.step = 'pick'; MK.rows = []; MK.err = ''; MK.note = ''; renderMake(); }
    else if (a === 'play') { const d = MK.deck; MK.step = 'pick'; MK.deck = null; if (d) switchDeck(d.id); goHome(); }
  });
}

/* ---------- 단어장 고르기 (홈 위쪽 단추) ---------- */
function openDecks() {
  const decks = DeckStore.list();
  const row = (id, name, n, eps, cur, builtin) => `<li class="${cur ? 'cur' : ''}"><button type="button" class="deckpick" data-deck="${esc(id)}"><b>${esc(name)}</b><small>${n}단어 · 에피소드 ${eps}개${builtin ? ' · 기본' : ''}${cur ? ' · <em>지금 쓰는 중</em>' : ''}</small></button>${builtin ? '' : `<button type="button" class="deckart" data-deckart="${esc(id)}" aria-label="${esc(name)} 그림 꾸미기">${ICON.pen}</button><button type="button" class="deckdel" data-deckdel="${esc(id)}" aria-label="${esc(name)} 지우기">${ICON.close}</button>`}</li>`;
  openOverlay(`<h2>단어장</h2>
    <ul class="decklist">
      ${row(DECK_BUILTIN.id, DECK_BUILTIN.name, Object.keys(BUILTIN.words).length, BUILTIN.scenes.length, DECK.id === DECK_BUILTIN.id, true)}
      ${decks.map(d => row(d.id, d.name, Object.keys(d.words || {}).length, (d.scenes || []).length, DECK.id === d.id, false)).join('')}
    </ul>
    <div class="ractions"><button type="button" class="btn good" data-ov="make">${ICON.camera}사진으로 새 단어장 만들기</button><button type="button" class="btn" data-ov="close">닫기</button></div>`);
}

