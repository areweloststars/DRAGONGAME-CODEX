/* ---------- 확대되는 그림 패널 ----------
   그림(800×500 SVG)은 한 번만 그려 두고, 확대·이동은 CSS transform 전환으로 해요.
   매 프레임 그림을 다시 그리지 않아서 느린 휴대폰에서도 화면 전환이 빨라요. */
const EZ = { out: 'cubic-bezier(.22, 1, .36, 1)', inout: 'cubic-bezier(.65, 0, .35, 1)' };
// 장면 그림은 한 번만 읽어 두고 복사해서 씀 (스토리 → 미션으로 넘어갈 때 다시 읽지 않음)
const TPL = {};
function artNode(key) {
  let t = TPL[key];
  if (!t) { t = TPL[key] = document.createElementNS('http://www.w3.org/2000/svg', 'g'); t.setAttribute('class', 'art'); t.innerHTML = artSceneMarkup(key); }
  return t.cloneNode(true);
}
class Panel {
  constructor(host, opt = {}) {
    this.host = host;
    host.classList.add('panel');
    host.innerHTML = `<div class="cam"><svg class="scene" viewBox="0 0 800 500" width="800" height="500" aria-hidden="true" focusable="false"><g class="art"></g></svg></div><svg class="fxo" aria-hidden="true" focusable="false"><g class="fx"></g></svg><div class="speed" aria-hidden="true">${SPEED_SVG}</div><div class="ptag" hidden></div>${opt.zoomToggle ? '<div class="pcap" hidden></div><button class="zbtn" type="button" data-act="zoom" hidden></button>' : ''}`;
    this.cam = $('.cam', host); this.svg = $('.scene', host); this.art = $('.art', host); this.fx = $('.fx', host);
    this.speed = $('.speed', host); this.tag = $('.ptag', host); this.zbtn = $('.zbtn', host); this.cap = $('.pcap', host);
    this.opt = opt; this.vb = [0, 0, 800, 500]; this.h = 0; this.key = null; this.tm = 0; this.tok = 0; this.current = null; this.fs = false;
  }
  width() { return this.host.clientWidth || Math.min(448, window.innerWidth - 38); }
  baseH() { return this.fs || this.opt.fluid ? (this.host.clientHeight || Math.round(this.width() * .625)) : Math.round(this.width() * .625); }
  revealH() { if (this.opt.fluid) return this.baseH(); if (this.opt.tallH) return this.opt.tallH(this); const w = this.width(), b = this.baseH(); return Math.round(Math.min(w * .95, Math.max(b + 44, window.innerHeight * .42))); }
  setScene(key) {
    if (this.key === key) return false;
    this.key = key;
    const g = artNode(key); this.art.replaceWith(g); this.art = g;
    this.clearFocus(); return true;
  }
  setH(h, dur = 0, ease = EZ.out) {
    this.h = h;
    if (this.opt.fluid) return; // 높이는 화면 배치가 정함
    const st = this.host.style;
    st.transition = dur ? `height ${dur}ms ${ease}` : 'none';
    st.height = h.toFixed(1) + 'px';
  }
  // 그림 좌표의 영역 v=[x, y, w, h]를 칸에 꽉 차게 보여 줄 때의 배율과 위치
  view(v, w = this.width(), h = this.h || this.baseH()) {
    const s = Math.max(w / v[2], h / v[3]);
    return { s, x: (w - v[2] * s) / 2 - v[0] * s, y: (h - v[3] * s) / 2 - v[1] * s };
  }
  setVB(v, dur = 0, ease = EZ.out) {
    this.vb = v.slice();
    const t = this.view(v), st = this.cam.style;
    st.transition = dur ? `transform ${dur}ms ${ease}` : 'none';
    st.transform = `translate(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px) scale(${t.s.toFixed(5)})`;
  }
  // 보이는 영역의 최대 크기: 평소엔 그림이 칸을 꽉 채우고, 전체화면에선 그림 전체가 들어오게
  maxV(w, h) { const A = w / h; return (A >= 1.6) !== this.fs ? [800, 800 / A] : [500 * A, 500]; }
  // 그림 밖으로 나가지 않게 (그림보다 크면 가운데 정렬)
  place(v) {
    let [x, y, vw, vh] = v;
    if (!this.fs) { vw = Math.min(vw, 800); vh = Math.min(vh, 500); }
    // 전체화면에서 보기가 그림보다 높으면(세로 화면) 위아래 빈 곳으로 옮길 수 있게 (자막 자리를 비우려고)
    // (전체화면에서는 자막 자리를 비우려고 그림 밖 어두운 곳까지 조금 넘어가도 돼요)
    const lo = Math.min(0, 500 - vh), hi = Math.max(0, 500 - vh), ex = this.fs ? vh * .3 : 0;
    const ty = !this.fs && vh >= 500 ? (500 - vh) / 2 : clamp(y, lo - ex, hi + ex);
    return [vw >= 800 ? (800 - vw) / 2 : clamp(x, 0, 800 - vw), ty, vw, vh];
  }
  fullVB(w, h) { const [mw, mh] = this.maxV(w, h); return [(800 - mw) / 2, (500 - mh) / 2, mw, mh]; }
  fit(r, w, h) {
    const A = w / h, pad = .1, [mw, mh] = this.maxV(w, h);
    let [x, y, rw, rh] = r;
    x -= rw * pad; y -= rh * pad; rw *= 1 + pad * 2; rh *= 1 + pad * 2;
    let vw, vh;
    if (rw / rh > A) { vw = rw; vh = rw / A; } else { vh = rh; vw = rh * A; }
    if (vw < 160) { vw = 160; vh = 160 / A; }
    if (vw > mw) { vw = mw; vh = mw / A; }
    if (vh > mh) { vh = mh; vw = mh * A; }
    return this.place([x + rw / 2 - vw / 2, y + rh / 2 - vh / 2, vw, vh]);
  }
  // 자막이 가리는 쪽을 비워 두고 단어 영역을 확대
  fitCap(r, w, h, pos, ch) {
    // 자막이 없는 띠(높이 ha) 가운데에 단어 칸이 오게: 띠에 맞춰 크기를 정하고, 칸 가운데를 띠 가운데에 둠
    const ha = Math.max(h * .45, h - ch - 16), A = w / ha, pad = .1, [mw] = this.maxV(w, h);
    let [x, y, rw, rh] = r;
    x -= rw * pad; y -= rh * pad; rw *= 1 + pad * 2; rh *= 1 + pad * 2;
    let vw = rw / rh > A ? rw : rh * A;
    vw = clamp(vw, 160, mw);
    const k = vw / w, vh = Math.min(this.maxV(w, h)[1], h * k);
    const bandTop = pos === 'bottom' ? 0 : h - ha;
    return this.place([x + rw / 2 - vw / 2, y + rh / 2 - (bandTop + ha / 2) * k, vw, vh]);
  }
  showCaption(html, spot) {
    if (!this.cap) return null;
    const pos = spot[1] + spot[3] / 2 > 250 ? 'top' : 'bottom';
    this.cap.className = 'pcap ' + pos; this.cap.innerHTML = html; this.cap.hidden = false;
    this.host.classList.toggle('cap-top', pos === 'top');
    return { pos, ch: this.cap.offsetHeight };
  }
  hideCaption() { if (this.cap) { this.cap.hidden = true; this.host.classList.remove('cap-top'); } }
  stop() { clearTimeout(this.tm); this.tok++; this.moving = false; }
  fullNow() { const h = this.baseH(); this.stop(); this.setH(h); this.setVB(this.fullVB(this.width(), h)); }
  go(t, h, dur, ease = EZ.out, done) {
    this.stop();
    const tok = this.tok;
    if (reduceMotion || !dur) { this.setH(h); this.setVB(t); if (done) done(); return; }
    void this.cam.getBoundingClientRect(); // 바로 앞에서 순간 이동한 위치를 출발점으로 확정
    this.setH(h, dur, ease); this.setVB(t, dur, ease); // 높이와 그림을 같은 곡선으로 움직여야 가장자리가 비지 않음
    this.moving = true;
    this.tm = setTimeout(() => { if (tok !== this.tok) return; this.moving = false; if (done) done(); }, dur + 30);
  }
  // 단어 영역 테두리와 주변 어둡게: 그림 위 별도 층(화면 좌표)에 그려서 그림을 다시 그리지 않음
  focus(r, label) {
    const w = this.width(), h = this.h || this.baseH(), t = this.view(this.vb, w, h), k = t.s;
    const p = 5 * k, x = t.x + r[0] * k - p, y = t.y + r[1] * k - p, rw = r[2] * k + p * 2, rh = r[3] * k + p * 2;
    const rr = Math.round(Math.min(r[2], r[3]) * .1 * k), f = n => n.toFixed(1);
    const box = `x="${f(x)}" y="${f(y)}" width="${f(rw)}" height="${f(rh)}" rx="${rr}"`;
    this.fx.innerHTML = `<path class="dim" fill-rule="evenodd" d="M-40 -40H${f(w + 40)}V${f(h + 40)}H-40Z${rrPath(x, y, rw, rh, rr)}"/><rect class="ring-o" ${box}/><rect class="ring" ${box}/>`;
    if (label) { this.tag.innerHTML = label; this.tag.hidden = false; }
  }
  clearFocus() { this.fx.innerHTML = ''; this.tag.hidden = true; this.current = null; }
  burstSpeed() { if (reduceMotion) return; const s = this.speed; s.classList.remove('go'); void s.offsetWidth; s.classList.add('go'); }
  pulse() { const h = this.host; h.classList.remove('flash'); void h.offsetWidth; h.classList.add('flash'); setTimeout(() => h.classList.remove('flash'), 700); }
  showZoomBtn(show, label) { if (!this.zbtn) return; this.zbtn.hidden = !show; this.host.classList.toggle('zb', !!show); if (label) this.zbtn.textContent = label; }
  relayout(spot, tall) { const h = tall ? this.revealH() : this.baseH(); this.stop(); this.setH(h); this.setVB(spot ? this.fit(spot, this.width(), h) : this.fullVB(this.width(), h)); }
  zoomTo(id, done) {
    const w = WORDS[id], h = this.baseH();
    this.clearFocus(); this.burstSpeed();
    this.go(this.fit(w.spot, this.width(), h), h, 480, EZ.out, () => { this.focus(w.spot, tagHTML(id)); this.current = id; if (done) done(); });
  }
  zoomFull() { this.clearFocus(); const h = this.baseH(); this.go(this.fullVB(this.width(), h), h, 420, EZ.inout); }
}
const tagHTML = id => `<b>${esc(shortW(id))}</b>${mHTML(WORDS[id].m)}`;

