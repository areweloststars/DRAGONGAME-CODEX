/* ================= SVG 그림 키트 ================= */
const INK = '#23253F';
const F_SIGN = "'Black Han Sans','IBM Plex Sans KR',sans-serif";
const F_EN = "'Lilita One','Black Han Sans',sans-serif";
const F_TXT = "'IBM Plex Sans KR',sans-serif";
const SK = ['#F8D9C0', '#EDB993', '#C68B63'];
const HR = { black: '#2B2433', brown: '#6B4430', dark: '#3A2B24', blond: '#D9AA4C', grey: '#B9BCC9', red: '#9C4630' };
const C = {
  red: '#E5544B', blue: '#4C7BE0', navy: '#2F3A6B', green: '#3FA36B', yellow: '#F4C24F', purple: '#8C66D9',
  teal: '#2EA6A0', orange: '#F08A3C', pink: '#EF7DA6', grey: '#8E94AA', white: '#FFFFFF', suit: '#2F3450',
  wood: '#A8744C', woodD: '#83552F', paper: '#FFFDF8', steel: '#9AA5BF', dark: '#20243A'
};

// 따옴표까지 바꿔서 HTML 속성(value="…", data-id="…") 안에 넣어도 안전하게
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
function at(o) { let s = ''; for (const k in o) { const v = o[k]; if (v === undefined || v === null || v === false) continue; s += ' ' + k + '="' + v + '"'; } return s; }
function E(t, o, inner) { return inner == null ? '<' + t + at(o) + '/>' : '<' + t + at(o) + '>' + inner + '</' + t + '>'; }
const SW = w => w ? { stroke: INK, 'stroke-width': w, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' } : {};
const rect = (x, y, w, h, f, rx = 0, sw = 3, ex = {}) => E('rect', { x, y, width: w, height: h, rx: rx || undefined, fill: f, ...SW(sw), ...ex });
const circ = (cx, cy, r, f, sw = 3, ex = {}) => E('circle', { cx, cy, r, fill: f, ...SW(sw), ...ex });
const ell = (cx, cy, rx, ry, f, sw = 3, ex = {}) => E('ellipse', { cx, cy, rx, ry, fill: f, ...SW(sw), ...ex });
const pth = (d, f = 'none', sw = 3, ex = {}) => E('path', { d, fill: f, ...SW(sw), ...ex });
const ln = (x1, y1, x2, y2, sw = 3, c = INK, ex = {}) => E('line', { x1, y1, x2, y2, stroke: c, 'stroke-width': sw, 'stroke-linecap': 'round', ...ex });
const pg = (pts, f, sw = 3, ex = {}) => E('polygon', { points: pts, fill: f, ...SW(sw), ...ex });
const tx = (x, y, s, size, f = INK, ex = {}) => E('text', { x, y, 'font-size': size, fill: f, 'text-anchor': 'middle', 'font-family': F_SIGN, ...ex }, esc(s));
const txE = (x, y, s, size, f = INK, ex = {}) => tx(x, y, s, size, f, { 'font-family': F_EN, ...ex });
const txT = (x, y, s, size, f = INK, ex = {}) => tx(x, y, s, size, f, { 'font-family': F_TXT, 'font-weight': 700, ...ex });
const G = (inner, t, ex = {}) => E('g', { transform: t, ...ex }, inner);

function limb(x1, y1, x2, y2, col, bend = 0, wo = 10, wi = 6.4) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
  const cx = (mx - dy / l * bend).toFixed(1), cy = (my + dx / l * bend).toFixed(1);
  const d = `M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}`;
  return pth(d, 'none', 0, { stroke: INK, 'stroke-width': wo, 'stroke-linecap': 'round' }) +
    pth(d, 'none', 0, { stroke: col, 'stroke-width': wi, 'stroke-linecap': 'round' });
}
const HAIR = {
  short: 'M-14.6 -88C-16 -103 -6 -108 1 -107C9 -106 16 -101 14.6 -88C12 -95 6 -98.5 -1 -98C-6 -97.5 -11 -94 -14.6 -88Z',
  side: 'M-14.6 -87C-16.5 -104 -3 -109 4 -107.5C12 -106 16.5 -100 14.6 -87C13 -92 9 -97 3 -98C-2 -94 -9 -92 -14.6 -87Z',
  long: 'M-14.8 -84C-16.5 -104 -6 -109 0 -109C8 -109 16.5 -104 14.8 -84C13 -95 7 -99.5 1 -99.5C-6 -99.5 -12 -95 -14.8 -84Z',
  curly: 'M-15 -86C-20 -92 -16 -101 -10 -101C-9 -108 0 -110 3 -105C9 -110 18 -104 15 -97C20 -93 18 -86 15 -85C12 -92 6 -95 0 -94C-6 -95 -12 -92 -15 -86Z'
};
function face(f, glasses) {
  let b = '';
  const eye = x => ell(x, -90.5, 1.8, 2.4, INK, 0);
  if (f === 'happy') b += pth('M-7.5 -90Q-5 -93.5 -2.5 -90', 'none', 1.8) + pth('M2.5 -90Q5 -93.5 7.5 -90', 'none', 1.8);
  else b += eye(-5) + eye(5);
  if (f === 'angry' || f === 'shout') b += ln(-8, -96.5, -3, -94.5, 1.8) + ln(8, -96.5, 3, -94.5, 1.8);
  if (f === 'smile' || f === 'happy') b += pth('M-5 -83.5Q0 -78.5 5 -83.5', 'none', 1.9);
  if (f === 'shout') b += pth('M-4.6 -84.5Q0 -75 4.6 -84.5Z', INK, 1.2);
  if (f === 'open') b += pth('M-4.2 -84Q0 -77.5 4.2 -84Z', INK, 1.2);
  if (f === 'serious' || f === 'angry') b += ln(-3.8, -82.5, 3.8, -82.5, 1.9);
  if (f === 'wow') b += ell(0, -82, 2.4, 3, INK, 0);
  if (f === 'worry') b += pth('M-4 -81.5Q0 -84.5 4 -81.5', 'none', 1.9);
  if (f !== 'serious' && f !== 'angry') b += circ(-9, -85, 2.4, '#F49A9A', 0, { opacity: .65 }) + circ(9, -85, 2.4, '#F49A9A', 0, { opacity: .65 });
  if (glasses) b += circ(-5.5, -90.5, 4.4, 'none', 1.6) + circ(5.5, -90.5, 4.4, 'none', 1.6) + ln(-1.1, -90.5, 1.1, -90.5, 1.4);
  return b;
}
/* 사람: 발 위치(x,y) 기준, 키 약 108 */
function person(o) {
  const s = o.s ?? 1, skin = o.skin ?? SK[0], hair = o.hair ?? HR.black, top = o.top ?? C.blue, bot = o.bot ?? C.navy;
  const hs = o.hs ?? 'short', back = !!o.back;
  const lh = o.lh ?? [-17, -38], rh = o.rh ?? [17, -38];
  let b = '';
  if (hs === 'long') b += pth('M-16 -94C-19 -72 -18 -60 -12 -54L12 -54C18 -60 19 -72 16 -94Z', hair);
  if (hs === 'bob') b += pth('M-16.5 -94C-19 -80 -18 -73 -13 -71L13 -71C18 -73 19 -80 16.5 -94Z', hair);
  if (hs === 'pony') b += pth('M9 -101C25 -98 27 -79 19 -66C17 -77 14 -87 7 -93Z', hair);
  if (o.legs !== false) {
    if (o.skirt) b += limb(-6, -30, -7, -3, skin, 0, 8.5, 5) + limb(6, -30, 7, -3, skin, 0, 8.5, 5);
    else b += limb(-7, -38, -8, -3, bot, 0, 10, 6.5) + limb(7, -38, 8, -3, bot, 0, 10, 6.5);
    b += ell(-10, -1.6, 7.6, 4.2, INK, 0) + ell(10, -1.6, 7.6, 4.2, INK, 0);
  }
  if (o.skirt) b += pth('M-15 -42L15 -42L19 -24Q0 -20 -19 -24Z', o.skirt);
  b += pth('M-15 -74Q-17.5 -52 -15 -36L15 -36Q17.5 -52 15 -74Q0 -80.5 -15 -74Z', top);
  if (o.under) b += o.under;
  if (o.coat) b += pth('M-15 -74Q-17.5 -52 -15 -36L-4 -36L-4 -74ZM15 -74Q17.5 -52 15 -36L4 -36L4 -74Z', o.coat, 2);
  if (o.suit) {
    b += pth('M-6 -76.5L0 -63L6 -76.5Z', '#fff', 2);
    b += pth('M0 -72L-3.2 -66L0 -48L3.2 -66Z', o.tie || C.red, 1.8);
    b += pth('M-6 -76.5L-2 -58M6 -76.5L2 -58', 'none', 1.6);
  }
  if (o.vest) b += pth('M-15 -74Q-17.5 -52 -15 -36L-5 -36L-5 -74ZM15 -74Q17.5 -52 15 -36L5 -36L5 -74Z', o.vest, 2) + ln(-15, -50, -5, -50, 2.5, '#FFF4B0') + ln(5, -50, 15, -50, 2.5, '#FFF4B0');
  if (o.badge) b += circ(-8.5, -63, 3, '#F4C24F', 1.4);
  if (o.lanyard) b += pth('M-7 -76L0 -60L7 -76', 'none', 0, { stroke: o.lanyard, 'stroke-width': 1.8 }) + rect(-5, -60, 10, 12, '#fff', 1.5, 1.6);
  b += circ(0, -90, 14, back ? hair : skin);
  if (!back) {
    if (HAIR[hs] || hs === 'long' || hs === 'bob' || hs === 'pony' || hs === 'bun') {
      const key = hs === 'side' ? 'side' : hs === 'curly' ? 'curly' : (hs === 'long' || hs === 'bob' || hs === 'pony') ? 'long' : 'short';
      b += pth(HAIR[key], hair, 2.6);
    }
    if (hs === 'bun') b += circ(0, -107, 6.5, hair, 2.6);
    if (hs === 'bald') b += pth('M-14.4 -86C-15.5 -93 -13 -97 -9 -99L-8.5 -90Z', hair, 2.2) + pth('M14.4 -86C15.5 -93 13 -97 9 -99L8.5 -90Z', hair, 2.2);
    if (hs === 'cap') b += pth('M-15.5 -93C-15.5 -111 15.5 -111 15.5 -93Z', o.capc || C.yellow, 2.6) + rect(-19, -95, 38, 5.5, o.capc || C.yellow, 2.5, 2.4);
    b += face(o.face ?? 'smile', o.glasses);
  } else if (hs === 'bun') b += circ(0, -106, 6.5, hair, 2.6);
  const sh = [-12.5, -69], sr = [12.5, -69];
  b += limb(sh[0], sh[1], lh[0], lh[1], top, o.lb ?? -4) + circ(lh[0], lh[1], 4.7, skin, 2.2);
  b += limb(sr[0], sr[1], rh[0], rh[1], top, o.rb ?? 4) + circ(rh[0], rh[1], 4.7, skin, 2.2);
  if (o.extra) b += o.extra;
  return G(b, `translate(${o.x} ${o.y}) scale(${s})`);
}
function burst(cx, cy, r1, r2, n, f, sw = 2.5, rot = 0) {
  const p = [];
  for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = i / (n * 2) * Math.PI * 2 + rot; p.push((cx + Math.cos(a) * r).toFixed(1) + ',' + (cy + Math.sin(a) * r).toFixed(1)); }
  return pg(p.join(' '), f, sw);
}
function bubble(x, y, w, h, tx_, ty_, f = '#fff', sw = 3) {
  const r = Math.min(16, h / 2), bx = Math.max(x + r + 4, Math.min(x + w - r - 22, tx_ - 8));
  return pth(`M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${bx + 18}L${tx_} ${ty_}L${bx} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`, f, sw);
}
function bubbleUp(x, y, w, h, tx_, ty_, f = '#fff', sw = 3) { // 꼬리가 위로
  const r = Math.min(16, h / 2), bx = Math.max(x + r + 4, Math.min(x + w - r - 22, tx_ - 8));
  return pth(`M${x + r} ${y}H${bx}L${tx_} ${ty_}L${bx + 18} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`, f, sw);
}
function sparkle(cx, cy, r, f = '#FFF6C2') {
  const k = r * 0.2;
  return pth(`M${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Z`, f, 1.6);
}
const check = (x, y, s = 1, c = C.green) => pth(`M${x - 6 * s} ${y}L${x - 1.5 * s} ${y + 5 * s}L${x + 7 * s} ${y - 6.5 * s}`, 'none', 0, { stroke: c, 'stroke-width': 3.4 * s, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
const cross = (x, y, r, c = C.red, w = 5) => ln(x - r, y - r, x + r, y + r, w, c) + ln(x + r, y - r, x - r, y + r, w, c);
function arrow(x1, y1, x2, y2, c = INK, w = 4, head = 11) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (d) => `${(x2 - head * Math.cos(a + d)).toFixed(1)} ${(y2 - head * Math.sin(a + d)).toFixed(1)}`;
  return ln(x1, y1, x2, y2, w, c) + pth(`M${p(-0.55)}L${x2} ${y2}L${p(0.55)}`, 'none', 0, { stroke: c, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
}
function pill(x, y, w, h, f, t, size, tc = INK, font = F_SIGN) {
  return rect(x, y, w, h, f, h / 2, 2.5) + tx(x + w / 2, y + h / 2 + size * 0.36, t, size, tc, { 'font-family': font });
}
const lines = (pts, sw = 3, c = INK) => pth('M' + pts.map(p => p.join(' ')).join('L'), 'none', 0, { stroke: c, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
function plant(x, y, s = 1, pot = C.orange) {
  return G(pth('M-14 -22L14 -22L10 0L-10 0Z', pot, 2.5) + pth('M0 -22C-4 -38 -18 -44 -20 -52C-8 -50 -2 -40 0 -26C2 -42 10 -54 20 -56C18 -44 6 -38 0 -22Z', C.green, 2.5) + ln(0, -22, 0, -46, 2.5), `translate(${x} ${y}) scale(${s})`);
}
function mugIcon(x, y, c, s = 1) { return G(rect(-10, -14, 20, 18, c, 4, 2.4) + pth('M10 -10Q17 -10 17 -5Q17 0 10 0', 'none', 2.4), `translate(${x} ${y}) scale(${s})`); }
function speedMarks(x, y, dir = 1, n = 3, len = 12, gap = 7, c = INK) { let b = ''; for (let i = 0; i < n; i++) b += ln(x, y + i * gap, x + dir * len, y + i * gap - 4, 2.4, c); return b; }

/* ================= 동화 캐릭터 키트 ================= */
// person()의 o.under(몸통 위·팔 아래) / o.extra(맨 위)에 넣는 조각. 좌표는 사람 발 기준(키 약 108)
const robe = (c, trim = '#F4C24F') => pth('M-15 -75Q-23 -40 -25 -2L25 -2Q23 -40 15 -75Q0 -81 -15 -75Z', c) + ln(0, -72, 0, -8, 2.2, trim);
const beard = (c = '#F4F4F4') => pth('M-12 -86Q-13 -66 0 -56Q13 -66 12 -86Q6 -81 0 -81Q-6 -81 -12 -86Z', c, 2.2) + pth('M-8 -85Q-3 -89 0 -85Q3 -89 8 -85', 'none', 2);
const crown = (c = '#F4C24F') => pth('M-12 -101L-13 -114L-6 -107L0 -116L6 -107L13 -114L12 -101Z', c, 2.2) + circ(0, -109, 2, '#E5544B', 0);
const helm = () => pth('M-15.5 -90C-15.5 -111 15.5 -111 15.5 -90Z', '#C9D1E0', 2.6) + rect(-1.6, -93, 3.2, 9, '#C9D1E0', 1, 1.6) + pth('M-2 -104C2 -120 18 -124 26 -114C16 -116 8 -112 4 -102Z', '#E5544B', 2);
const hood = () => pth('M-15.5 -91C-15 -104 -3 -112 20 -118C13 -107 16 -99 15.5 -91Z', '#2E8B4E', 2.6) + pth('M7 -104C14 -117 25 -124 32 -124C25 -115 17 -109 9 -102Z', '#E5544B', 1.8);
const turban = (c = '#F4F4F4') => ell(0, -100, 16, 10, c, 2.6) + circ(0, -104, 4, '#E5544B', 1.6) + pth('M4 -106C8 -116 12 -118 14 -116', 'none', 2);
const capHat = (c = '#E5544B') => pth('M-10 -100L-9 -111L9 -111L10 -100Z', c, 2.2) + ln(0, -111, 4, -116, 2);
const pointyHat = (c = '#F4C24F') => pth('M-14 -98L-1 -121L14 -98Z', c, 2.4) + rect(-16, -100, 32, 5, c, 2, 2.2) + pth('M8 -106C14 -116 20 -120 24 -118C20 -112 14 -108 10 -104Z', '#E5544B', 1.6);
const nose = (len, c = '#E2A85E') => pth(`M5 -88L${10 + len} -86.5L5 -84Z`, c, 2.2);
const bowArc = () => pth('M22 -92Q42 -62 22 -32', 'none', 0, { stroke: '#8B5A2B', 'stroke-width': 4, 'stroke-linecap': 'round' }) + ln(22, -92, 22, -32, 1.4, '#5A607E');

/* ---- 말 (오른쪽을 봄, 발 기준) ---- */
function horse(x, y, s = 1, c = '#F2EDE4', mane = '#8B5A2B') {
  let b = '';
  b += limb(-34, -42, -54, -10, c, -3, 11, 7) + limb(-22, -42, -20, -4, c, 2, 11, 7) + limb(26, -42, 44, -10, c, 2, 11, 7) + limb(36, -44, 60, -26, c, -3, 11, 7);
  for (const [hx, hy] of [[-54, -8], [-20, -2], [44, -8], [60, -24]]) b += circ(hx, hy, 4.5, INK, 0);
  b += pth('M-46 -60C-68 -62 -78 -44 -72 -26C-66 -38 -58 -46 -46 -50Z', mane, 2.4);
  b += ell(0, -56, 52, 25, c, 3);
  b += pth('M28 -70C36 -88 44 -102 52 -110L74 -98C70 -88 62 -76 46 -52Z', c, 3);
  b += pth('M50 -114C62 -118 84 -112 92 -100C94 -93 90 -88 83 -88C74 -90 66 -92 58 -93C50 -95 45 -106 50 -114Z', c, 3);
  b += circ(67, -105, 2.6, INK, 0) + ell(87, -95, 1.6, 1.2, INK, 0) + pth('M52 -113L55 -125L62 -114Z', c, 2.4);
  b += pth('M33 -72C40 -92 46 -106 55 -116C46 -114 38 -102 28 -86Z', mane, 2.2);
  b += pth('M-16 -80Q0 -87 16 -80L13 -66L-13 -66Z', '#E5544B', 2.4) + ln(0, -66, 0, -44, 2.4, '#8B5A2B');
  return G(b, `translate(${x} ${y}) scale(${s})`);
}

/* ---- 용 (큰 용, 왼쪽을 봄, 장면 좌표에 직접) ---- */
function bigDragon(o = {}) {
  const g = '#4FAE6B', gd = '#3A8F55', belly = '#F6D86B';
  let b = '';
  // 꼬리
  b += pth('M520 300C580 310 600 270 590 240C610 250 618 286 600 312C580 340 520 336 490 320Z', g, 3);
  b += pth('M588 236L604 214L606 244Z', '#F08A3C', 2.4);
  // 날개
  b += pth('M470 150C520 80 600 70 640 96C612 100 600 116 604 136C584 124 566 128 556 148C540 140 520 146 510 166Z', gd, 3);
  b += pth('M520 120L548 146M572 104L580 136', 'none', 2.4);
  // 몸
  b += ell(440, 232, 88, 98, g, 3);
  b += ell(416, 248, 54, 74, belly, 3);
  for (let i = 0; i < 6; i++) b += pth(`M${372 + i * 2} ${196 + i * 22}Q416 ${206 + i * 22} ${460 - i * 2} ${196 + i * 22}`, 'none', 2, { stroke: '#D9B64A' });
  // 결함(빠진 비늘)
  if (o.flaw) b += pth('M398 236L414 228L428 238L420 252L404 252Z', '#FF8FA0', 2.6);
  // 뒷다리·앞발
  b += ell(372, 318, 34, 20, g, 3) + ell(500, 318, 34, 20, g, 3);
  for (const fx of [350, 364, 378, 480, 494, 508]) b += pth(`M${fx} 330L${fx + 3} 340L${fx + 6} 330Z`, '#F4F4F4', 1.6);
  b += limb(372, 190, 340, 214, g, 6, 14, 9) + limb(470, 186, 506, 206, g, -6, 14, 9);
  // 목과 머리
  b += pth('M396 160C380 128 372 108 356 96L388 76C404 96 420 124 436 150Z', g, 3);
  for (let i = 0; i < 4; i++) b += pth(`M${398 + i * 10} ${86 + i * 18}L${414 + i * 10} ${80 + i * 18}L${408 + i * 10} ${98 + i * 18}Z`, '#F08A3C', 2.2);
  b += pth('M300 98C304 76 330 62 360 64C384 66 400 80 398 100C396 118 380 126 360 126C344 126 330 120 318 120C304 120 298 110 300 98Z', g, 3);
  b += pth('M376 66L392 40L398 70Z', '#FFF3D6', 2.4) + pth('M360 64L366 42L376 66Z', '#FFF3D6', 2.4);
  b += ell(310, 104, 3, 4, INK, 0) + ell(322, 106, 3, 4, INK, 0);
  if (o.dizzy) {
    b += pth('M346 82C352 76 360 80 356 86C352 92 344 88 348 82', 'none', 2.4) + pth('M368 86C374 80 382 84 378 90C374 96 366 92 370 86', 'none', 2.4);
    for (const [sx, sy] of [[332, 50], [356, 38], [384, 32]]) b += sparkle(sx, sy, 8, '#FFE45C');
    b += pth('M318 118Q330 112 342 118', 'none', 2.4);
  } else {
    b += circ(352, 86, 6, '#fff', 2.2) + circ(350, 87, 2.6, INK, 0) + ln(340, 76, 360, 80, 3);
    b += pth('M300 112Q322 122 340 116', 'none', 2.4);
  }
  return b;
}
/* ---- 작은 용 버스 (오른쪽으로 날아감) ---- */
function dragonBus(x, y, s = 1) {
  const g = '#4FAE6B';
  let b = '';
  b += pth('M-70 0C-90 -6 -104 4 -108 18C-96 10 -84 10 -72 14Z', g, 2.6);
  b += pth('M-20 -20C0 -60 30 -66 46 -50C30 -46 22 -36 22 -24Z', '#3A8F55', 2.6);
  b += ell(-10, 0, 64, 22, g, 2.8) + ell(-14, 8, 44, 10, '#F6D86B', 2.2);
  b += rect(-56, -28, 80, 14, '#8B5A2B', 4, 2.4);
  b += person({ x: -38, y: 2, s: 0.34, hs: 'short', hair: HR.black, top: C.red, legs: false, face: 'happy', lh: [-10, -110], rh: [12, -40] });
  b += person({ x: -12, y: 2, s: 0.34, hs: 'long', hair: HR.brown, top: C.blue, legs: false, face: 'happy', lh: [-12, -40], rh: [12, -40] });
  b += person({ x: 12, y: 2, s: 0.34, hs: 'bun', hair: HR.grey, top: C.purple, legs: false, face: 'smile', lh: [-12, -40], rh: [10, -110] });
  b += pth('M48 -14C52 -28 70 -34 84 -28C96 -22 96 -6 84 0C74 4 60 2 50 -2Z', g, 2.8);
  b += pth('M70 -32L76 -46L80 -30Z', '#FFF3D6', 2) + circ(78, -18, 2.6, INK, 0) + pth('M84 -8Q90 -6 92 -10', 'none', 2);
  b += rect(-46, 18, 36, 14, '#F4C24F', 3, 2) + txT(-28, 29, '1번', 9, INK);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}

/* ---- 거북이 (오른쪽을 봄, 발 기준) ---- */
function tortoise(x, y, s = 1, o = {}) {
  const sk = '#9BD27B';
  let b = '';
  for (const lx of [-24, 16]) b += rect(lx - 7, -15, 14, 15, sk, 5, 2.4);
  b += pth('M-36 -13L-48 -8L-36 -5Z', sk, 2);
  b += pth('M22 -27C34 -33 46 -32 52 -25C56 -18 52 -10 43 -10C35 -10 28 -14 21 -17Z', sk, 2.6);
  b += circ(43, -23, 2.5, INK, 0) + pth('M45 -15Q49 -14 51 -17', 'none', 1.8);
  if (o.band) b += pth('M28 -30Q40 -36 50 -30L50 -26Q40 -31 29 -26Z', C.red, 1.8) + pth('M28 -28L20 -34M28 -28L20 -24', 'none', 0, { stroke: C.red, 'stroke-width': 3, 'stroke-linecap': 'round' });
  b += pth('M-38 -13C-38 -48 32 -48 32 -13Z', '#3E8E53', 3);
  b += rect(-40, -16, 74, 7, '#6FB55A', 3, 2.4);
  b += pth('M-16 -38L-8 -26L-20 -17M8 -38L2 -26L14 -17M-8 -26H2', 'none', 2.2, { stroke: '#2D6B3E' });
  if (o.boxes) b += rect(-26, -66, 26, 22, '#D9A05B', 2, 2.4) + rect(-2, -60, 22, 16, '#E8B878', 2, 2.4) + ln(-13, -66, -13, -44, 1.6) + ln(9, -60, 9, -44, 1.6);
  return G(b, `translate(${x} ${y}) scale(${o.flip ? -s : s} ${s})`);
}
/* ---- 토끼 ---- */
function hareRun(x, y, s = 1, c = '#F4EFE6') {
  let b = '';
  b += limb(-24, -22, -50, -8, c, 4, 11, 7) + limb(16, -20, 40, -6, c, -4, 11, 7);
  b += ell(-6, -28, 30, 16, c, 2.8) + circ(-36, -32, 6, '#fff', 2.2);
  b += circ(26, -40, 15, c, 2.8);
  b += pth('M18 -52C10 -72 0 -86 -10 -90C-6 -78 2 -64 12 -50Z', c, 2.6) + pth('M24 -54C22 -76 18 -90 10 -98C10 -84 14 -68 18 -52Z', c, 2.6);
  b += pth('M16 -56C10 -70 4 -80 -4 -86', 'none', 0, { stroke: '#F7B7C5', 'stroke-width': 3, 'stroke-linecap': 'round' });
  b += ln(28, -46, 36, -44, 2.4) + circ(33, -42, 2.4, INK, 0) + circ(40, -36, 2.4, '#F48FA6', 0);
  b += pth('M28 -48L38 -46L30 -40Z', '#E5544B', 0, { opacity: .85 });
  for (const sy of [-34, -26, -18]) b += ln(-60, sy, -84, sy, 2.4, '#8E94AA');
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
function hareSleep(x, y, s = 1, c = '#F4EFE6') {
  let b = '';
  b += ell(0, -14, 34, 14, c, 2.8) + circ(-32, -18, 6, '#fff', 2.2);
  b += circ(30, -20, 14, c, 2.8);
  b += pth('M26 -32C14 -40 0 -44 -12 -44C-4 -36 10 -32 22 -30Z', c, 2.6) + pth('M32 -33C24 -46 12 -54 0 -56C6 -46 18 -38 28 -32Z', c, 2.6);
  b += pth('M30 -22Q34 -19 38 -22', 'none', 2) + circ(42, -15, 2.2, '#F48FA6', 0) + pth('M34 -12Q37 -10 40 -12', 'none', 1.6);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
function bunny(x, y, s = 1, o = {}) { // 앉은 토끼, 앞을 봄
  const c = o.c || '#F4EFE6';
  let b = '';
  b += ell(0, -16, 18, 17, c, 2.8) + ell(-9, -2, 8, 4, c, 2.2) + ell(9, -2, 8, 4, c, 2.2);
  b += pth('M-8 -44C-14 -66 -12 -80 -6 -84C-2 -76 -2 -60 -2 -46Z', c, 2.6) + pth('M8 -44C14 -66 12 -80 6 -84C2 -76 2 -60 2 -46Z', c, 2.6);
  b += ln(-7, -50, -8, -76, 2.6, '#F7B7C5') + ln(7, -50, 8, -76, 2.6, '#F7B7C5');
  b += circ(0, -38, 14, c, 2.8);
  if (o.wink) b += pth('M-8 -40Q-5 -43 -2 -40', 'none', 1.8) + ell(5, -40, 1.8, 2.4, INK, 0);
  else b += ell(-5, -40, 1.8, 2.4, INK, 0) + ell(5, -40, 1.8, 2.4, INK, 0);
  b += circ(0, -34, 2.2, '#F48FA6', 0) + pth('M-3 -31Q0 -29 3 -31', 'none', 1.6) + circ(-8, -34, 2.2, '#F49A9A', 0, { opacity: .6 }) + circ(8, -34, 2.2, '#F49A9A', 0, { opacity: .6 });
  if (o.lh) b += limb(-12, -24, o.lh[0], o.lh[1], c, 0, 8, 5);
  if (o.rh) b += limb(12, -24, o.rh[0], o.rh[1], c, 0, 8, 5);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
/* ---- 다람쥐 응원단장 ---- */
function squirrel(x, y, s = 1) {
  const c = '#C9834A';
  let b = '';
  b += pth('M-10 -20C-36 -24 -44 -60 -24 -78C-14 -86 -2 -80 -6 -70C-16 -64 -18 -42 -4 -34Z', '#B87039', 2.6);
  b += ell(4, -22, 14, 20, c, 2.6) + ell(4, -18, 8, 12, '#F2D2A8', 0);
  b += circ(6, -50, 13, c, 2.6) + pth('M-3 -60L-6 -70L2 -63Z', c, 2) + pth('M12 -61L16 -70L17 -60Z', c, 2);
  b += ell(2, -52, 1.8, 2.4, INK, 0) + ell(11, -52, 1.8, 2.4, INK, 0) + pth('M3 -45Q7 -41 11 -45Z', INK, 1);
  b += limb(14, -30, 30, -44, c, 0, 8, 5) + pth('M28 -48L50 -60L50 -32L28 -42Z', C.red, 2.4) + rect(24, -50, 6, 10, '#fff', 2, 2);
  b += limb(-4, -30, -14, -12, c, 0, 8, 5) + circ(-16, -10, 7, '#FFE45C', 2) + circ(-22, -14, 5, '#FFE45C', 1.6);
  b += ell(-2, -2, 6, 3, c, 2) + ell(10, -2, 6, 3, c, 2);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
/* ---- 관중 동물 머리 ---- */
const bearHead = (x, y, s = 1) => G(circ(-11, -14, 6, '#A0703F', 2.2) + circ(11, -14, 6, '#A0703F', 2.2) + circ(0, 0, 15, '#A0703F', 2.6) + ell(0, 5, 7, 5, '#E5C49A', 0) + circ(0, 3, 2.4, INK, 0) + ell(-5, -3, 1.6, 2.2, INK, 0) + ell(5, -3, 1.6, 2.2, INK, 0), `translate(${x} ${y}) scale(${s})`);
const deerHead = (x, y, s = 1) => G(pth('M-8 -12L-14 -26L-10 -26L-8 -20L-6 -30L-4 -14ZM8 -12L14 -26L10 -26L8 -20L6 -30L4 -14Z', '#8B5A2B', 1.6) + ell(-13, -8, 6, 3, '#C9834A', 2) + ell(13, -8, 6, 3, '#C9834A', 2) + ell(0, 0, 12, 15, '#C9834A', 2.6) + ell(0, 9, 5, 4, '#F2D2A8', 0) + circ(0, 7, 2.2, INK, 0) + ell(-5, -2, 1.6, 2.2, INK, 0) + ell(5, -2, 1.6, 2.2, INK, 0), `translate(${x} ${y}) scale(${s})`);
const frogHead = (x, y, s = 1) => G(circ(-8, -10, 6, '#7CC46A', 2.2) + circ(8, -10, 6, '#7CC46A', 2.2) + ell(0, 0, 15, 11, '#7CC46A', 2.6) + circ(-8, -10, 2.2, INK, 0) + circ(8, -10, 2.2, INK, 0) + pth('M-7 3Q0 8 7 3', 'none', 2), `translate(${x} ${y}) scale(${s})`);
const birdHead = (x, y, s = 1, c = '#4C9BE0') => G(circ(0, 0, 12, c, 2.6) + pg('10,-2 20,2 10,5', '#F4C24F', 1.6) + circ(4, -3, 2, INK, 0) + pth('M-4 -11L0 -18L3 -11Z', c, 1.6), `translate(${x} ${y}) scale(${s})`);
const flagStick = (x, y, c, t) => ln(x, y, x, y - 34, 2.4, '#8B5A2B') + pth(`M${x} ${y - 34}L${x + 26} ${y - 28}L${x} ${y - 20}Z`, c, 1.8) + (t ? txT(x + 9, y - 25, t, 7, '#fff') : '');

/* ---- 아기돼지 (앞을 봄, 발 기준) ---- */
function pig(x, y, s = 1, o = {}) {
  const c = '#F9B4C3', d = '#F28DA5';
  let b = '';
  b += pth('M-18 -22C-30 -22 -32 -34 -24 -36', 'none', 2.2) + pth('M18 -24C26 -24 28 -16 22 -14C18 -12 20 -20 24 -18', 'none', 2);
  b += rect(-12, -12, 9, 12, d, 3, 2.2) + rect(3, -12, 9, 12, d, 3, 2.2);
  b += ell(0, -26, 20, 20, o.top || c, 2.8);
  if (o.overall) b += pth('M-12 -32H12V-10Q0 -6 -12 -10Z', o.overall, 2.2) + ln(-12, -32, -8, -42, 2.2) + ln(12, -32, 8, -42, 2.2);
  b += pth('M-16 -66L-20 -82L-6 -72Z', c, 2.4) + pth('M16 -66L20 -82L6 -72Z', c, 2.4);
  b += circ(0, -58, 18, c, 2.8);
  b += ell(0, -54, 8.5, 6.5, d, 2.2) + ell(-3, -54, 1.6, 2.4, '#B0506A', 0) + ell(3, -54, 1.6, 2.4, '#B0506A', 0);
  b += ell(-7, -64, 1.8, 2.5, INK, 0) + ell(7, -64, 1.8, 2.5, INK, 0);
  b += o.face === 'worry' ? pth('M-4 -44Q0 -47 4 -44', 'none', 1.8) : pth('M-5 -46Q0 -42 5 -46', 'none', 1.8);
  b += circ(-12, -52, 3, '#F49A9A', 0, { opacity: .7 }) + circ(12, -52, 3, '#F49A9A', 0, { opacity: .7 });
  const lh = o.lh || [-22, -24], rh = o.rh || [22, -24];
  b += limb(-14, -36, lh[0], lh[1], c, -3, 9, 6) + circ(lh[0], lh[1], 4, d, 2);
  b += limb(14, -36, rh[0], rh[1], c, 3, 9, 6) + circ(rh[0], rh[1], 4, d, 2);
  if (o.hat) b += pth('M-17 -68C-17 -86 17 -86 17 -68Z', o.hat, 2.4) + rect(-21, -70, 42, 5, o.hat, 2.5, 2.2);
  if (o.extra) b += o.extra;
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
/* ---- 늑대 (부는 중, 오른쪽을 봄) ---- */
function wolf(x, y, s = 1) {
  const c = '#9AA0B5', d = '#7C8399';
  let b = '';
  b += pth('M-30 -40C-50 -40 -60 -60 -52 -74C-44 -60 -36 -56 -26 -56Z', d, 2.4);
  b += rect(-20, -16, 10, 16, d, 3, 2.2) + rect(6, -16, 10, 16, d, 3, 2.2);
  b += ell(-6, -38, 26, 26, c, 2.8) + ell(-4, -30, 12, 16, '#E6E8F0', 0);
  b += pth('M-2 -96L-10 -116L4 -104Z', c, 2.4) + pth('M18 -96L24 -116L28 -98Z', c, 2.4);
  b += circ(10, -82, 20, c, 2.8);
  b += pth('M26 -86C38 -88 46 -84 46 -78C46 -72 38 -70 28 -72Z', c, 2.6) + circ(46, -80, 3.5, INK, 0);
  b += circ(26, -74, 9, '#E6E8F0', 2.2) + circ(30, -74, 3, INK, 0);
  b += ell(6, -88, 2.2, 3, INK, 0) + ln(0, -95, 10, -92, 2.4) + circ(-4, -76, 4, '#F49A9A', 0, { opacity: .7 });
  b += limb(10, -52, 30, -48, c, 0, 9, 6);
  for (let i = 0; i < 4; i++) b += pth(`M${48} ${-86 + i * 8}Q${66 + i * 6} ${-90 + i * 8} ${84 + i * 4} ${-84 + i * 8}`, 'none', 0, { stroke: '#C9E9FB', 'stroke-width': 3, 'stroke-linecap': 'round' });
  for (const [dx, dy] of [[-30, -110], [-18, -122]]) b += pth(`M${dx} ${dy}q4 6 0 10`, 'none', 0, { stroke: '#7FB7E8', 'stroke-width': 2.4, 'stroke-linecap': 'round' });
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
/* ---- 귀뚜라미 선생님 ---- */
function cricket(x, y, s = 1) {
  const c = '#6FC25A';
  let b = '';
  b += ln(-6, -18, -12, 0, 3) + ln(6, -18, 12, 0, 3) + pth('M-14 0H-8M10 0H16', 'none', 3);
  b += ell(0, -30, 13, 18, c, 2.6) + ell(0, -28, 7, 12, '#BFE89F', 0);
  b += rect(-10, -38, 20, 12, '#E5544B', 3, 2) + pth('M-3 -38L0 -32L3 -38', 'none', 1.6);
  b += circ(0, -58, 14, c, 2.6);
  b += pth('M-5 -70C-10 -86 -20 -92 -28 -92M5 -70C10 -86 20 -92 28 -92', 'none', 2.2);
  b += circ(-5, -60, 4, '#fff', 1.6) + circ(5, -60, 4, '#fff', 1.6) + circ(-4, -60, 1.8, INK, 0) + circ(6, -60, 1.8, INK, 0);
  b += pth('M-5 -51Q0 -47 5 -51', 'none', 1.8);
  b += rect(-11, -84, 22, 14, '#2B2433', 2, 2.2) + rect(-15, -72, 30, 4, '#2B2433', 2, 2);
  b += limb(-10, -36, -24, -46, c, 0, 7, 4.5) + limb(10, -36, 22, -24, c, 0, 7, 4.5);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
/* ---- 요술 램프와 지니 ---- */
const lamp = (x, y, s = 1) => G(pth('M-26 -6C-26 -22 26 -22 26 -6Z', '#F4C24F', 2.6) + pth('M24 -14C38 -18 48 -26 54 -32C50 -18 40 -8 22 -6Z', '#F4C24F', 2.4) + pth('M-24 -14C-38 -16 -40 -4 -26 -4', 'none', 3) + ell(0, -2, 22, 5, '#E0A92E', 2.4) + ell(0, -24, 8, 4, '#F4C24F', 2.2) + circ(0, -30, 3, '#F4C24F', 2), `translate(${x} ${y}) scale(${s})`);
function genie(x, y, s = 1, o = {}) { // (x,y)는 연기 꼬리 끝
  const c = '#9B7BE8';
  let b = '';
  b += pth('M0 0C-20 -10 -10 -40 -26 -56C-34 -66 -20 -80 -6 -76C10 -96 -20 -110 -2 -126L22 -126C10 -104 34 -96 22 -76C40 -66 28 -40 14 -30C8 -24 10 -10 0 0Z', '#C9B8F5', 2.6);
  b += pth('M-18 -122C-20 -160 32 -160 34 -122Z', c, 2.8);
  b += circ(8, -172, 18, c, 2.8) + pth('M8 -190C4 -200 12 -206 16 -200', 'none', 2.4) + circ(8, -192, 5, '#F4C24F', 2);
  b += ell(2, -174, 2.2, 3, INK, 0) + ell(14, -174, 2.2, 3, INK, 0) + pth('M-2 -164Q8 -156 18 -164Z', INK, 1.4);
  b += circ(-6, -166, 3, '#F49A9A', 0, { opacity: .6 }) + circ(22, -166, 3, '#F49A9A', 0, { opacity: .6 });
  b += ell(-22, -184, 4, 6, c, 2) + ell(38, -184, 4, 6, c, 2) + circ(-22, -180, 2, '#F4C24F', 1.2) + circ(38, -180, 2, '#F4C24F', 1.2);
  const lh = o.lh || [-38, -128], rh = o.rh || [54, -128];
  b += limb(-12, -146, lh[0], lh[1], c, -4, 11, 7) + circ(lh[0], lh[1], 6, c, 2.2);
  b += limb(28, -146, rh[0], rh[1], c, 4, 11, 7) + circ(rh[0], rh[1], 6, c, 2.2);
  b += rect(-16, -150, 48, 8, '#F4C24F', 3, 2.2);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
function carpet(x, y, s = 1) {
  let b = '';
  b += pth('M-70 0C-50 -10 -30 8 -10 -2C10 -12 30 6 50 -4C60 -8 66 -6 70 -4L64 18C46 26 26 8 6 18C-14 28 -34 10 -54 20C-62 24 -68 22 -74 20Z', '#C2405C', 2.8);
  b += pth('M-58 6C-40 -2 -24 12 -6 4C12 -4 30 10 48 2', 'none', 0, { stroke: '#F4C24F', 'stroke-width': 3, 'stroke-dasharray': '6 4' });
  for (let i = 0; i < 6; i++) b += ln(-74 + i * 2, 20 - i * 4, -82 + i * 2, 24 - i * 4, 2);
  for (let i = 0; i < 6; i++) b += ln(70 - i * 1.5, -4 + i * 4.4, 78 - i * 1.5, -2 + i * 4.4, 2);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
/* ---- 용궁: 자라 직원, 문어 의사, 꽃게, 복어 ---- */
function turtleWorker(x, y, s = 1, o = {}) {
  const sk = '#9BD27B';
  let b = '';
  b += ell(0, -40, 26, 32, '#3E8E53', 3) + pth('M-18 -60L-8 -44L-20 -28M18 -60L8 -44L20 -28', 'none', 2, { stroke: '#2D6B3E' });
  b += ell(0, -38, 18, 26, '#F2E3A8', 2.4);
  b += pth('M0 -60L-4 -52L0 -30L4 -52Z', o.tie || C.red, 1.6);
  b += rect(-16, -10, 12, 12, sk, 4, 2.2) + rect(4, -10, 12, 12, sk, 4, 2.2);
  b += circ(0, -78, 15, sk, 2.6) + ell(-5, -80, 2, 2.6, INK, 0) + ell(5, -80, 2, 2.6, INK, 0) + pth('M-5 -71Q0 -67 5 -71', 'none', 1.8);
  const lh = o.lh || [-30, -36], rh = o.rh || [30, -36];
  b += limb(-20, -52, lh[0], lh[1], sk, -3, 9, 6) + circ(lh[0], lh[1], 4, sk, 2);
  b += limb(20, -52, rh[0], rh[1], sk, 3, 9, 6) + circ(rh[0], rh[1], 4, sk, 2);
  if (o.card) b += rect(rh[0] - 4, rh[1] - 12, 14, 10, '#fff', 2, 1.6);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
function octopus(x, y, s = 1, o = {}) {
  const c = o.c || '#B07CD9';
  let b = '';
  for (let i = 0; i < 6; i++) { const tx = -24 + i * 9.6; b += pth(`M${tx} -18Q${tx - 8} -4 ${tx + (i % 2 ? 6 : -6)} 0`, 'none', 0, { stroke: INK, 'stroke-width': 9.5, 'stroke-linecap': 'round' }) + pth(`M${tx} -18Q${tx - 8} -4 ${tx + (i % 2 ? 6 : -6)} 0`, 'none', 0, { stroke: c, 'stroke-width': 6, 'stroke-linecap': 'round' }); }
  b += pth('M-28 -18C-34 -60 34 -60 28 -18Z', c, 2.8);
  b += circ(-9, -36, 5, '#fff', 1.8) + circ(9, -36, 5, '#fff', 1.8) + circ(-8, -36, 2.2, INK, 0) + circ(10, -36, 2.2, INK, 0);
  b += pth('M-5 -26Q0 -22 5 -26', 'none', 1.8);
  if (o.doctor) b += circ(0, -50, 7, '#E8EEF6', 2) + circ(0, -50, 3, '#fff', 1.2) + pth('M-14 -22Q-14 -8 0 -6Q14 -8 14 -22', 'none', 2.2, { stroke: '#5A607E' }) + circ(0, -6, 4, '#C9CEDF', 2);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
const crabClerk = (x, y, s = 1) => G(ell(0, -10, 24, 14, '#E5544B', 2.6) + ln(-8, -22, -10, -32, 2.4) + ln(8, -22, 10, -32, 2.4) + circ(-10, -34, 4, '#fff', 1.8) + circ(10, -34, 4, '#fff', 1.8) + circ(-10, -34, 1.8, INK, 0) + circ(10, -34, 1.8, INK, 0) + pth('M-22 -14C-34 -20 -38 -32 -30 -38L-24 -30L-20 -36C-14 -28 -16 -18 -22 -14Z', '#E5544B', 2.2) + pth('M22 -14C34 -20 38 -32 30 -38L24 -30L20 -36C14 -28 16 -18 22 -14Z', '#E5544B', 2.2) + pth('M-5 -6Q0 -2 5 -6', 'none', 1.8), `translate(${x} ${y}) scale(${s})`);
function puffer(x, y, s = 1) {
  let b = '';
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; b += ln(Math.cos(a) * 17, -20 + Math.sin(a) * 17, Math.cos(a) * 23, -20 + Math.sin(a) * 23, 2.2); }
  b += circ(0, -20, 18, '#F4C24F', 2.6) + pg('16,-22 26,-30 26,-12', '#F4C24F', 2) + circ(-6, -24, 3.5, '#fff', 1.6) + circ(-6, -24, 1.6, INK, 0) + circ(-14, -18, 2.4, '#F49A9A', 0, { opacity: .7 }) + pth('M-14 -14Q-10 -11 -6 -14', 'none', 1.6);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
const fish = (x, y, s = 1, c = '#F08A3C', flip) => G(ell(0, 0, 14, 8, c, 2.2) + pg('12,0 22,-7 22,7', c, 2) + circ(-6, -1, 1.6, INK, 0), `translate(${x} ${y}) scale(${flip ? -s : s} ${s})`);
const bubbleDots = (x, y) => circ(x, y, 4, 'none', 1.6, { stroke: '#FFFFFF', opacity: .8 }) + circ(x + 6, y - 12, 3, 'none', 1.4, { stroke: '#FFFFFF', opacity: .8 }) + circ(x - 2, y - 22, 2.2, 'none', 1.2, { stroke: '#FFFFFF', opacity: .8 });
/* ---- 사슴(전신) ---- */
function deer(x, y, s = 1) {
  const c = '#C9834A';
  let b = '';
  for (const lx of [-20, -10, 14, 24]) b += ln(lx, -26, lx + (lx < 0 ? -2 : 2), -2, 4.5, INK) + ln(lx, -26, lx + (lx < 0 ? -2 : 2), -2, 2.6, c);
  b += ell(2, -34, 30, 14, c, 2.6) + circ(-24, -36, 5, '#F2D2A8', 0);
  b += pth('M22 -42C26 -56 30 -64 34 -70L42 -64C38 -56 34 -48 30 -38Z', c, 2.4);
  b += ell(42, -72, 12, 9, c, 2.6) + circ(52, -70, 2.2, INK, 0) + circ(42, -75, 2, INK, 0);
  b += pth('M36 -80L30 -96L34 -96L36 -88L38 -100L42 -82Z', '#8B5A2B', 1.6);
  for (const [sx, sy] of [[-6, -38], [8, -40], [-14, -30]]) b += circ(sx, sy, 2.2, '#F2D2A8', 0);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
const tree = (x, y, s = 1, c = '#4FAE6B') => G(rect(-8, -40, 16, 40, '#8B5A2B', 3, 2.6) + circ(-22, -56, 22, c, 2.6) + circ(20, -58, 22, c, 2.6) + circ(0, -80, 26, c, 2.6) + circ(0, -56, 18, c, 0), `translate(${x} ${y}) scale(${s})`);
const pine = (x, y, s = 1, c = '#3A8F55') => G(rect(-5, -20, 10, 20, '#8B5A2B', 2, 2.2) + pg('0,-90 -26,-42 26,-42', c, 2.4) + pg('0,-66 -32,-18 32,-18', c, 2.4), `translate(${x} ${y}) scale(${s})`);

/* ================= 장면 공통 소품 ================= */
const cloud = (x, y, s = 1, f = '#fff') => G(pth('M-40 0C-52 0 -54 -18 -40 -20C-40 -36 -16 -40 -8 -28C0 -42 26 -40 28 -22C44 -24 48 0 34 0Z', f, 2.4), `translate(${x} ${y}) scale(${s})`);
const flower = (x, y, c = '#F27DA6') => ln(x, y, x, y - 12, 2, '#2E7D46') + circ(x, y - 15, 4.2, c, 1.8) + circ(x, y - 15, 1.6, '#FFE45C', 0);
const backHead = (x, y, s, top, hair) => G(pth('M-24 0Q-24 -28 0 -28Q24 -28 24 0Z', top, 2.6) + circ(0, -38, 14, hair, 2.6), `translate(${x} ${y}) scale(${s})`);
function camera(x, y, s = 1) {
  return G(rect(-16, -10, 32, 21, '#2B2E40', 4, 2.4) + circ(0, 1, 7, '#8FA3C8', 2) + rect(-12, -15, 10, 6, '#2B2E40', 2, 2) + burst(-8, -22, 13, 5, 8, '#FFF3A6', 1.8), `translate(${x} ${y}) scale(${s})`);
}
const tag = (x, y, t, f = '#fff', tc = INK, size = 13) => { const w = t.length * size * 0.92 + 18; return pill(x, y, w, size + 11, f, t, size, tc); };
// 장면 속 작은 컷(패널)
const panelBox = (x, y, w, h, f) => rect(x, y, w, h, f, 10, 3.2);
const panelEdge = (x, y, w, h) => rect(x, y, w, h, 'none', 10, 3.2);

/* ================= 만화 한 쪽 배치 =================
   장면 하나 = 만화 한 쪽. 이야기 순서대로 칸을 나눠요 (위 줄 → 아래 줄, 왼쪽 → 오른쪽).
   칸 하나에 단어 하나: 칸 안 좌표(0,0 ~ 칸 너비, 칸 높이)로 그린 그림을 칸 밖으로 넘치지 않게 담아요. */
const PAPER = '#F4EFE4';
function comicPanels(n, m = 8, g = 8) {
  const rows = n <= 3 ? [n] : n === 4 ? [2, 2] : n === 5 ? [2, 3] : n === 6 ? [3, 3] : n === 7 ? [3, 4] : [4, n - 4];
  const H = (500 - m * 2 - g * (rows.length - 1)) / rows.length, out = [];
  let y = m;
  for (const c of rows) {
    const W = (800 - m * 2 - g * (c - 1)) / c;
    for (let i = 0; i < c; i++) out.push([m + i * (W + g), y, W, H].map(v => Math.round(v * 10) / 10));
    y += H + g;
  }
  return out;
}
function panelSvg(r, inner, bg = '#EAF4FB') {
  const [x, y, w, h] = r;
  // style의 크기: 페이지 CSS(예: svg { width: 100% })가 칸 크기를 바꾸지 못하게
  return E('svg', { x, y, width: w, height: h, viewBox: `0 0 ${w} ${h}`, overflow: 'hidden', style: `width:${w}px;height:${h}px` }, rect(0, 0, w, h, bg, 0, 0) + inner) + rect(x, y, w, h, 'none', 4, 3.2);
}
const comicPage = panels => rect(0, 0, 800, 500, PAPER, 0, 0) + panels.join('');

