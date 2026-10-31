/* 수채화 삽화: 별도 엔진의 결과만 가져옵니다. 모델이나 이미지 요청을 자동 실행하지 않습니다.
   큰 비트맵은 단어장/localStorage와 분리해 IndexedDB에 저장합니다. */
const StoryArtStore = (() => {
  let opening;
  function open() {
    if (!window.indexedDB) return Promise.reject(new Error('이 브라우저에서는 삽화를 저장할 수 없어요. 일반 브라우저에서 열어 주세요.'));
    if (!opening) opening = new Promise((resolve, reject) => {
      const req = indexedDB.open('voca-story-art-v1', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('scenes', { keyPath: 'key' });
      req.onsuccess = () => { req.result.onversionchange = () => { req.result.close(); opening = null; }; resolve(req.result); };
      req.onerror = () => { opening = null; reject(new Error('삽화 저장소를 열지 못했어요. 브라우저 저장 공간을 확인해 주세요.')); };
      req.onblocked = () => { opening = null; reject(new Error('다른 게임 탭을 닫고 다시 해 주세요.')); };
    });
    return opening;
  }
  async function transaction(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('scenes', mode); let result;
      const req = fn(tx.objectStore('scenes'));
      req.onsuccess = () => { result = req.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () => reject(new Error('삽화를 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.'));
    });
  }
  const key = (deckId, sceneId) => JSON.stringify([deckId, sceneId]);
  return {
    async get(deckId, sceneId) { const row = await transaction('readonly', s => s.get(key(deckId, sceneId))); return row ? row.art : null; },
    put(art) { return transaction('readwrite', s => s.put({ key: key(art.deckId, art.sceneId), art })); },
    remove(deckId, sceneId) { return transaction('readwrite', s => s.delete(key(deckId, sceneId))); }
  };
})();
const STORY_ART = { deckId: null, epoch: 0, cache: new Map(), revisions: new Map(), dialog: null, busy: false, opener: null };

function artDeckSource(deckId) {
  if (deckId === DECK.id) return { name: DECK.name, words: WORDS, scenes: SCENES, panels: (DeckStore.get(deckId) || {}).panels || {} };
  if (deckId === DECK_BUILTIN.id && BUILTIN) return Object.assign({ name: DECK_BUILTIN.name, panels: {} }, BUILTIN);
  const d = DeckStore.get(deckId);
  if (!d) throw new Error('이 단어장을 찾지 못했어요.');
  return Object.assign({ name: d.name, panels: d.panels || {} }, deckRuntime(d));
}
function artMakePlan(deckId, sceneId) {
  const source = artDeckSource(deckId), scene = source.scenes.find(s => s.key === sceneId);
  if (!scene) throw new Error('이 에피소드를 찾지 못했어요.');
  const plain = text => String(text || '').replace(/\{[^|}]+\|([^}]+)\}/g, '$1');
  const story = scene.lines.map(plain).join('\n') || scene.words.map(id => source.words[id].pic || source.words[id].m).join('\n');
  const cast = [];
  const all = story + '\n' + scene.words.map(id => source.words[id].pic || '').join('\n');
  if (/기사/.test(all)) cast.push({ id: 'knight', description: 'An ordinary plain-faced adult MALE knight with a slightly slim wiry build, short tousled chestnut-brown hair, practical worn steel armor over an ivory tunic, a faded olive-green cloak and a RECTANGULAR WOODEN PLANK shield with faint blue-green paint. Neither muscular nor glamorous. Keep the same identity and clothing across this episode. Before the dragon surrenders they are enemies: show distance, concealment or confrontation, never a relaxed friendly meeting.' });
  if (/할아버지/.test(all)) cast.push({ id: 'elder', description: 'A modest elderly MAN advising the council, plain kind face, short gray beard, simple brown cap and wool robe. No glamour or ornate costume.' });
  if (/용[의과을이은에]|용감한 기사|용 버스/.test(all)) cast.push({ id: 'dragon', description: 'A large grey dragon with finely textured scales, curved horns, expressive amber eyes and broad leathery wings. Keep its size, face and markings consistent throughout this episode.' });
  if (!cast.length) cast.push({ id: 'episode-cast', description: 'Use the people or animals named in this story and no unrelated hero. Establish one recognizable design for every recurring character, then retain the same face, silhouette, hair or fur, clothing and proportions throughout the episode.' });
  return VocaImageEngine.normalizePlan({
    format: VocaImageEngine.FORMAT, deckId, sceneId, title: scene.title, story,
    style: VocaImageEngine.STYLE, characters: cast, seed: 1729,
    setting: 'Retain this episode’s actual place and period. Use a detailed storybook watercolor treatment: warm ivory paper, limestone beige, subdued sage and olive, dusty blue-grey, natural soft light and atmospheric distance. When the story is medieval, use stone architecture, a river valley and misty hills. Do not relocate other stories to a castle.',
    words: scene.words.map((id, i) => {
      const w = source.words[id], spec = (source.panels[sceneId] || [])[i];
      return { id, word: shortW(id), meaning: w.m, visual: [plain(w.pic || ''), spec ? 'Original scene description: ' + JSON.stringify(spec) : '', 'Show the meaning through a visible action; replace signs or speech with expressive gestures.'].filter(Boolean).join('\n'), characterIds: cast.map(c => c.id) };
    })
  });
}

// Header dimensions are checked before allocating a decoded bitmap.
function artRasterDimensions(dataUrl) { return VocaImageEngine.rasterDimensions(dataUrl); }
function artDecodeBitmap(dataUrl) {
  const size = artRasterDimensions(dataUrl);
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => { image.src = ''; reject(new Error('그림을 읽는 시간이 너무 오래 걸려요. 더 작은 그림을 골라 주세요.')); }, 15000);
    image.onload = () => { clearTimeout(timer); if (image.naturalWidth !== size.width || image.naturalHeight !== size.height) reject(new Error('그림 크기 정보를 확인할 수 없어요.')); else resolve(size); };
    image.onerror = () => { clearTimeout(timer); reject(new Error('깨진 그림 파일이에요. 다른 PNG·JPEG·WebP 그림을 골라 주세요.')); };
    image.src = dataUrl;
  });
}
function artSceneMarkup(key) {
  const pack = STORY_ART.deckId === DECK.id ? STORY_ART.cache.get(key) : null;
  if (!pack) return ART[key];
  return ART[key] + pack.images.map(im => {
    const w = WORDS[im.wordId];
    if (!w || w.scene !== key || !Array.isArray(w.spot)) return '';
    const [x, y, width, height] = w.spot;
    return `<svg class="watercolor-tile" x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" overflow="hidden"><rect width="100%" height="100%" fill="#ede6d7"/><image href="${im.dataUrl}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/></svg>`;
  }).join('');
}
function artRefreshScene(key) {
  delete TPL[key]; delete IMG[key];
  for (const panel of [SP, PP]) {
    if (!panel || panel.key !== key || !panel.host.isConnected) continue;
    const node = artNode(key); panel.art.replaceWith(node); panel.art = node;
  }
  if (!$('#home').hidden) renderHome();
}
async function artHydrateCurrent() {
  const epoch = ++STORY_ART.epoch, deckId = DECK.id;
  STORY_ART.deckId = deckId; STORY_ART.cache.clear(); STORY_ART.revisions.clear();
  for (const key of SCENES.map(s => s.key)) { delete TPL[key]; delete IMG[key]; }
  const scenes = SCENES.map(s => s.key);
  for (const sceneId of scenes) {
    try {
      const revision = STORY_ART.revisions.get(sceneId) || 0;
      const pack = await StoryArtStore.get(deckId, sceneId);
      if (epoch !== STORY_ART.epoch || DECK.id !== deckId) return;
      if (revision !== (STORY_ART.revisions.get(sceneId) || 0)) continue;
      if (!pack) continue;
      const safe = VocaImageEngine.validateArtPackage(pack, artMakePlan(deckId, sceneId));
      safe.images.forEach(im => artRasterDimensions(im.dataUrl));
      STORY_ART.cache.set(sceneId, safe); artRefreshScene(sceneId);
    } catch (_) { /* 저장소 없음·옛 스토리·깨진 그림: 기존 SVG로 계속 학습 */ }
  }
}
function artReadFile(file, dataUrl = false) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('파일을 읽지 못했어요. 다시 골라 주세요.'));
    if (dataUrl) reader.readAsDataURL(file); else reader.readAsText(file);
  });
}
async function artInstallPackage(input, plan, checkCurrent = () => true) {
  const epoch = STORY_ART.epoch;
  const pack = VocaImageEngine.validateArtPackage(input, plan);
  for (const im of pack.images) await artDecodeBitmap(im.dataUrl);
  if (!checkCurrent()) return false;
  // 읽는 동안 단어장이나 스토리가 바뀌었는지도 검사합니다.
  VocaImageEngine.validateArtPackage(pack, artMakePlan(plan.deckId, plan.sceneId));
  if (DECK.id === pack.deckId) STORY_ART.revisions.set(pack.sceneId, (STORY_ART.revisions.get(pack.sceneId) || 0) + 1);
  await StoryArtStore.put(pack);
  if (DECK.id === pack.deckId && epoch === STORY_ART.epoch && checkCurrent()) {
    // A story can change while IndexedDB is committing. Never display a stale package.
    VocaImageEngine.validateArtPackage(pack, artMakePlan(plan.deckId, plan.sceneId));
    STORY_ART.deckId = DECK.id;
    STORY_ART.cache.set(pack.sceneId, pack); artRefreshScene(pack.sceneId);
  }
  return true;
}
function artDialogMessage(message, error = false) {
  const el = $('#art-message'); if (!el) return;
  el.textContent = message; el.classList.toggle('mkerr', error); el.setAttribute('role', error ? 'alert' : 'status');
}
function artSetBusy(busy) {
  STORY_ART.busy = busy;
  for (const el of document.querySelectorAll('#story-art-dialog button:not([data-art-action="close"]), #story-art-dialog input, #story-art-dialog select')) el.disabled = busy;
  const dialog = $('#story-art-dialog'); if (dialog) dialog.setAttribute('aria-busy', String(busy));
}
async function artShowDialog(deckId, sceneId) {
  let source;
  try { source = artDeckSource(deckId); } catch (e) { toast(e.message); return; }
  if (!sceneId || !source.scenes.some(s => s.key === sceneId)) sceneId = source.scenes[0].key;
  if (SV.on || SV.busy) svPause();
  STORY_ART.opener = document.activeElement;
  const state = { deckId, sceneId };
  STORY_ART.busy = false;
  const scene = source.scenes.find(s => s.key === sceneId);
  const ov = openOverlay(`<div id="story-art-dialog" class="story-art-dialog">
    <div class="art-heading"><h2 id="art-title">수채화 삽화</h2><button type="button" class="iconbtn" data-art-action="close" aria-label="삽화 창 닫기">${ICON.close}</button></div>
    <p class="mksmall">이야기를 따뜻한 종이 질감과 차분한 색감의 그림으로 꾸며요. 준비한 그림은 스토리와 퀴즈에 함께 나와요.</p>
    <label class="mklab">에피소드<select id="art-scene">${source.scenes.map(s => `<option value="${esc(s.key)}"${s.key === sceneId ? ' selected' : ''}>${esc(s.title)}</option>`).join('')}</select></label>
    <p id="art-count" class="mksmall">저장된 삽화를 확인하고 있어요.</p>
    <div class="art-workflow"><b>별도 이미지 엔진에서 만들기</b><p class="mksmall">장면 설계서를 내려받아 컴퓨터에 설치한 이미지 엔진에서 생성한 뒤, 결과 파일을 가져와요. 이 페이지에서는 AI 모델을 실행하지 않아요.</p>
      <div class="art-actions"><button type="button" class="btn" data-art-action="export">1. 장면 설계서 받기</button><label class="btn art-upload">2. 생성한 그림 가져오기<input type="file" accept=".json,.voca-art.json,application/json" data-art-import="1" aria-label="생성한 .voca-art.json 그림 묶음 가져오기"></label></div>
      <details class="mkhelp"><summary>이미지 엔진 준비 방법</summary><p class="mksmall">프로젝트의 image-engine 모듈을 Claude Code에서 실행해요. 로컬 생성에는 별도로 설치한 ComfyUI와 호환 이미지 모델이 필요해요. 아직 설치하지 않았다면 아래에서 갖고 있는 그림을 먼저 넣을 수 있어요. 동일한 그림체·등장인물 지침을 설계서에 담지만 실제 결과는 사용하는 모델에 따라 달라져요.</p></details>
    </div>
    <details class="art-manual"><summary>내 그림을 단어별로 넣기</summary><p class="mksmall">PNG·JPEG·WebP, 그림 하나당 6MB 이하. 선택한 단어의 그림만 바뀌어요.</p><div class="art-word-list">${scene.words.map(id => `<div class="art-word"><span><b>${esc(shortW(id))}</b><small>${esc(source.words[id].m)}</small></span><label class="btn art-upload">그림 선택<input type="file" accept="image/png,image/jpeg,image/webp" data-art-word="${esc(id)}" aria-label="${esc(shortW(id))} 그림 선택"></label></div>`).join('')}</div></details>
    <p id="art-message" class="mksmall" role="status" aria-live="polite"></p>
    <p class="mksmall">삽화는 현재 브라우저에 저장돼요. 다른 기기에서 쓰려면 결과 파일을 다시 가져와 주세요.</p>
    <button type="button" class="linkbtn" data-art-action="clear">이 에피소드의 삽화 지우기</button>
  </div>`);
  STORY_ART.dialog = state;
  const sheet = $('.sheet', ov); sheet.setAttribute('aria-labelledby', 'art-title');
  $('#art-scene').focus({ preventScroll: true });
  try {
    const pack = await StoryArtStore.get(deckId, sceneId);
    if (STORY_ART.dialog !== state || !$('#story-art-dialog')) return;
    let count = 0;
    try { if (pack) count = VocaImageEngine.validateArtPackage(pack, artMakePlan(deckId, sceneId)).images.length; } catch (_) { }
    $('#art-count').textContent = `삽화 ${count}/${scene.words.length}장 · 비어 있는 단어는 기본 그림으로 보여요.`;
  } catch (e) { if (STORY_ART.dialog === state) { $('#art-count').textContent = '삽화 저장소를 사용할 수 없어요.'; artDialogMessage(e.message, true); } }
}
function artCloseDialog() {
  STORY_ART.dialog = null; STORY_ART.busy = false; closeOverlay();
  if (STORY_ART.opener && STORY_ART.opener.isConnected) STORY_ART.opener.focus({ preventScroll: true });
}
function artDownloadPlan(plan) {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = plan.sceneId.replace(/[^a-z0-9_-]/gi, '_') + '.voca-plan.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function artHandleFile(input) {
  const state = STORY_ART.dialog, file = input.files && input.files[0];
  if (!state || !file || STORY_ART.busy) return;
  const current = () => STORY_ART.dialog === state && !!$('#story-art-dialog');
  artSetBusy(true); artDialogMessage('그림 파일을 확인하고 있어요.');
  try {
    const plan = artMakePlan(state.deckId, state.sceneId); let pack;
    if (input.dataset.artWord) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > VocaImageEngine.MAX_IMAGE_BYTES) throw new Error('6MB 이하 PNG·JPEG·WebP 그림을 골라 주세요.');
      const dataUrl = await artReadFile(file, true), wordId = input.dataset.artWord;
      const stored = await StoryArtStore.get(state.deckId, state.sceneId); let images = [];
      try { if (stored) images = VocaImageEngine.validateArtPackage(stored, plan).images; } catch (_) { }
      pack = { format: VocaImageEngine.ART_FORMAT, deckId: plan.deckId, sceneId: plan.sceneId, sourceFingerprint: VocaImageEngine.sourceFingerprint(plan), style: VocaImageEngine.STYLE, images: [...images.filter(im => im.wordId !== wordId), { wordId, dataUrl, prompt: '', seed: null }] };
    } else {
      if (file.size > VocaImageEngine.MAX_PACKAGE_BYTES) throw new Error('그림 묶음은 50MB 이하 파일을 골라 주세요.');
      const raw = await artReadFile(file);
      try { pack = JSON.parse(raw); } catch (_) { throw new Error('그림 묶음을 읽지 못했어요. .voca-art.json 파일을 골라 주세요.'); }
    }
    const installed = await artInstallPackage(pack, plan, current);
    if (installed && current()) {
      $('#art-count').textContent = `삽화 ${pack.images.length}/${plan.words.length}장 · 스토리와 퀴즈에 적용했어요.`;
      artDialogMessage('삽화를 저장했어요. 창을 닫으면 적용된 그림을 볼 수 있어요.');
    }
  } catch (e) { if (current()) artDialogMessage(e.message || '그림을 가져오지 못했어요.', true); }
  finally { if (current()) { artSetBusy(false); input.value = ''; } }
}
function bindStoryArt() {
  document.addEventListener('click', async e => {
    const entry = e.target.closest('[data-story-art]');
    if (entry) { artShowDialog(entry.dataset.storyArt || DECK.id, entry.dataset.scene); return; }
    const button = e.target.closest('[data-art-action]');
    if (!button) return;
    const action = button.dataset.artAction, state = STORY_ART.dialog;
    if (action === 'close') { artCloseDialog(); return; }
    if (!state || STORY_ART.busy) return;
    if (action === 'export') {
      try { artDownloadPlan(artMakePlan(state.deckId, state.sceneId)); artDialogMessage('설계서를 내려받았어요. 별도 이미지 엔진에서 생성한 .voca-art.json 파일을 가져와 주세요.'); } catch (error) { artDialogMessage(error.message, true); }
    } else if (action === 'clear') {
      if (!button.dataset.armed) { button.dataset.armed = '1'; button.textContent = '한 번 더 누르면 삽화를 지우고 기본 그림으로 돌아가요'; return; }
      artSetBusy(true);
      const epoch = STORY_ART.epoch;
      try {
        if (DECK.id === state.deckId) STORY_ART.revisions.set(state.sceneId, (STORY_ART.revisions.get(state.sceneId) || 0) + 1);
        await StoryArtStore.remove(state.deckId, state.sceneId);
        if (DECK.id === state.deckId && STORY_ART.epoch === epoch) { STORY_ART.cache.delete(state.sceneId); artRefreshScene(state.sceneId); }
        if (STORY_ART.dialog === state && $('#story-art-dialog')) { $('#art-count').textContent = '기본 그림을 사용하고 있어요.'; artDialogMessage('이 에피소드의 삽화를 지웠어요. 학습 기록은 그대로예요.'); button.textContent = '이 에피소드의 삽화 지우기'; delete button.dataset.armed; }
      } catch (error) { if (STORY_ART.dialog === state) artDialogMessage(error.message, true); }
      finally { if (STORY_ART.dialog === state) artSetBusy(false); }
    }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'art-scene' && STORY_ART.dialog) { artShowDialog(STORY_ART.dialog.deckId, e.target.value); return; }
    if (e.target.matches('[data-art-import], [data-art-word]')) artHandleFile(e.target);
  });
  document.addEventListener('keydown', e => {
    const dialog = $('#story-art-dialog'); if (!dialog) return;
    if (e.key === 'Escape') { e.preventDefault(); artCloseDialog(); return; }
    if (e.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('button:not(:disabled), select:not(:disabled), input:not(:disabled), summary')].filter(el => el.getClientRects().length);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

