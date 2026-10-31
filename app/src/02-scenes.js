/* ================= 장면 1. 용을 물리친 기사 ================= */
/* ================= 장면 1. 용을 물리친 기사 (만화 한 쪽, 7칸) ================= */
function scDragon() {
  const P = comicPanels(7), panels = [];
  // 칸 크기를 인라인 style로도 고정: 페이지 CSS의 'svg { width/height }' 규칙이 안쪽 칸 svg까지 늘려 버리는 것을 막아요
  const addPanel = (k, inner, bg) => panels.push(panelSvg(P[k], inner, bg));
  const GRN = '#4FAE6B', GRD = '#3A8F55', BELLY = '#F6D86B', SCALE = '#C9A43E', SPIKE = '#F08A3C', HORN = '#FFF3D6';
  const ARMOR = '#C9D1E0', SKIN_PINK = '#F58FA3';
  // 잘라 내기(clipPath)는 id가 필요해서, 같은 그림이 화면에 두 벌 있으면 깨져요. 그래서 모양을 직접 계산해서 그려요.
  const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  // 두 타원이 겹치는 부분 (볼록한 모양이라 가운데를 기준으로 각도 순서대로 이으면 돼요)
  function ellOverlap(a, b2, n = 72) {
    const pts = [];
    for (const [e, o] of [[a, b2], [b2, a]]) for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2, x = e[0] + e[2] * Math.cos(t), y = e[1] + e[3] * Math.sin(t);
      if (inEll(x, y, o[0], o[1], o[2] + 0.01, o[3] + 0.01)) pts.push([x, y]);
    }
    if (pts.length < 3) return '';
    const mx = pts.reduce((v, q) => v + q[0], 0) / pts.length, my = pts.reduce((v, q) => v + q[1], 0) / pts.length;
    pts.sort((p1, p2) => Math.atan2(p1[1] - my, p1[0] - mx) - Math.atan2(p2[1] - my, p2[0] - mx));
    return 'M' + pts.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z';
  }
  // 타원 a의 테두리 중 타원 b 안에 들어가는 부분 (선으로)
  function ellArcIn(a, b2, n = 96) {
    let d = '', on = false;
    for (let i = 0; i <= n; i++) {
      const t = i / n * Math.PI * 2, x = a[0] + a[2] * Math.cos(t), y = a[1] + a[3] * Math.sin(t);
      if (inEll(x, y, b2[0], b2[1], b2[2], b2[3])) { d += (on ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); on = true; } else on = false;
    }
    return d;
  }
  // 네모 안만 보이게: 안쪽 svg 칸 (id 필요 없음)
  const boxClip = (x, y, w, h, inner) => E('svg', { x, y, width: w, height: h, viewBox: `${x} ${y} ${w} ${h}`, overflow: 'hidden', style: `width:${w}px;height:${h}px` }, inner);

  /* ---- 공통 조각 ---- */
  const ground = (w, h, y, f) => rect(0, y, w, h - y, f, 0, 0) + ln(0, y, w, y, 2.4);
  const sign = (x, y, w, h, l1, l2, size = 20, c = INK, c2) => {
    let b = rect(x, y, w, h, '#FFFDF8', 8, 2.8);
    if (l2) b += tx(x + w / 2, y + h / 2 - 3, l1, size, c) + tx(x + w / 2, y + h / 2 + size - 1, l2, size, c2 || c);
    else b += tx(x + w / 2, y + h / 2 + size * 0.36, l1, size, c);
    return b;
  };
  // 기사 (모든 칸에서 같은 모습: 은빛 갑옷 + 빨간 깃 투구)
  const knight = (o) => person({ hs: 'short', hair: HR.brown, top: ARMOR, bot: '#6E7896', face: 'smile', extra: helm(), ...o });
  const spear = (x1, y1, x2, y2) => {
    const a = Math.atan2(y2 - y1, x2 - x1), c = Math.cos(a), s = Math.sin(a);
    const bx = x2 - c * 16, by = y2 - s * 16;
    return ln(x1, y1, bx, by, 7, INK) + ln(x1, y1, bx, by, 3.6, C.woodD) +
      pg(`${x2},${y2} ${(bx - s * 6.5).toFixed(1)},${(by + c * 6.5).toFixed(1)} ${(bx + s * 6.5).toFixed(1)},${(by - c * 6.5).toFixed(1)}`, '#DDE3EE', 2.2);
  };

  /* ---- 용 (왼쪽을 봄). 좌표는 키트 bigDragon과 같은 공간(x 296~640, y 30~340) ---- */
  const SC = { w: 22, h: 18, dx: 22, dy: 14, x0: 350, y0: 168 };
  const FR = 5, FC = 3;                       // 빠진 비늘: 5번째 줄, 3번째 칸
  const flawXY = () => [SC.x0 + FC * SC.dx + (FR % 2 ? SC.dx / 2 : 0), SC.y0 + FR * SC.dy + SC.h * 0.55];
  const FLAW = flawXY();
  function drg(o = {}) {
    let b = '';
    b += pth('M520 300C580 310 600 270 590 240C610 250 618 286 600 312C580 340 520 336 490 320Z', GRN, 3);
    b += pth('M588 236L604 214L606 244Z', SPIKE, 2.4);
    b += pth('M470 150C520 80 600 70 640 96C612 100 600 116 604 136C584 124 566 128 556 148C540 140 520 146 510 166Z', GRD, 3);
    b += pth('M520 120L548 146M572 104L580 136', 'none', 2.4);
    b += ell(440, 232, 88, 98, GRN, 3);
    // 배: 비늘을 아래 줄부터 그려서 위 줄이 살짝 덮게 (기와처럼)
    let sc = o.only ? '' : ell(416, 248, 54, 74, BELLY, 0);
    const inside = (x, y) => inEll(x, y, 416, 248, 50, 70);
    for (let r = 12; r >= 0; r--) {
      const sy = SC.y0 + r * SC.dy;
      for (let c = -1; c < 7; c++) {
        const sx = SC.x0 + c * SC.dx + (r % 2 ? SC.dx / 2 : 0), hw = SC.w / 2, h = SC.h;
        const d = `M${sx - hw} ${sy}V${sy + 5}Q${sx - hw} ${sy + h} ${sx} ${sy + h}Q${sx + hw} ${sy + h} ${sx + hw} ${sy + 5}V${sy}Z`;
        const u = `M${sx - hw} ${sy + 5}Q${sx - hw} ${sy + h} ${sx} ${sy + h}Q${sx + hw} ${sy + h} ${sx + hw} ${sy + 5}`;
        const isFlaw = o.flaw && r === FR && c === FC;
        if (!isFlaw && !(inside(sx - hw, sy) && inside(sx + hw, sy) && inside(sx - hw, sy + 5) && inside(sx + hw, sy + 5) && inside(sx, sy + h))) continue;
        if (o.only && !isFlaw) continue;
        if (isFlaw) sc += pth(`M${sx - hw} ${sy + 3}Q${sx - hw} ${sy + h} ${sx} ${sy + h}Q${sx + hw} ${sy + h} ${sx + hw} ${sy + 3}Q${sx} ${sy - 3} ${sx - hw} ${sy + 3}Z`, SKIN_PINK, 0) +
          pth(`M${sx - hw} ${sy + 3}Q${sx - hw} ${sy + h} ${sx} ${sy + h}Q${sx + hw} ${sy + h} ${sx + hw} ${sy + 3}Q${sx} ${sy - 3} ${sx - hw} ${sy + 3}Z`, 'none', 0, { stroke: '#A63A55', 'stroke-width': 2, 'stroke-dasharray': '3 3', 'stroke-linecap': 'round' });
        else sc += pth(d, BELLY, 0) + pth(u, 'none', 0, { stroke: SCALE, 'stroke-width': 2, 'stroke-linecap': 'round' });
      }
    }
    if (o.only) return sc;
    b += sc + ell(416, 248, 54, 74, 'none', 3);
    b += ell(372, 318, 34, 20, GRN, 3) + ell(500, 318, 34, 20, GRN, 3);
    for (const fx of [350, 364, 378, 480, 494, 508]) b += pth(`M${fx} 330L${fx + 3} 340L${fx + 6} 330Z`, '#F4F4F4', 1.6);
    b += limb(372, 186, 342, 206, GRN, 6, 14, 9) + limb(470, 186, 506, 206, GRN, -6, 14, 9);
    b += pth('M396 160C380 128 372 108 356 96L388 76C404 96 420 124 436 150Z', GRN, 3);
    for (let i = 0; i < 4; i++) b += pth(`M${398 + i * 10} ${86 + i * 18}L${414 + i * 10} ${80 + i * 18}L${408 + i * 10} ${98 + i * 18}Z`, SPIKE, 2.2);
    b += pth('M300 98C304 76 330 62 360 64C384 66 400 80 398 100C396 118 380 126 360 126C344 126 330 120 318 120C304 120 298 110 300 98Z', GRN, 3);
    b += pth('M376 66L392 40L398 70Z', HORN, 2.4) + pth('M360 64L366 42L376 66Z', HORN, 2.4);
    b += ell(310, 104, 3, 4, INK, 0) + ell(322, 106, 3, 4, INK, 0);
    if (o.dizzy) {
      b += pth('M352 87C352 81 359 80 360 86C361 93 350 95 347 88C344 80 352 74 360 76', 'none', 2.4);
      b += pth('M316 117Q324 111 330 117Q336 123 342 117', 'none', 2.4);
    } else {
      b += circ(352, 86, 6, '#fff', 2.2) + circ(349, 87, 2.6, INK, 0) + ln(340, 76, 360, 80, 3);
      b += pth('M300 112Q322 122 340 116', 'none', 2.4);
    }
    return b;
  }

  /* ---- 용 버스 (왼쪽을 보고 정류장으로 날아옴). 등에 창문 달린 버스 칸을 메고 승객을 태움. 원점 = 몸통 가운데 ---- */
  function dbus() {
    let b = '';
    // 날개 (버스 칸 뒤)
    b += pth('M6 -20C14 -72 46 -100 78 -94C63 -84 57 -72 59 -58C48 -62 36 -56 34 -42C26 -44 18 -36 16 -22Z', GRD, 2.8);
    // 꼬리 (오른쪽, 위로 말림)
    b += pth('M44 8C62 10 70 0 68 -16C76 -8 78 10 66 18C58 24 46 22 38 16Z', GRN, 2.8);
    b += pth('M64 -14L68 -30L74 -12Z', SPIKE, 2.2);
    // 몸통 + 배
    b += ell(0, 0, 54, 24, GRN, 3);
    b += pth(ellOverlap([-4, 22, 44, 14], [0, 0, 53, 23]), BELLY, 0) + pth(ellArcIn([-4, 22, 44, 14], [0, 0, 53, 23]), 'none', 2.4);
    // 발 (접고 날기)
    b += ell(-22, 24, 11, 6.5, GRN, 2.6) + ell(20, 24, 11, 6.5, GRN, 2.6);
    // 목 + 머리 (drg와 같은 얼굴, 웃는 눈)
    b += pth('M-38 -6C-48 -18 -54 -30 -60 -42L-42 -52C-38 -40 -32 -28 -22 -16Z', GRN, 3);
    const hs = 0.5;
    b += G(pth('M300 98C304 76 330 62 360 64C384 66 400 80 398 100C396 118 380 126 360 126C344 126 330 120 318 120C304 120 298 110 300 98Z', GRN, 3 / hs) +
      pth('M376 66L392 40L398 70Z', HORN, 2.4 / hs) + pth('M360 64L366 42L376 66Z', HORN, 2.4 / hs) +
      ell(310, 104, 3, 4, INK, 0) + ell(322, 106, 3, 4, INK, 0) +
      pth('M342 90Q351 78 360 90', 'none', 2.4 / hs) + pth('M304 112Q322 126 340 114', 'none', 2.4 / hs) +
      circ(354, 106, 7, '#F49A9A', 0, { opacity: 0.7 }), `translate(-246 -105) scale(${hs})`);
    // 등에 멘 버스 칸: 창문 3개, 승객 3명
    b += rect(-32, -52, 74, 34, '#F4C24F', 8, 2.8);
    const pas = [[-15, HR.black, 'short', SK[0], C.red], [5, HR.brown, 'long', SK[1], C.blue], [25, HR.grey, 'bun', SK[0], C.purple]];
    const wy = -47, ww = 18, wh = 23;
    for (const [px, hc, hs2, sk, tc] of pas) {
      b += rect(px - ww / 2, wy, ww, wh, '#DDEFFC', 4, 0);
      b += boxClip(px - ww / 2, wy, ww, wh, person({ x: px, y: 6, s: 0.44, hs: hs2, hair: hc, skin: sk, top: tc, legs: false, face: 'happy' }));
      b += rect(px - ww / 2, wy, ww, wh, 'none', 4, 2.2);
    }
    b += rect(-34, -22, 78, 7, '#E5544B', 3, 2.4);
    return b;
  }

  /* ---- 0. upcoming: 성문 게시판 "D-1" ---- */
  {
    const [, , w, h] = P[0];
    let b = '';
    b += ground(w, h, 196, '#CFE6B8');
    for (const px of [66, 190]) b += rect(px - 6, 120, 12, 106, C.wood, 3, 2.6);
    b += pth('M30 46L128 18L226 46Z', '#C2405C', 2.8);
    b += rect(40, 44, 176, 128, C.wood, 6, 2.8) + rect(50, 54, 156, 108, '#E8C48E', 3, 2.2);
    b += G(rect(-62, -44, 124, 92, C.paper, 3, 2.6) + circ(0, -38, 3.6, C.red, 1.4) +
      tx(0, -12, '결전의 날', 20, INK) + txE(0, 34, 'D-1', 42, C.red), 'translate(128 110) rotate(-2)');
    addPanel(0, b, '#E3F1FB');
  }

  /* ---- 1. oppose: "싸움 반대!" 현수막 ---- */
  {
    const [, , w, h] = P[1];
    let b = '';
    b += ground(w, h, 196, '#E9D9BC');
    for (const px of [48, 208]) b += ln(px, 40, px, 160, 5.4, INK) + ln(px, 40, px, 160, 2.6, C.woodD);
    b += rect(40, 34, 176, 62, '#FFFDF8', 6, 2.8) + tx(128, 78, '싸움 반대!', 34, C.red);
    b += person({ x: 72, y: 226, s: 1.25, hs: 'bald', hair: HR.grey, skin: SK[1], top: '#7B9AD9', bot: '#4A4F6B', face: 'worry', lh: [-19, -92], rh: [19, -50] });
    b += person({ x: 184, y: 226, s: 1.25, hs: 'short', hair: HR.brown, top: '#E2A23B', bot: '#4A4F6B', face: 'shout', lh: [-20, -50], rh: [19, -92], extra: ln(-9, -97.5, -3, -94.5, 2.2) + ln(9, -97.5, 3, -94.5, 2.2) });
    b += pth('M100 108q-6 8 0 11q6 -3 0 -11Z', '#9CCBF2', 1.8);
    addPanel(1, b, '#FBEFD9');
  }

  /* ---- 2. lawmaker: '법' 책을 든 국회의원 할아버지 ---- */
  {
    const [, , w, h] = P[2];
    let b = '';
    b += ground(w, h, 206, '#E9D9BC');
    b += bubble(108, 12, 138, 70, 96, 100);
    b += tx(177, 40, '용감한 기사를', 18) + tx(177, 66, '추천합니다!', 18, C.red);
    const badge = circ(-9.5, -61, 4.2, '#F4C24F', 1.8) + circ(-9.5, -61, 1.6, '#C2405C', 0);
    b += person({ x: 72, y: 228, s: 1.5, hs: 'bald', hair: HR.grey, top: '#3A4466', bot: '#3A4466', suit: true, tie: C.red, face: 'smile', extra: beard() + badge, lh: [-24, -52], rh: [30, -60], rb: 2 });
    b += G(rect(-17, -22, 34, 42, '#8B2E3C', 3, 2.6) + rect(-13, -18, 26, 34, '#F4E3C3', 2, 0) + tx(0, 6, '법', 20, '#8B2E3C'), 'translate(36 154) rotate(-8)');
    addPanel(2, b, '#EEE8FB');
  }

  /* ---- 3. flaw: 비늘 하나가 빠진 용의 가슴 (돋보기 속은 2배로 크게) ---- */
  {
    const s = 0.78, ox = -222, oy = -20;
    let b = '';
    b += G(drg({ flaw: true, id: 3 }), `translate(${ox} ${oy}) scale(${s})`);
    const fx = FLAW[0] * s + ox, fy = FLAW[1] * s + oy, R = 33, m = 2.1;
    // 손잡이 (렌즈 아래 오른쪽)
    const hx = fx + R * 0.72, hy = fy + R * 0.72;
    b += ln(hx, hy, hx + 30, hy + 30, 13, INK) + ln(hx, hy, hx + 30, hy + 30, 7.5, C.woodD);
    // 렌즈 속: 같은 용을 m배 확대해서 빠진 비늘 주변만 보여 줌
    b += circ(fx, fy, R, BELLY, 0) + G(drg({ flaw: true, only: true }), `translate(${fx} ${fy}) scale(${s * m}) translate(${-FLAW[0]} ${-FLAW[1]})`);
    b += circ(fx, fy, R + 1.5, 'none', 0, { stroke: '#E8EEF6', 'stroke-width': 5 }) + circ(fx, fy, R + 4.5, 'none', 3) + circ(fx, fy, R - 0.5, 'none', 2);
    b += pth(`M${fx - R * 0.62} ${fy - R * 0.3}Q${fx - R * 0.55} ${fy - R * 0.62} ${fx - R * 0.25} ${fy - R * 0.68}`, 'none', 0, { stroke: '#fff', 'stroke-width': 3.4, 'stroke-linecap': 'round', opacity: 0.9 });
    addPanel(3, b, '#E4F4E1');
  }

  /* ---- 4. accurately: 창이 빠진 비늘에 정확하게 명중 ---- */
  {
    const [, , w, h] = P[4];
    const s = 0.68, ox = -134, oy = -14;
    let b = '';
    b += ground(w, h, 212, '#CFE6B8');
    b += G(drg({ flaw: true, dizzy: true, id: 4 }), `translate(${ox} ${oy}) scale(${s})`);
    const fx = FLAW[0] * s + ox, fy = FLAW[1] * s + oy;
    const kx = 32, ky = 228, ks = 0.92, hx = kx + 22 * ks, hy = ky - 100 * ks;
    b += knight({ x: kx, y: ky, s: ks, face: 'shout', lh: [-18, -50], rh: [22, -100], rb: 2 });
    b += pth(`M${hx + 6} ${hy}L${fx - 48} ${fy + 14}`, 'none', 0, { stroke: C.red, 'stroke-width': 3.4, 'stroke-dasharray': '1 8', 'stroke-linecap': 'round' });
    b += spear(fx - 46, fy + 13, fx + 1, fy);
    b += burst(40, 84, 30, 19.5, 10, '#FFE45C', 2.4) + tx(40, 91, '명중!', 18, C.red);
    addPanel(4, b, '#E3F1FB');
  }

  /* ---- 5. press conference: 왕궁 기자 회견 ---- */
  {
    let b = '';
    b += sign(30, 12, 130, 36, '왕궁 기자 회견', null, 18);
    b += knight({ x: 95, y: 210, s: 1.3, face: 'happy', lh: [-26, -110], rh: [18, -48], lb: -6 });
    b += pth('M58 156L132 156L124 232L66 232Z', C.wood, 2.8) + rect(50, 146, 90, 13, C.woodD, 4, 2.8);
    const mic = [[72, 132, C.red], [86, 126, C.blue], [104, 126, '#3A3F57'], [118, 132, C.green]];
    for (const [mx, my] of mic) b += ln(95, 146, mx, my + 8, 2.6);
    for (const [mx, my, mc] of mic) b += rect(mx - 4, my - 8, 8, 13, '#3A3F57', 4, 1.8) + rect(mx - 6, my + 4, 12, 8, mc, 2, 1.8);
    b += backHead(26, 240, 0.9, C.teal, HR.black) + camera(30, 190, 0.85);
    b += backHead(166, 240, 0.9, '#E2A23B', HR.brown) + camera(162, 190, 0.85);
    addPanel(5, b, '#EEE8FB');
  }

  /* ---- 6. public transportation: 승객을 태운 용 버스가 정류장으로 ---- */
  {
    const [, , w, h] = P[6];
    let b = '';
    b += ground(w, h, 206, '#CFE6B8');
    b += G(dbus(), 'translate(103 110)');
    b += ln(52, 196, 52, 214, 5.4, INK) + ln(52, 196, 52, 214, 2.6, '#8E94AA');
    b += sign(14, 148, 76, 50, '용 버스', '정류장', 18, C.blue);
    addPanel(6, b, '#E3F1FB');
  }

  return comicPage(panels);
}

/* ================= 장면 2. 토끼와 거북이 리턴즈 ================= */
/* ================= 장면: 토끼와 거북이 리턴즈 (만화 7칸) ================= */
// 공통 색
const raceC = { skin: '#9BD27B', shell: '#3E8E53', hare: '#F4EFE6', ear: '#F7B7C5' };

// 밝은 간판: 가운데 x, 위 y, 너비 w, 줄 [[글, 크기, 색]]
function raceSign(cx, y, w, rows, f = '#FFFDF8') {
  const gap = 6, pad = 11;
  const h = pad * 2 + rows.reduce((a, r) => a + r[1], 0) + gap * (rows.length - 1);
  let b = rect(cx - w / 2, y, w, h, f, 10, 3);
  let yy = y + pad;
  for (const [t, s, c] of rows) { b += tx(cx, yy + s * 0.84, t, s, c || INK); yy += s + gap; }
  return b;
}
// 바닥 띠
const raceGround = (w, h, y, c) => rect(0, y, w, h - y, c, 0, 0) + ln(0, y, w, y, 2.4);

// 거북이 (오른쪽을 봄, 발 기준). o.flip 왼쪽 보기, o.run 달리기, o.face(smile|happy|fierce|grin), o.tilt 고개 각도, o.boxes 택배 상자
function raceTurtle(x, y, s = 1, o = {}) {
  const sk = raceC.skin;
  let b = '';
  const band = { stroke: C.red, 'stroke-width': 4, 'stroke-linecap': 'round', fill: 'none' };
  b += pth('M-36 -12L-50 -7L-36 -3Z', sk, 2.2); // 꼬리
  if (o.run) b += limb(-22, -12, -38, -1, sk, 0, 15, 10.5) + limb(16, -12, 32, -2, sk, 0, 15, 10.5);
  else b += rect(-30, -16, 14, 16, sk, 5, 2.4) + rect(10, -16, 14, 16, sk, 5, 2.4);
  b += pth('M14 -16C20 -26 28 -32 36 -34L42 -18C34 -14 24 -12 14 -12Z', sk, 2.6); // 목
  b += pth('M-38 -13C-38 -50 34 -50 34 -13Z', raceC.shell, 3); // 등딱지
  b += pth('M-16 -38L-8 -26L-20 -16M8 -38L2 -26L14 -16M-8 -26H2', 'none', 2.2, { stroke: '#2D6B3E' });
  b += rect(-40, -16, 76, 7, '#6FB55A', 3, 2.4);
  // 머리
  let hd = '';
  hd += E('path', { d: o.run ? 'M33 -36C26 -40 18 -44 8 -44M33 -35C26 -33 18 -33 8 -29' : 'M33 -36L24 -43M33 -35L22 -30', ...band });
  hd += ell(47, -29, 16, 14.5, sk, 2.6);
  hd += pth('M33 -37Q47 -47.5 61 -38L61.6 -34Q47 -43.5 32.4 -33Z', C.red, 1.8);
  const f = o.face || 'smile';
  if (f === 'happy') hd += pth('M50 -27Q53.5 -31.5 57 -27', 'none', 2.2);
  else hd += ell(53, -27.5, 2.3, 3.1, INK, 0);
  if (f === 'fierce' || f === 'grin') hd += ln(48, -35, 58, -30.5, 2.4);
  if (f === 'fierce' || f === 'grin') hd += pth('M51.5 -21Q57 -14 62 -22Z', INK, 1.4);
  else hd += pth('M52 -21Q57 -17 61.5 -22', 'none', 2.1);
  hd += circ(45.5, -22, 2.8, '#F49A9A', 0, { opacity: .7 });
  b += o.tilt ? G(hd, `rotate(${o.tilt} 30 -20)`) : hd;
  if (o.boxes) b += rect(-27, -66, 30, 26, '#D9A05B', 2, 2.4) + ln(-12, -66, -12, -40, 1.8) + rect(3, -58, 22, 18, '#E8B878', 2, 2.4) + ln(14, -58, 14, -40, 1.8);
  return G(b, `translate(${x} ${y}) scale(${o.flip ? -s : s} ${s})`);
}

// 토끼 얼굴 조각 (오른쪽을 봄). 눈 (ex,ey)
function raceHareFace(ex, ey, mood) {
  let b = '';
  if (mood === 'smug' || mood === 'fierce') b += pth(`M${ex - 3.2} ${ey - 1.5}H${ex + 3.2}Q${ex + 3.2} ${ey + 3.2} ${ex} ${ey + 3.2}Q${ex - 3.2} ${ey + 3.2} ${ex - 3.2} ${ey - 1.5}Z`, INK, 0);
  else b += ell(ex, ey, 2.1, 2.8, INK, 0);
  if (mood === 'smug' || mood === 'fierce') b += ln(ex - 5, ey - 8, ex + 5, ey - 4.5, 2.4);
  b += circ(ex + 9, ey + 6, 2.7, '#F48FA6', 0); // 코
  if (mood === 'fierce') b += pth(`M${ex + 1} ${ey + 11}Q${ex + 6} ${ey + 17} ${ex + 10} ${ey + 10.5}Z`, INK, 1.4);
  else b += pth(`M${ex - 1} ${ey + 12}Q${ex + 4} ${ey + 15} ${ex + 9} ${ey + 10}`, 'none', 2);
  b += circ(ex - 6, ey + 9, 3, '#F49A9A', 0, { opacity: .6 });
  return b;
}
// 서 있는 토끼 (오른쪽을 봄, 발 기준): 팔짱 낀 자신만만 포즈
function raceHare(x, y, s = 1, o = {}) {
  const c = raceC.hare;
  let b = '';
  b += pth('M-2 -88C-12 -106 -14 -122 -9 -132C0 -124 6 -106 6 -90Z', c, 2.6); // 뒤 귀
  b += ell(-6, -4, 14, 5.5, c, 2.6); // 뒷발
  b += circ(-19, -26, 7, '#fff', 2.4); // 꼬리
  b += pth('M-16 -12C-24 -30 -20 -58 0 -62C18 -64 24 -40 20 -16C16 -6 -10 -4 -16 -12Z', c, 2.8); // 몸
  b += ell(12, -4, 15, 5.5, c, 2.6); // 앞발
  b += circ(6, -76, 17, c, 2.8); // 머리
  b += pth('M4 -90C0 -110 2 -128 10 -136C17 -124 18 -106 13 -90Z', c, 2.6); // 앞 귀
  b += pth('M8 -96C6 -108 7 -118 10 -126', 'none', 0, { stroke: raceC.ear, 'stroke-width': 3.4, 'stroke-linecap': 'round' });
  b += raceHareFace(14, -78, o.mood || 'smug');
  // 팔짱
  b += limb(-2, -54, 2, -40, c, 3, 10, 6.4) + limb(2, -40, 19, -46, c, 0, 10, 6.4) + circ(20, -46.5, 5, c, 2.2);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
// 달리는 토끼 (오른쪽으로 쌩, 발 기준)
function raceHareRun(x, y, s = 1) {
  const c = raceC.hare;
  let b = '';
  for (const sy of [-44, -33, -22]) b += ln(-62, sy, -80, sy, 3, '#8E94AA');
  b += limb(-20, -26, -52, -10, c, 5, 12, 8) + limb(16, -26, 46, -12, c, -5, 12, 8); // 다리
  b += pth('M22 -60C10 -76 -4 -86 -16 -88C-10 -78 2 -68 16 -58Z', c, 2.6); // 뒤 귀
  b += circ(-36, -38, 7, '#fff', 2.4); // 꼬리
  b += G(ell(-4, -34, 32, 17, c, 2.8), 'rotate(-8 -4 -34)'); // 몸
  b += circ(30, -50, 17, c, 2.8); // 머리
  b += pth('M26 -64C18 -84 6 -98 -6 -104C-2 -90 8 -74 20 -60Z', c, 2.6); // 앞 귀
  b += pth('M20 -70C14 -82 8 -90 0 -96', 'none', 0, { stroke: raceC.ear, 'stroke-width': 3.4, 'stroke-linecap': 'round' });
  b += raceHareFace(37, -53, 'fierce');
  return G(b, `translate(${x} ${y}) scale(${s})`);
}

// 관중 동물: 몸 + 만세 팔 + 머리(키트)
function raceFan(x, y, s, head, col, arms = true) {
  let b = '';
  if (arms) b += limb(-12, -16, -16, -56, col, 3, 10, 6.4) + circ(-16, -56, 5, col, 2.2) + limb(12, -16, 16, -56, col, -3, 10, 6.4) + circ(16, -56, 5, col, 2.2);
  b += pth('M-20 0Q-20 -24 0 -24Q20 -24 20 0Z', col, 2.6);
  b += head(0, -32, 1);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
// 번개(맞대결 눈싸움)
const raceBolt = (x, y, s = 1, r = 0) => G(pg('-4,-16 6,-16 1,-4 8,-4 -5,16 -1,2 -8,2', '#FFE45C', 2.2), `translate(${x} ${y}) rotate(${r}) scale(${s})`);

function scRace() {
  const P = comicPanels(7), panels = [];
  const wh = k => [P[k][2], P[k][3]];
  const zz = (x, y) => tx(x, y, 'z', 18, '#4C7BE0') + tx(x + 13, y - 20, 'Z', 23, '#4C7BE0') + tx(x + 28, y - 44, 'Z', 28, '#4C7BE0');

  // 0 competition: '토끼 VS 거북이 리턴즈!' 간판 아래 맞대결
  {
    const [w, h] = wh(0);
    let o = raceGround(w, h, 188, '#E9D9BC');
    o += raceSign(164, 12, 164, [['토끼 VS 거북이', 20], ['리턴즈!', 25, C.red]]);
    o += raceHare(54, 206, 1.12, { mood: 'smug' });
    o += raceTurtle(178, 214, 1.32, { flip: true, face: 'fierce', tilt: -18 });
    o += raceBolt(100, 132, 1.1, 30);
    panels.push(panelSvg(P[0], o, '#FBEFD9'));
  }
  // 1 competitive: '이번에도 내가 1등!' 쌩 달려 나가는 토끼
  {
    const [w, h] = wh(1);
    let o = raceGround(w, h, 188, '#CFE6B8');
    o += raceHareRun(130, 202, 1.38);
    o += bubble(142, 12, 106, 64, 176, 110);
    o += tx(195, 39, '이번에도', 19) + tx(195, 65, '내가 1등!', 21, C.red);
    panels.push(panelSvg(P[1], o, '#E3F1FB'));
  }
  // 2 presently: 전광판 '현재 1위 토끼' + 지금 쿨쿨 자는 토끼
  {
    const [w, h] = wh(2);
    let o = raceGround(w, h, 188, '#CFE6B8');
    o += tree(194, 190, 1.22, '#7CC46A');
    o += ln(62, 80, 62, 192, 8, INK) + ln(62, 80, 62, 192, 4, '#8E94AA');
    // 전광판: 어두운 판에 밝은 글자
    o += raceSign(62, 12, 112, [['현재 1위', 24, '#FFD84D'], ['토끼', 24, '#FF8A8A']], '#2B2F55');
    o += hareSleep(170, 212, 1.65);
    o += G(pth('M28 -36C22 -43 14 -48 6 -51', 'none', 0, { stroke: raceC.ear, 'stroke-width': 2.6, 'stroke-linecap': 'round' }), 'translate(170 212) scale(1.65)');
    o += zz(118, 116);
    panels.push(panelSvg(P[2], o, '#EEE8FB'));
  }
  // 3 audience: 관중 셋이 '거북이 힘내라!' 현수막을 번쩍 들고 응원
  {
    const [w, h] = wh(3);
    let o = raceGround(w, h, 194, '#D6DFEE');
    o += raceSign(w / 2, 46, 164, [['거북이', 22], ['힘내라!', 25, C.red]]);
    o += raceFan(37, 206, 1.5, bearHead, '#A0703F') + raceFan(95, 206, 1.5, frogHead, '#7CC46A') + raceFan(153, 206, 1.5, birdHead, '#4C9BE0');
    panels.push(panelSvg(P[3], o, '#F7E8E8'));
  }
  // 4 motivate: 다람쥐 응원단장 '할 수 있어!' → 힘이 나서 달리는 거북이
  {
    const [w, h] = wh(4);
    let o = raceGround(w, h, 178, '#CFE6B8');
    o += squirrel(58, 188, 1.15);
    o += raceTurtle(108, 221, 1.05, { run: true, face: 'fierce' });
    o += bubble(80, 14, 102, 66, 120, 118);
    o += tx(131, 41, '할 수', 21) + tx(131, 67, '있어!', 23, C.red);
    panels.push(panelSvg(P[4], o, '#E4F4E1'));
  }
  // 5 exceed: 제한속도 10인데 지금 15! 과속 카메라 번쩍
  {
    const [w, h] = wh(5);
    let o = raceGround(w, h, 194, '#DADDE6');
    o += ln(95, 36, 95, 198, 7, INK) + ln(95, 36, 95, 198, 3.4, '#C9CEDF');
    o += G(burst(-30, 2, 21, 10, 9, '#FFF3A6', 2) + rect(-16, -11, 32, 22, '#3A3F57', 4, 2.6) + circ(-9, 0, 6, '#8FA3C8', 2), 'translate(103 34)');
    o += raceSign(95, 60, 140, [['제한속도 10', 20], ['지금 15!', 23, C.red]]);
    o += raceTurtle(86, 212, 1.1, { run: true, face: 'grin' });
    for (const sy of [164, 175, 186]) o += ln(10, sy, 24, sy, 3, '#8E94AA');
    panels.push(panelSvg(P[5], o, '#E8EEF6'));
  }
  // 6 entrepreneurship: 상금으로 차린 '느림보 택배' 개업
  {
    const [w, h] = wh(6);
    let o = raceGround(w, h, 196, '#E9D9BC');
    o += rect(16, 70, 158, 128, '#F3DDB8', 0, 3);
    for (let i = 0; i < 5; i++) o += pth(`M${16 + i * 31.6} 84H${47.6 + i * 31.6}V98Q${31.8 + i * 31.6} 110 ${16 + i * 31.6} 98Z`, i % 2 ? '#fff' : C.red, 2.4);
    o += rect(114, 120, 46, 76, '#C99A62', 4, 2.6);
    o += raceSign(w / 2, 14, 164, [['느림보 택배', 24, C.green], ['오늘 개업!', 19, C.red]]);
    o += raceTurtle(78, 218, 1.3, { boxes: true, face: 'happy' });
    panels.push(panelSvg(P[6], o, '#FBEFD9'));
  }
  return comicPage(panels);
}

/* ================= 장면 3. 아기돼지 삼형제의 벽돌집 ================= */
function brickWall(x, y, w, h, missing = 0) {
  let b = rect(x, y, w, h, '#D9694F', 0, 3);
  const bw = 28, bh = 14;
  for (let r = 0; r * bh < h; r++) {
    const yy = y + r * bh;
    if (r) b += ln(x, yy, x + w, yy, 1.6, '#8E3B2B');
    for (let xx = x + (r % 2 ? bw / 2 : bw); xx < x + w; xx += bw) b += ln(xx, yy, xx, Math.min(yy + bh, y + h), 1.6, '#8E3B2B');
  }
  return b;
}
const brick = (x, y, r = 0) => G(rect(-13, -7, 26, 14, '#D9694F', 2, 2.4) + ln(-4, -7, -4, 7, 1.4, '#8E3B2B'), `translate(${x} ${y}) rotate(${r})`);
/* ================= 장면: 아기돼지 삼형제의 벽돌집 (만화 7칸) ================= */
// 삼형제 색: 첫째 파랑 멜빵, 둘째 초록 멜빵, 막내 주황 멜빵 + 노란 안전모
const pigsC = { skin: '#F9B4C3', dark: '#F28DA5', nose: '#B0506A', big: '#4C7BE0', mid: '#3FA36B', small: '#F08A3C', hat: '#F4C24F', brick: '#D9694F', brickD: '#8E3B2B', roof: '#8E3B2B', straw: '#F2D27A', strawD: '#C9A13E' };

// 아기돼지 (앞을 봄, 발 기준, s=1일 때 키 약 140). 선 굵기는 크기와 상관없이 같게 보이도록 보정
// o.ov 멜빵 색, o.hat 안전모 색, o.lh / o.rh 손 위치(돼지 좌표), o.face smile|happy|open, o.front 손 위에 그릴 것(돼지 좌표)
function pigsPig(x, y, s = 1, o = {}) {
  const c = pigsC.skin, d = pigsC.dark, W = v => +(v * 0.95 / s).toFixed(2);
  let b = '';
  // 꼬리
  b += pth('M28 -40C40 -44 44 -32 37 -29C31 -27 32 -37 40 -36', 'none', W(2.4));
  // 다리
  b += rect(-17, -20, 12, 20, d, 4, W(2.6)) + rect(5, -20, 12, 20, d, 4, W(2.6));
  // 몸 + 멜빵
  b += circ(0, -46, 30, c, W(2.8));
  if (o.ov) {
    b += pth('M-30 -46H-14V-62H14V-46H30A30 30 0 0 1 -30 -46Z', o.ov, W(2.4));
    b += ln(-12, -62, -19, -73, W(2.6)) + ln(12, -62, 19, -73, W(2.6));
    b += circ(-8, -56, 2, '#fff', 0) + circ(8, -56, 2, '#fff', 0);
  }
  // 귀
  b += pth('M-27 -112L-33 -137L-9 -125Z', c, W(2.6)) + pth('M27 -112L33 -137L9 -125Z', c, W(2.6));
  // 머리
  b += circ(0, -98, 30, c, W(2.8));
  b += ell(0, -90, 13, 9.5, d, W(2.4)) + ell(-4.5, -90, 2, 3, pigsC.nose, 0) + ell(4.5, -90, 2, 3, pigsC.nose, 0);
  const f = o.face || 'smile';
  if (f === 'happy') b += pth('M-16 -104Q-12 -109 -8 -104M8 -104Q12 -109 16 -104', 'none', W(2.4));
  else b += ell(-12, -104, 2.6, 3.4, INK, 0) + ell(12, -104, 2.6, 3.4, INK, 0);
  if (f === 'open') b += pth('M-6 -78Q0 -69 6 -78Z', INK, W(1.6));
  else b += pth('M-6 -77Q0 -72 6 -77', 'none', W(2.2));
  b += circ(-20, -87, 4.2, '#F49A9A', 0, { opacity: .75 }) + circ(20, -87, 4.2, '#F49A9A', 0, { opacity: .75 });
  if (o.hat) b += pth('M-25 -114C-25 -142 25 -142 25 -114Z', o.hat, W(2.6)) + rect(-31, -118, 62, 7, o.hat, 3.5, W(2.4)) + ln(0, -136, 0, -119, W(2.2));
  // 팔
  const lh = o.lh || [-34, -36], rh = o.rh || [34, -36];
  const arm = (sx, sy, [hx, hy], bend) => limb(sx, sy, hx, hy, c, bend, 7 + 2 * W(2.5), 7) + circ(hx, hy, 6, d, W(2.2));
  if (o.back) b += o.back;
  b += arm(-24, -62, lh, o.lb ?? -4) + arm(24, -62, rh, o.rb ?? 4);
  if (o.front) b += o.front;
  return G(b, `translate(${x} ${y}) scale(${s})`);
}

function scPigs() {
  const P = comicPanels(7), panels = [];
  // 칸 크기를 인라인 style로도 고정 (페이지 CSS의 svg 크기 규칙이 칸 svg를 늘리지 않게)
  const addPanel = (k, inner, bg) => panels.push(panelSvg(P[k], inner, bg));
  const wh = k => [P[k][2], P[k][3]];
  const ground = (w, h, y, f) => rect(0, y, w, h - y, f, 0, 0) + ln(0, y, w, y, 2.4);
  const FLOOR = '#E9D9BC', GRASS = '#CFE6B8';
  // 벽돌 하나 (가운데 기준)
  const brick1 = (x, y, r = 0, s = 1) => G(rect(-14, -7.5, 28, 15, pigsC.brick, 2.5, 2.4) + ln(-3, -7.5, -3, 7.5, 1.6, pigsC.brickD), `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  // 벽돌 벽 (벽돌 사이 회색 시멘트 줄)
  const wall = (x, y, w, h, bw = 26, bh = 13, mortar = pigsC.brickD, mw = 1.6) => {
    let b = rect(x, y, w, h, pigsC.brick, 0, 0);
    for (let r = 0; r * bh < h - 1; r++) {
      const yy = y + r * bh;
      if (r) b += ln(x, yy, x + w, yy, mw, mortar);
      for (let xx = x + (r % 2 ? bw / 2 : bw); xx < x + w - 2; xx += bw) b += ln(xx, yy, xx, Math.min(yy + bh, y + h), mw, mortar);
    }
    return b + rect(x, y, w, h, 'none', 0, 2.8);
  };
  // 작은 집 그림: 짚 집 / 벽돌집 (아래 가운데 기준, 너비 w)
  const strawHouse = (x, y, w) => {
    const h = w * 0.7, l = x - w / 2;
    let b = rect(l, y - h, w, h, pigsC.straw, 0, 2.4);
    for (let i = 1; i < 5; i++) b += ln(l + i * w / 5, y - h + 3, l + i * w / 5, y - 3, 1.6, pigsC.strawD);
    b += pth(`M${l - w * 0.14} ${y - h}L${x} ${y - h - w * 0.62}L${l + w * 1.14} ${y - h}Z`, '#E8C25A', 2.4);
    return b;
  };
  const brickHouse = (x, y, w) => {
    const h = w * 0.7, l = x - w / 2;
    let b = wall(l, y - h, w, h, w / 3.2, h / 4);
    b += pth(`M${l - w * 0.14} ${y - h}L${x} ${y - h - w * 0.62}L${l + w * 1.14} ${y - h}Z`, pigsC.roof, 2.4);
    b += rect(x - w * 0.13, y - h * 0.55, w * 0.26, h * 0.55, '#8B5A2B', 2, 2.2);
    return b;
  };

  // 0 modify: 짚 집 설계도에 빨간 ✕, 빨간 펜으로 벽돌집을 새로 그려 넣는 첫째
  {
    const [w, h] = wh(0);
    let o = ground(w, h, 202, FLOOR);
    o += rect(12, 14, 172, 164, '#DDEBF8', 8, 2.8);
    o += tx(98, 46, '설계도 수정', 21);
    // 짚 집 (✕)
    o += strawHouse(50, 160, 52) + cross(50, 132, 28, C.red, 5.5);
    o += arrow(86, 134, 106, 134, C.red, 4, 9);
    // 빨간 펜으로 그린 벽돌집
    const rs = { stroke: C.red, 'stroke-width': 2.8, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', fill: 'none' };
    o += E('path', { d: 'M110 122L141 88L172 122Z', ...rs }) + E('rect', { x: 116, y: 122, width: 50, height: 38, ...rs });
    o += E('path', { d: 'M116 134.7H166M116 147.4H166M132 122V134.7M150 122V134.7M124 134.7V147.4M141 134.7V147.4M158 134.7V147.4M132 147.4V160M150 147.4V160', ...rs, 'stroke-width': 1.8 });
    // 첫째 + 큰 빨간 펜
    const pen = G(pg('0,0 -6,14 6,14', '#F8D9C0', 2.2) + pg('0,0 -2.2,5 2.2,5', INK, 0) + rect(-6, 14, 12, 44, C.red, 3, 2.4) + rect(-6, 50, 12, 10, '#fff', 3, 2.4), 'translate(164 127) rotate(-19)');
    o += pigsPig(211, 230, 0.92, { ov: pigsC.big, lh: [-40, -78], rh: [32, -36], face: 'smile' });
    o += pen + circ(174.2, 158.2, 5.6, pigsC.dark, 2.2);
    addPanel(0, o, '#FBEFD9');
  }

  // 1 specify: 자재 명세서에 '벽돌 1,000장'이 또박또박. 둘째가 지시봉으로 콕
  {
    const [w, h] = wh(1);
    let o = ground(w, h, 204, FLOOR);
    o += rect(18, 24, 152, 194, C.wood, 10, 2.8) + rect(70, 14, 48, 22, '#C9CEDF', 5, 2.6);
    o += rect(28, 42, 132, 166, '#FFFDF8', 4, 2.4);
    o += tx(94, 74, '자재 명세서', 20);
    o += rect(32, 90, 124, 36, '#FFE98A', 5, 0) + tx(94, 115, '벽돌 1,000장', 20, C.red) + ln(40, 130, 148, 130, 3.2, C.red);
    o += rect(44, 152, 92, 8, '#E2DFEA', 4, 0) + rect(44, 174, 70, 8, '#E2DFEA', 4, 0);
    o += pigsPig(211, 230, 0.9, { ov: pigsC.mid, lh: [-40, -72], face: 'smile', back: ln(-40, -72, -76, -122, 5.5, INK) + ln(-40, -72, -76, -122, 2.6, '#C9925E') });
    addPanel(1, o, '#EEE8FB');
  }

  // 2 collaboratively: 삼형제가 벽돌을 손에서 손으로 건네며 함께 쌓기
  {
    const [w, h] = wh(2);
    let o = ground(w, h, 196, GRASS);
    const s = 0.88, fy = 230;
    o += wall(202, 176, 46, 54, 23, 13.5);
    o += bubble(56, 14, 128, 44, 112, 98);
    o += tx(120, 44, '영차! 영차!', 21);
    const nat = (px, py, cx) => [+((px - cx) / s).toFixed(1), +((py - fy) / s).toFixed(1)];
    const hands = [[63, 194], [93, 187], [134, 172], [164, 165], [212, 167]];
    o += pigsPig(38, fy, s, { ov: pigsC.big, face: 'smile', rh: nat(...hands[0], 38) });
    o += pigsPig(112, fy, s, { ov: pigsC.mid, face: 'open', lh: nat(...hands[1], 112), rh: nat(...hands[2], 112) });
    o += pigsPig(186, fy, s, { ov: pigsC.small, hat: pigsC.hat, face: 'happy', lh: nat(...hands[3], 186), rh: nat(...hands[4], 186) });
    // 손에서 손으로 건네는 벽돌 (손은 벽돌 위에 다시 그려서 꽉 잡은 모습)
    o += brick1(78.5, 190.5, -13, 1.12) + brick1(149.5, 168.5, -13, 1.12) + brick1(226, 168, 0, 1.12);
    for (const [hx, hy] of hands) o += circ(hx, hy, 4.8, pigsC.dark, 2.1);
    addPanel(2, o, '#E3F1FB');
  }

  // 3 operate: 막내가 초록 버튼을 눌러 시멘트 믹서를 부릉부릉 돌리는 중
  {
    const [w, h] = wh(3);
    let o = ground(w, h, 200, FLOOR);
    // 받침 + 바퀴
    o += rect(110, 126, 14, 30, '#AEB4C8', 3, 2.6);
    o += rect(92, 154, 76, 40, '#C9CEDF', 6, 2.8) + circ(104, 200, 9, '#5A607E', 2.6) + circ(156, 200, 9, '#5A607E', 2.6);
    o += circ(108, 174, 12, '#7CF29C', 0, { opacity: .45 }) + circ(108, 174, 8.5, '#57D27A', 2.4);
    // 통 (빙글빙글)
    o += G(ell(0, 0, 44, 33, '#F08A3C', 2.8) + pth('M-18 -31Q-26 0 -18 31M10 -32Q2 0 10 32', 'none', 0, { stroke: '#C9622A', 'stroke-width': 3 }) + ell(42, 0, 8, 19, '#7A8199', 2.6), 'translate(124 106) rotate(-24)');
    o += pth('M74 92Q76 66 98 56M150 146Q170 140 176 120', 'none', 0, { stroke: INK, 'stroke-width': 2.6, 'stroke-linecap': 'round' });
    o += bubble(10, 12, 112, 40, 70, 64);
    o += tx(66, 40, '부릉부릉~', 19);
    const s = 0.8, fy = 228;
    o += pigsPig(50, fy, s, { ov: pigsC.small, hat: pigsC.hat, face: 'happy', rh: [+((104 - 50) / s).toFixed(1), +((174 - fy) / s).toFixed(1)] });
    addPanel(3, o, '#E8EEF6');
  }

  // 4 combine: 벽돌 + 시멘트 → 튼튼한 벽
  {
    const [w, h] = wh(4);
    let o = ground(w, h, 206, FLOOR);
    o += brick1(40, 68, 0, 1.45);
    o += ln(82, 56, 82, 80, 5.5, C.red) + ln(70, 68, 94, 68, 5.5, C.red);
    o += pth('M108 40Q106 30 114 26L121 32L128 24L135 32L142 24L149 32L156 24L163 32L170 26Q178 30 176 40L180 96Q180 104 172 104H112Q104 104 104 96Z', '#E6E0D2', 2.6);
    o += tx(142, 76, '시멘트', 19);
    o += arrow(95, 112, 95, 134, INK, 4.5, 11);
    o += wall(26, 144, 138, 62, 34, 15.5, '#AEB4C8', 3.4);
    addPanel(4, o, '#F7E8E8');
  }

  // 5 operational: '방어 시스템 운영 중' 초록불, 늑대가 불어도 벽돌집은 끄떡없음
  {
    const [w, h] = wh(5);
    let o = ground(w, h, 206, GRASS);
    o += ln(160, 84, 160, 140, 6) + ln(160, 84, 160, 140, 2.6, '#C9CEDF');
    o += rect(12, 14, 166, 72, '#FFFDF8', 10, 2.8);
    o += circ(42, 66, 15, '#7CF29C', 0, { opacity: .5 }) + circ(42, 66, 10.5, '#57D27A', 2.6);
    o += tx(95, 41, '늑대 방어 시스템', 18) + tx(112, 76, '운영 중', 26, C.green);
    o += brickHouse(150, 206, 58);
    o += G(wolf(0, 0, 1), 'translate(52 214) scale(0.8)');
    o += pth('M114 150Q100 140 108 128M114 176Q100 168 108 156', 'none', 0, { stroke: '#7FB7E8', 'stroke-width': 3, 'stroke-linecap': 'round' });
    addPanel(5, o, '#E4F4E1');
  }

  // 6 operationally: '한 달 운영비' 그래프: 짚 집은 높고 벽돌집은 낮아요
  {
    const [w, h] = wh(6);
    let o = '';
    o += rect(12, 14, 166, 210, '#FFFDF8', 10, 2.8);
    o += tx(95, 46, '한 달 운영비', 20);
    o += rect(36, 66, 42, 96, '#F59AA6', 3, 2.6) + rect(112, 138, 42, 24, '#7CD992', 3, 2.6);
    o += ln(26, 162, 164, 162, 2.8);
    o += strawHouse(57, 212, 34) + brickHouse(133, 212, 34);
    addPanel(6, o, '#FBEFD9');
  }
  return comicPage(panels);
}

/* ================= 장면 4. 피노키오의 길어지는 코 ================= */
/* ================= 장면: 피노키오의 길어지는 코 (만화 한 쪽, 7칸) ================= */
// 피노키오 공통 색 (모든 칸에서 같은 모습: 초록 뾰족 모자 + 빨간 윗옷 + 파란 바지)
const pinocchioC = { wood: '#EDC28E', nose: '#D99A5B', hat: '#4C7BE0', top: '#E5544B', bot: '#2F6DB5' };

// 피노키오 모자: 파란 뾰족 모자 + 빨간 깃털 (키트 pointyHat)
const pinocchioHat = () => pointyHat(pinocchioC.hat);
// 피노키오 얼굴 (face:'blank'로 눈만 그린 뒤 코·입을 직접 그림). len = 코 길이
function pinocchioFace(f, len, skin) {
  let b = '';
  if (f === 'happy') b += ell(-5, -90.5, 2.8, 3.4, skin, 0) + ell(5, -90.5, 2.8, 3.4, skin, 0) + pth('M-7.5 -90Q-5 -93.5 -2.5 -90', 'none', 1.8) + pth('M2.5 -90Q5 -93.5 7.5 -90', 'none', 1.8);
  if (f === 'worry') b += ln(-8, -95, -3, -96.5, 1.8) + ln(8, -95, 3, -96.5, 1.8);
  if (f === 'smile' || f === 'happy') b += pth('M-4.5 -80.6Q0 -76.6 4.5 -80.6', 'none', 1.9);
  if (f === 'open') b += pth('M-4 -81Q0 -74.6 4 -81Z', INK, 1.2);
  if (f === 'worry') b += pth('M-4 -77.6Q0 -80.8 4 -77.6', 'none', 1.9);
  if (len != null) {   // 나무 코: 얼굴 가운데에서 오른쪽으로 뻗은 뾰족한 막대 (뿌리 쪽 테두리 없음)
    const t = 4 + len, d = `M0.5 -88.4L${t} -86.9Q${t + 2.2} -86.1 ${t} -85.3L0.5 -83.8`;
    b += pth(d + 'Z', pinocchioC.nose, 0) + pth(d, 'none', 1.9);
  }
  return b;
}
// 피노키오 (발 기준). o.nose = 코 길이(사람 좌표, 기본 4), o.real = 진짜 소년(사람 피부, 나무 코 없음)
function pinocchioKid(o) {
  const real = !!o.real, f = o.face || 'smile';
  if (real) return person({ hs: 'short', hair: HR.dark, skin: SK[0], top: pinocchioC.top, bot: pinocchioC.bot, ...o, face: f, extra: pinocchioHat() + (o.extra || '') });
  const extra = pinocchioFace(f, o.nose ?? 14, pinocchioC.wood) + pinocchioHat() + (o.extra || '');
  return person({ hs: 'short', hair: HR.dark, skin: pinocchioC.wood, top: pinocchioC.top, bot: pinocchioC.bot, ...o, face: 'blank', extra });
}
// 밝은 간판: 가운데 x, 위 y, 너비 w, 줄 [[글, 크기, 색]]
function pinocchioSign(cx, y, w, rows) {
  const gap = 5, pad = 10;
  const h = pad * 2 + rows.reduce((a, r) => a + r[1], 0) + gap * (rows.length - 1);
  let b = rect(cx - w / 2, y, w, h, '#FFFDF8', 10, 2.8);
  let yy = y + pad;
  for (const [t, s, c] of rows) { b += tx(cx, yy + s * 0.84, t, s, c || INK); yy += s + gap; }
  return b;
}
// 귀뚜라미 선생님 (키트 cricket 바탕, 모자 대신 동그란 안경)
function pinocchioCricket(x, y, s = 1) {
  const c = '#6FC25A';
  let b = '';
  b += ln(-6, -18, -12, 0, 3) + ln(6, -18, 12, 0, 3) + pth('M-14 0H-8M10 0H16', 'none', 3);
  b += ell(0, -30, 13, 18, c, 2.6) + ell(0, -28, 7, 12, '#BFE89F', 0);
  b += rect(-10, -38, 20, 12, '#E5544B', 3, 2) + pth('M-3 -38L0 -32L3 -38', 'none', 1.6);
  b += pth('M-5 -70C-10 -86 -20 -92 -28 -92M5 -70C10 -86 20 -92 28 -92', 'none', 2.2);
  b += circ(0, -58, 14, c, 2.6);
  b += circ(-5, -60, 4, '#fff', 1.6) + circ(5, -60, 4, '#fff', 1.6) + circ(-4, -60, 1.8, INK, 0) + circ(6, -60, 1.8, INK, 0);
  b += circ(-5.6, -60, 6, 'none', 1.8) + circ(5.6, -60, 6, 'none', 1.8);
  b += pth('M-4.6 -51Q0 -43.6 4.6 -51Z', INK, 1.4);
  b += limb(-10, -36, -24, -46, c, 0, 7, 4.5) + limb(10, -36, 22, -24, c, 0, 7, 4.5);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}
const pinocchioGround = (w, h, y, c) => rect(0, y, w, h - y, c, 0, 0) + ln(0, y, w, y, 2.4);

function scPinocchio() {
  const P = comicPanels(7), panels = [];
  // 칸 크기를 인라인 style로도 고정 (페이지 CSS의 svg 크기 규칙이 칸 svg를 늘리지 않게)
  const addPanel = (k, inner, bg) => panels.push(panelSvg(P[k], inner, bg));
  const wh = k => [P[k][2], P[k][3]];

  /* ---- 0. present: "네!" 손을 번쩍 든 피노키오 + 출석부 '참석' 도장 ---- */
  {
    const [w, h] = wh(0);
    let b = pinocchioGround(w, h, 198, '#E9D9BC');
    b += pinocchioKid({ x: 70, y: 226, s: 1.5, face: 'open', lh: [-21, -120], lb: -6, rh: [17, -38] });
    // 출석부 (클립보드)
    b += rect(134, 50, 112, 160, C.wood, 8, 2.8) + rect(142, 64, 96, 138, '#FFFDF8', 3, 2.2);
    b += rect(170, 42, 40, 16, '#9AA5BF', 4, 2.4);
    b += tx(190, 98, '피노키오', 20, INK) + ln(152, 110, 228, 110, 2, '#C9CEDF');
    b += G(circ(0, 0, 33, 'none', 0, { stroke: C.red, 'stroke-width': 4 }) + circ(0, 0, 26, 'none', 0, { stroke: C.red, 'stroke-width': 1.8 }) + tx(0, 9, '참석', 25, C.red), 'translate(190 152) rotate(-12)');
    addPanel(0, b, '#FBEFD9');
  }

  /* ---- 1. informative: '정직 백과사전'을 들고 머리에 전구가 반짝 ---- */
  {
    const [w, h] = wh(1);
    let b = pinocchioGround(w, h, 198, '#E9D9BC');
    const s = 1.45, px = 116, py = 228;
    const bx = 62, by = 126, bw = 104, bh = 80;           // 책 표지
    const hy = (by + bh / 2 - py) / s, hx = (bw / 2 + 2) / s;  // 손 위치 (사람 좌표)
    b += pinocchioKid({ x: px, y: py, s, face: 'happy', lh: [-hx, hy], rh: [hx, hy] });
    b += pth(`M${bx + bw} ${by + 4}L${bx + bw + 8} ${by + 10}V${by + bh + 6}L${bx + bw} ${by + bh}Z`, '#F4EFE6', 2.4);
    b += rect(bx, by, bw, bh, C.purple, 5, 2.8) + rect(bx, by, 14, bh, '#6E4DB8', 4, 2.4);
    b += rect(bx + 22, by + 10, bw - 32, bh - 20, '#FFFDF8', 4, 2.2);
    b += tx(bx + 6 + bw / 2, by + 36, '정직', 20, INK) + tx(bx + 6 + bw / 2, by + 60, '백과사전', 18, INK);
    b += circ(px - hx * s, py + hy * s, 4.7 * s, pinocchioC.wood, 2.4) + circ(px + hx * s, py + hy * s, 4.7 * s, pinocchioC.wood, 2.4);
    // 전구 (반짝 떠오른 생각)
    const lx = 204, ly = 70;
    for (const [dx, dy] of [[-30, -6], [0, -34], [30, -6], [-21, -26], [21, -26]]) b += ln(lx + dx * 0.72, ly + dy * 0.72, lx + dx, ly + dy, 2.6, '#E0A92E');
    b += circ(lx, ly, 17, '#FFE45C', 2.6) + rect(lx - 8, ly + 14, 16, 12, '#C9CEDF', 3, 2.4) + pth(`M${lx - 5} ${ly + 3}Q${lx} ${ly - 6} ${lx + 5} ${ly + 3}`, 'none', 2);
    addPanel(1, b, '#EEE8FB');
  }

  /* ---- 2. emphasize: 칠판 '거짓말은 절대 안 돼!' + 밑줄을 콕 짚는 귀뚜라미 선생님 ---- */
  {
    const [w, h] = wh(2);
    let b = pinocchioGround(w, h, 204, '#E9D9BC');
    b += rect(8, 18, 152, 134, C.wood, 8, 2.8) + rect(16, 26, 136, 118, '#FFFDF8', 4, 2.2);
    b += rect(20, 152, 128, 8, C.woodD, 3, 2.4);
    b += tx(84, 66, '거짓말은', 22, INK) + tx(84, 106, '절대 안 돼!', 26, C.red);
    b += ln(28, 118, 140, 118, 4, C.red) + ln(36, 127, 132, 127, 4, C.red);
    b += pinocchioCricket(210, 228, 1.42);
    b += ln(176, 163, 140, 123, 4.4, INK) + ln(176, 163, 140, 123, 2, C.woodD);
    addPanel(2, b, '#E8EEF6');
  }

  /* ---- 3. increasingly: 거짓말할수록 코가 점점 길어짐 ---- */
  {
    const [w, h] = wh(3);
    let b = pinocchioGround(w, h, 200, '#CFE6B8');
    b += pinocchioSign(w / 2, 8, 150, [['거짓말할수록', 18], ['점점 길~게!', 20, C.red]]);
    const s = 1.25, px = 40, py = 228, len = 100;
    b += pinocchioKid({ x: px, y: py, s, face: 'worry', nose: len, lh: [-17, -36], rh: [17, -36] });
    const ny = py - 86 * s;
    for (const k of [0.36, 0.68]) { const x = px + (3 + len * k) * s; b += ln(x, ny - 9, x, ny + 9, 2.2, '#8B5A2B', { 'stroke-dasharray': '3 3' }); }
    b += arrow(78, ny + 24, 170, ny + 24, C.red, 3.6, 10);
    addPanel(3, b, '#E3F1FB');
  }

  /* ---- 4. indicative of ~: 새 둥지까지 생긴 아주 긴 코 = 거짓말 신호 ---- */
  {
    const [w, h] = wh(4);
    let b = pinocchioGround(w, h, 200, '#CFE6B8');
    const s = 1.25, px = 36, py = 228, len = 108;
    b += pinocchioKid({ x: px, y: py, s, face: 'worry', nose: len, lh: [-17, -36], rh: [17, -36] });
    const ny = py - 86 * s, nx = 146;
    // 둥지 + 새
    b += birdHead(nx + 4, ny - 22, 1.15, '#4C9BE0');
    b += pth(`M${nx - 24} ${ny - 8}C${nx - 22} ${ny + 8} ${nx + 22} ${ny + 8} ${nx + 24} ${ny - 8}Q${nx} ${ny - 16} ${nx - 24} ${ny - 8}Z`, '#B07A4A', 2.6);
    b += pth(`M${nx - 18} ${ny - 4}L${nx + 18} ${ny - 6}M${nx - 14} ${ny + 1}L${nx + 14} ${ny}`, 'none', 0, { stroke: '#6B4430', 'stroke-width': 1.8, 'stroke-linecap': 'round' });
    // 표지판
    b += ln(126, 168, 126, 206, 6, INK) + ln(126, 168, 126, 206, 2.6, '#8B5A2B');
    b += pinocchioSign(126, 128, 116, [['긴 코는', 18], ['거짓말 신호!', 18, C.red]]);
    addPanel(4, b, '#E4F4E1');
  }

  /* ---- 5. indicate: 벽의 거짓말 측정기 바늘이 '거짓말'을 가리킴 ---- */
  {
    const [w, h] = wh(5);
    let b = '';
    const cx = 95, cy = 202, r = 70;
    b += rect(12, 62, 166, 162, '#FFFDF8', 14, 3);
    // 경고등
    b += rect(83, 52, 24, 12, '#9AA5BF', 3, 2.4) + pth('M80 54C80 34 110 34 110 54Z', '#FF6B6B', 2.6);
    for (const [dx, dy] of [[-28, -4], [0, -26], [28, -4]]) b += ln(95 + dx * 0.72, 42 + dy * 0.72, 95 + dx, 42 + dy, 2.6, C.red);
    // 눈금판
    b += pth(`M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx} ${cy - r}V${cy}Z`, '#9FDDAE', 2.6);
    b += pth(`M${cx} ${cy - r}A${r} ${r} 0 0 1 ${cx + r} ${cy}H${cx}Z`, '#FFA3AE', 2.6);
    b += tx(50, 112, '진실', 20, '#2E7D46') + tx(140, 112, '거짓말', 20, '#C2283C');
    const a = 52 * Math.PI / 180, nl = 60;
    b += ln(cx, cy, cx + Math.cos(a) * nl, cy - Math.sin(a) * nl, 5, INK) + circ(cx, cy, 7, INK, 0);
    addPanel(5, b, '#E8EEF6');
  }

  /* ---- 6. achieve: 진짜 소년이 되어 트로피를 번쩍! '꿈을 이뤘어요!' ---- */
  {
    const [w, h] = wh(6);
    let b = pinocchioGround(w, h, 200, '#CFE6B8');
    const s = 1.3, px = 112, py = 228;
    const rh = [36, -110], tx0 = px + rh[0] * s, ty0 = py + rh[1] * s;
    // 트로피 (오른손에 번쩍)
    b += G(pth('M-14 -30H14V-22Q14 -6 0 -4Q-14 -6 -14 -22Z', '#F4C24F', 2.4) + pth('M-14 -26Q-23 -26 -21 -18Q-19 -12 -12 -12M14 -26Q23 -26 21 -18Q19 -12 12 -12', 'none', 2.4) + rect(-3, -5, 6, 7, '#E0A92E', 1, 2) + rect(-10, 1, 20, 6, '#E0A92E', 2, 2.2), `translate(${tx0} ${ty0 - 4})`);
    b += pinocchioKid({ x: px, y: py, s, real: true, face: 'happy', lh: [-20, -60], lb: -6, rh, rb: 6 });
    b += bubble(8, 8, 96, 58, 92, 90);
    b += tx(56, 33, '꿈을', 20, INK) + tx(56, 57, '이뤘어요!', 20, C.red);
    addPanel(6, b, '#FBEFD9');
  }

  return comicPage(panels);
}

/* ================= 장면 5. 로빈 후드와 셔우드 숲 ================= */
const coin = (x, y, r = 7) => circ(x, y, r, '#F4C24F', 2.2) + circ(x, y, r * 0.55, 'none', 1.2, { stroke: '#C8942C' });
/* ================= 장면: 로빈 후드와 셔우드 숲 (만화 한 쪽, 7칸) ================= */
function scRobin() {
  const P = comicPanels(7), panels = [];
  // 칸 크기를 인라인 style로도 고정 (페이지 CSS의 svg 크기 규칙이 칸 svg를 늘리지 않게)
  const addPanel = (k, inner, bg) => panels.push(panelSvg(P[k], inner, bg));
  const wh = k => [P[k][2], P[k][3]];

  /* ---- 공통 색 ---- */
  const GREEN = '#2E8B4E', PANTS = '#5A4632', WOOD = '#A8744C', WOOD_D = '#83552F', NEW_WOOD = '#F2D29B';
  const GRASS = '#CFE6B8', FLOOR = '#E9D9BC', WATER = '#BFE0F5';
  const LEAF1 = '#D6ECCD', LEAF2 = '#A9D69C', LEAF3 = '#6DB77F', LEAF4 = '#4FA36A';

  /* ---- 공통 조각 ---- */
  const ground = (w, h, y, f) => rect(0, y, w, h - y, f, 0, 0) + ln(0, y, w, y, 2.4);
  // 밝은 간판: 가운데 cx, 위 y, 너비 w, 줄 [[글, 크기, 색]]
  const sign = (cx, y, w, rows) => {
    const gap = 6, pad = 10;
    const h = pad * 2 + rows.reduce((a, r) => a + r[1], 0) + gap * (rows.length - 1);
    let b = rect(cx - w / 2, y, w, h, '#FFFDF8', 9, 2.8);
    let yy = y + pad;
    for (const [t, s, c] of rows) { b += tx(cx, yy + s * 0.84, t, s, c || INK); yy += s + gap; }
    return b;
  };
  // 말풍선 + 글 (꼬리 끝 tX,tY)
  const say = (x, y, w, rows, tX, tY) => {
    const gap = 5, pad = 10;
    const h = pad * 2 + rows.reduce((a, r) => a + r[1], 0) + gap * (rows.length - 1);
    let b = bubble(x, y, w, h, tX, tY);
    let yy = y + pad;
    for (const [t, s, c] of rows) { b += tx(x + w / 2, yy + s * 0.84, t, s, c || INK); yy += s + gap; }
    return b;
  };
  // 로빈 후드: 모든 칸에서 같은 모습 (초록 두건 + 빨간 깃털, 초록 옷, 갈색 바지)
  const robin = o => person({ hs: 'short', hair: HR.brown, top: GREEN, bot: PANTS, face: 'happy', ...o, extra: hood() + (o.extra || '') });
  const coin = (x, y, r = 8) => circ(x, y, r, '#F4C24F', 2.4) + circ(x, y, r * 0.55, 'none', 0, { stroke: '#C8942C', 'stroke-width': 1.6 });
  // 멀리 보이는 숲: 둥근 나무 꼭대기가 칸 양 끝까지 이어지는 띠
  const canopy = (w, h, y, rs, f, off = 0) => {
    let x = -14 - off, d = `M${x} ${h + 4}V${y}`, i = 0;
    while (x < w + 14) { const r = rs[i++ % rs.length]; d += `A${r} ${r} 0 0 1 ${x + 2 * r} ${y}`; x += 2 * r; }
    return pth(d + `V${h + 4}Z`, f, 2.4);
  };

  /* 0 expansive: 언덕 위 로빈이 손차양을 하고 끝없이 펼쳐진 숲을 바라봄 */
  {
    const [w, h] = wh(0);
    let o = '';
    o += canopy(w, h, 112, [7, 9, 8], LEAF1, 2);
    o += canopy(w, h, 140, [11, 13, 10], LEAF2, 7);
    for (let i = -1; i < 9; i++) o += pine(i * 32 + 12, 204, 0.62, LEAF3);
    o += rect(-4, 200, w + 8, 60, LEAF3, 0, 0) + ln(-4, 200, w + 4, 200, 2.4);
    o += pth(`M-10 ${h + 4}V206Q60 192 128 210Q146 218 150 ${h + 4}Z`, GRASS, 2.4); // 앞 언덕
    o += robin({ x: 66, y: 220, s: 1.12, lh: [-44, -82], lb: 6, rh: [44, -82], rb: -6 });
    o += say(122, 14, 114, [['끝이 안', 20], ['보여!', 22, C.red]], 112, 98);
    addPanel(0, o, '#E3F1FB');
  }

  /* 1 expend: 금화 자루를 거꾸로 들고 마을을 위해 아낌없이 씀 */
  {
    const [w, h] = wh(1);
    let o = ground(w, h, 204, FLOOR);
    // 거꾸로 든 자루 + 쏟아지는 금화
    // 거꾸로 든 자루: 불룩한 바닥이 위, 벌어진 입구가 아래
    // 천 돈주머니(둥근 몸통 + 묶음 끈 + 주름진 입구)를 기울여 금화를 쏟음
    const sack = G(pth('M-15 -36C-46 -26 -44 8 0 8C44 8 46 -26 15 -36Z', '#C99A63', 3) +
      pth('M-12 -14Q-20 -4 -14 2', 'none', 2.2) +
      pth('M-15 -38L-26 -58Q-19 -53 -13 -60Q-6 -53 0 -61Q6 -53 13 -60Q19 -53 26 -58L15 -38Z', '#C99A63', 2.6) +
      rect(-18, -42, 36, 8, '#8B5A2B', 3, 2.4), 'translate(166 78) rotate(122)');
    for (const [cx, cy] of [[206, 110], [198, 136], [216, 146], [204, 170], [220, 192]]) o += coin(cx, cy);
    o += robin({ x: 88, y: 224, s: 1.22, lh: [-22, -44], lb: -10, rh: [50, -108], rb: 8 });
    o += sack;
    o += say(10, 12, 112, [['마을 위해', 19], ['다 쓰자!', 22, C.red]], 74, 92);
    addPanel(1, o, '#FBEFD9');
  }

  /* 2 charity: '셔우드 자선단체' 천막에서 로빈이 할머니께 빵을 건넴 */
  {
    const [w, h] = wh(2);
    let o = ground(w, h, 212, FLOOR);
    o += rect(24, 80, 136, 132, '#FFF4D6', 0, 2.6); // 천막 안
    o += robin({ x: 92, y: 212, s: 1.0, lh: [-18, -50], lb: -6, rh: [50, -66], rb: 8 });
    o += rect(14, 164, 156, 50, WOOD, 3, 2.8) + ln(14, 175, 170, 175, 2.4);
    o += ln(24, 80, 24, 166, 6, INK) + ln(24, 80, 24, 166, 3, WOOD_D) + ln(160, 80, 160, 166, 6, INK) + ln(160, 80, 160, 166, 3, WOOD_D);
    o += pth('M10 80L28 44H156L174 80Q160 92 146 80Q132 92 118 80Q104 92 92 80Q78 92 64 80Q50 92 38 80Q24 92 10 80Z', '#E5544B', 2.8);
    o += sign(92, 8, 148, [['셔우드 자선단체', 19]]);
    o += person({ x: 212, y: 228, s: 1.1, hs: 'bun', hair: HR.grey, top: '#8C66D9', bot: '#4A4F6B', face: 'happy', lh: [-26, -70], lb: -6, rh: [16, -40] });
    o += G(ell(0, 0, 15, 9, '#E2A85E', 2.6) + pth('M-6 -6Q-4 0 -6 6M0 -8Q2 0 0 8M6 -6Q8 0 6 6', 'none', 1.8), 'translate(162 148) rotate(-8)');
    addPanel(2, o, '#F7E8E8');
  }

  /* 3 restore: 무너진 다리를 새 판자로 튼튼하게 복구 */
  {
    const [w, h] = wh(3);
    let o = rect(0, 176, w, h - 176, WATER, 0, 0) + ln(0, 176, w, 176, 2.4);
    o += pth(`M-10 154H22Q38 170 40 ${h + 4}H-10Z`, GRASS, 2.4) + pth(`M${w + 10} 154H${w - 22}Q${w - 38} 170 ${w - 40} ${h + 4}H${w + 10}Z`, GRASS, 2.4);
    // 기둥 + 밧줄 난간
    const post = x => ln(x, 98, x, 150, 7, INK) + ln(x, 98, x, 150, 3.6, WOOD_D);
    o += post(22) + post(w - 22) + pth(`M22 104Q${w / 2} 128 ${w - 22} 104`, 'none', 0, { stroke: '#8B5A2B', 'stroke-width': 3, 'stroke-linecap': 'round' });
    // 상판: 가운데 새 판자 두 장
    o += rect(12, 150, w - 24, 14, WOOD, 3, 2.8);
    for (let x = 12 + 20; x < w - 12; x += 20) o += ln(x, 150, x, 164, 1.8, WOOD_D);
    o += rect(92, 150, 40, 14, NEW_WOOD, 0, 2.4) + circ(98, 157, 1.8, INK, 0) + circ(126, 157, 1.8, INK, 0) + ln(112, 150, 112, 164, 1.8, '#C9A46A');
    // 망치 든 로빈
    o += G(rect(-4, -26, 8, 32, WOOD_D, 2, 2.4) + rect(-16, -38, 32, 14, '#7A8199', 3, 2.6), 'translate(40 52) rotate(-20)');
    o += robin({ x: 66, y: 151, s: 1.0, lh: [-26, -98], lb: -6, rh: [20, -44], rb: 8 });
    o += sign(w - 48, 16, 80, [['다리', 19], ['복구 끝!', 19, C.green]]);
    addPanel(3, o, '#E3F1FB');
  }

  /* 4 diverse: 거인 리틀 존, 꼬마 궁수, 사슴 — 키도 모습도 제각각 */
  {
    const [w, h] = wh(4);
    let o = ground(w, h, 206, GRASS);
    o += ln(20, 92, 20, 222, 7, INK) + ln(20, 92, 20, 222, 3.6, WOOD_D); // 지팡이
    o += person({ x: 50, y: 224, s: 1.32, hs: 'curly', hair: HR.dark, skin: SK[2], top: WOOD, bot: PANTS, face: 'happy', lh: [-22, -60], lb: -6, rh: [20, -40], extra: beard('#3A2B24') });
    o += person({ x: 94, y: 224, s: 0.7, hs: 'short', hair: HR.red, top: '#E2A23B', bot: PANTS, face: 'happy', lh: [-18, -42], rh: [22, -62], rb: 4, extra: bowArc() });
    o += deer(145, 224, 0.7);
    o += sign(w / 2, 12, 150, [['키도 모습도', 19], ['제각각!', 21, C.red]]);
    addPanel(4, o, '#EEE8FB');
  }

  /* 5 biologically: 터크 수사가 돋보기로 약초를 관찰하며 연구 */
  {
    const [w, h] = wh(5);
    let o = ground(w, h, 206, GRASS);
    // 약초
    const leaf = (r, s2) => G(pth('M0 0C-6 -10 -6 -22 0 -30C6 -22 6 -10 0 0Z', LEAF3, 2.2 / s2) + ln(0, -2, 0, -26, 1.4 / s2, '#2E7D46'), `rotate(${r}) scale(${s2})`);
    o += G(ln(0, 0, 0, -58, 2.8, '#2E7D46') + G(leaf(-55, 1.1), 'translate(0 -14)') + G(leaf(55, 1.1), 'translate(0 -28)') + G(leaf(-40, 1.1), 'translate(0 -42)') + G(leaf(0, 1.1), 'translate(0 -56)'), 'translate(44 214)');
    o += person({ x: 132, y: 226, s: 1.3, hs: 'bald', hair: HR.brown, top: '#8B5A2B', bot: '#5A4632', face: 'wow', under: robe('#8B5A2B', '#8B5A2B') + ln(-16, -44, 16, -44, 3, '#F4EFE6') + ln(6, -44, 8, -26, 2.6, '#F4EFE6'), lh: [-34, -64], lb: -6, rh: [16, -42] });
    // 돋보기 (손 → 렌즈): 렌즈 속 잎이 크게 보임
    o += ln(88, 143, 72, 152, 7, INK) + ln(88, 143, 72, 152, 3.4, WOOD_D);
    o += circ(52, 160, 22, '#EAF6FF', 0) + G(leaf(-40, 1.5), 'translate(54 176)') + circ(52, 160, 22, 'none', 3.6);
    o += say(10, 12, 124, [['약초 관찰 중!', 18]], 112, 74);
    addPanel(5, o, '#FBEFD9');
  }

  /* 6 preserve: 울타리로 지키는 커다란 보호수 — 영원히 보존 */
  {
    const [w, h] = wh(6);
    let o = ground(w, h, 206, GRASS);
    o += tree(w / 2, 206, 1.72, LEAF4);
    for (let x = 18; x < w - 8; x += 22) o += rect(x - 4, 176, 8, 46, '#FFFDF8', 2, 2.2);
    o += rect(8, 186, w - 16, 6, '#FFFDF8', 2, 2.2) + rect(8, 204, w - 16, 6, '#FFFDF8', 2, 2.2);
    o += sign(w / 2, 172, 136, [['영원히 보존!', 20, C.green]]);
    addPanel(6, o, '#E3F1FB');
  }

  return comicPage(panels);
}

/* ================= 장면 6. 알라딘과 요술 램프 ================= */
const note = (x, y, c = INK) => pth(`M${x} ${y}V${y - 18}L${x + 10} ${y - 21}V${y - 4}`, 'none', 2.4, { stroke: c }) + ell(x - 3, y, 4, 3, c, 0) + ell(x + 7, y - 4, 4, 3, c, 0);
/* ================= 장면: 알라딘과 요술 램프 (만화 한 쪽, 6칸) ================= */
// 칸 순서 = 이야기 순서: user-friendly, term, attire, innovative, participatory, implement

// 밝은 간판: 가운데 x, 위 y, 너비 w, 줄 [[글, 크기, 색]]
function aladdinSign(cx, y, w, rows, f = '#FFFDF8') {
  const gap = 6, pad = 11;
  const h = pad * 2 + rows.reduce((a, r) => a + r[1], 0) + gap * (rows.length - 1);
  let b = rect(cx - w / 2, y, w, h, f, 10, 2.8);
  let yy = y + pad;
  for (const [t, s, c] of rows) { b += tx(cx, yy + s * 0.84, t, s, c || INK); yy += s + gap; }
  return b;
}
// 말풍선 + 글 (꼬리 끝 tx_, ty_)
function aladdinBubble(x, y, w, rows, tx_, ty_) {
  const gap = 6, pad = 11;
  const h = pad * 2 + rows.reduce((a, r) => a + r[1], 0) + gap * (rows.length - 1);
  let b = bubble(x, y, w, h, tx_, ty_, '#FFFDF8', 2.8);
  let yy = y + pad;
  for (const [t, s, c] of rows) { b += tx(x + w / 2, yy + s * 0.84, t, s, c || INK); yy += s + gap; }
  return b;
}
const aladdinGround = (w, h, y, c) => rect(0, y, w, h - y, c, 0, 0) + ln(0, y, w, y, 2.4);
// 크게 키운 키트 그림의 테두리 선을 가늘게 (팔다리처럼 굵은 선은 그대로)
const aladdinThin = (svg, f) => svg.replace(/stroke-width="([\d.]+)"/g, (m, v) => +v <= 3.2 ? `stroke-width="${(+v * f).toFixed(2)}"` : m);

function scAladdin() {
  const P = comicPanels(6), panels = [];
  const wh = k => [P[k][2], P[k][3]];
  // 칸 svg 크기를 인라인 style로도 고정 (페이지 CSS의 svg 크기 규칙이 칸 svg까지 늘리지 않게)
  const addPanel = (k, inner, bg) => panels.push(panelSvg(P[k], inner, bg));

  /* ---- 등장인물 (모든 칸에서 같은 모습) ---- */
  const SKN = SK[1], HAIRC = HR.black, PURPLE = '#8C66D9', GOLD = '#F4C24F', RAG = '#A8744C', RAGD = '#8B5A2B';
  const patch = rect(-12, -66, 8, 8, '#C9A27A', 1, 1.4) + rect(4, -52, 9, 8, '#8E94AA', 1, 1.4);
  // 왕자님 알라딘: 흰 셔츠 + 금빛 조끼 + 보라 바지 + 흰 터번
  const prince = o => person({ hs: 'short', hair: HAIRC, skin: SKN, top: '#FFFFFF', bot: PURPLE, vest: GOLD, face: 'happy', extra: turban('#fff'), ...o });
  // 왕 알라딘: 보라 망토 + 왕관
  const king = o => person({ hs: 'short', hair: HAIRC, skin: SKN, top: PURPLE, face: 'happy', under: robe(PURPLE), extra: crown(), ...o });

  /* ---- 0. user-friendly: 쓱쓱 문지르기만 하면 지니가 펑! ---- */
  {
    const [w, h] = wh(0);
    let b = aladdinGround(w, h, 204, '#E9D9BC');
    // 지니 (램프 주둥이에서 피어오름)
    b += G(genie(0, 0, 1, { lh: [-44, -176], rh: [60, -176] }), 'translate(53 158) scale(0.68)');
    // 커다란 램프 (주둥이가 왼쪽)
    b += G(aladdinThin(lamp(0, 0, 1), 1.3 / 1.8), 'translate(150 214) scale(-1.8 1.8)');
    // 알라딘의 손 (누더기 소매)이 램프를 쓱쓱
    const hx = 168, hy = 180;
    b += limb(w + 16, 140, hx + 6, hy - 2, RAG, -3, 20, 14.5);
    b += G(rect(-6, -5, 12, 10, '#C9A27A', 1.5, 1.6), `translate(${w - 18} 150) rotate(-14)`);
    b += circ(hx, hy, 10, SKN, 2.6);
    b += pth(`M${hx + 8} ${hy - 26}q8 -7 16 0M${hx + 16} ${hy - 38}q8 -7 16 0`, 'none', 2.6);
    b += aladdinSign(178, 12, 136, [['사용법은 간단!', 20], ['쓱쓱 문지르기', 20, C.purple]]);
    addPanel(0, b, '#E8EEF6');
  }

  /* ---- 1. term: 소원 이용 약관 = 소원은 딱 3개! ---- */
  {
    const [w, h] = wh(1);
    let b = aladdinGround(w, h, 206, '#E9D9BC');
    const GC = '#9B7BE8', glh = [-34, -172];
    const three = [-6, 0, 6].map((fx, i) => rect(glh[0] + fx - 2.6, glh[1] - 17 + (i === 1 ? -2 : 0), 5.2, 16, GC, 2.6, 2)).join('') + circ(glh[0], glh[1], 6.5, GC, 2.2);
    b += G(aladdinThin(genie(0, 0, 1, { lh: glh, rh: [58, -112] }), 0.95) + aladdinThin(three, 0.95), 'translate(60 228) scale(0.95)');
    // 약관 두루마리
    const sx = 104, sy = 32, sw = 136, sh = 132;
    b += rect(sx, sy + 8, sw, sh - 16, '#FFF4D6', 2, 2.6);
    b += rect(sx - 6, sy, sw + 12, 15, '#E8C48E', 7, 2.6) + rect(sx - 6, sy + sh - 15, sw + 12, 15, '#E8C48E', 7, 2.6);
    b += tx(sx + sw / 2, sy + 46, '소원 이용 약관', 18, '#8B2E3C');
    b += ln(sx + 14, sy + 58, sx + sw - 14, sy + 58, 2, '#D9C8A8');
    b += tx(sx + sw / 2, sy + 90, '소원은 딱 3개!', 20, C.red);
    addPanel(1, b, '#FBEFD9');
  }

  /* ---- 2. attire: 누더기 옷 → 반짝이는 왕자님 복장 ---- */
  {
    const [w, h] = wh(2);
    let b = aladdinGround(w, h, 200, '#E9D9BC');
    // 바닥에 벗어 둔 누더기 옷
    b += G(pth('M-14 -16L-30 -10L-38 2L-26 8L-20 0L-20 16L-14 13L-8 17L-2 13L4 17L10 13L16 17L20 16L20 0L26 8L38 2L30 -10L14 -16Q0 -9 -14 -16Z', RAG, 2.6) + rect(-14, -6, 9, 8, '#C9A27A', 1, 1.6) + rect(5, 1, 10, 8, '#8E94AA', 1, 1.6), 'translate(56 210) rotate(-6) scale(1.15)');
    b += prince({ x: 176, y: 222, s: 1.5, lh: [-22, -44], rh: [30, -98], rb: 6 });
    b += aladdinBubble(10, 10, 136, [['내 누더기가', 20], ['왕자님 옷으로!', 20, C.purple]], 154, 94);
    addPanel(2, b, '#EEE8FB');
  }

  /* ---- 3. innovative: 하늘을 나는 세계 최초 양탄자 ---- */
  {
    const [w, h] = wh(3);
    let b = cloud(196, 224, 0.62);
    b += prince({ x: 150, y: 212, s: 1.2, legs: false, lh: [-24, -54], rh: [28, -100], rb: 6 });
    b += G(aladdinThin(carpet(0, 0, 1), 1.1 / 1.25), 'translate(146 172) scale(1.25)');
    for (const sy of [160, 174, 188]) b += ln(14, sy, 36, sy, 3, '#8E94AA');
    b += aladdinBubble(10, 12, 122, [['세계 최초', 22, C.red], ['비행 양탄자!', 20]], 130, 92);
    addPanel(3, b, '#E3F1FB');
  }

  /* ---- 4. participatory: 온 마을이 함께 춤추는 축제 ---- */
  {
    const [w, h] = wh(4);
    let b = aladdinGround(w, h, 206, '#CFE6B8');
    // 손에 손 잡고 번쩍 (이웃끼리 손이 딱 만나도록 칸 좌표로 맞춤)
    const s1 = 1.08, sK = 0.82, fy = 218, xs = [40, 96, 152], xK = 208, hy = -84;
    const hands = [0, 1, 2].map(i => xs[i] + 26 * s1);                  // 어른 i의 오른손 x
    const kidL = [(hands[2] - xK) / sK, (fy + hy * s1 - fy) / sK];
    b += person({ x: xs[0], y: fy, s: s1, hs: 'bald', hair: HR.grey, skin: SK[0], top: C.teal, bot: '#4A4F6B', face: 'happy', lh: [-24, -98], rh: [26, hy] });
    b += prince({ x: xs[1], y: fy, s: s1, lh: [-26, hy], rh: [26, hy] });
    b += person({ x: xs[2], y: fy, s: s1, hs: 'pony', hair: HR.brown, skin: SK[2], top: C.red, skirt: GOLD, face: 'happy', lh: [-26, hy], rh: [26, hy] });
    b += person({ x: xK, y: fy, s: sK, hs: 'short', hair: HR.dark, skin: SK[0], top: C.blue, bot: '#4A4F6B', face: 'happy', lh: kidL, rh: [22, -104] });
    b += aladdinSign(w / 2, 12, 156, [['마을 축제', 20, C.red], ['다 함께 춤춰요!', 22]]);
    addPanel(4, b, '#E4F4E1');
  }

  /* ---- 5. implement: 왕이 된 알라딘이 '무료 간식법' 시행 ---- */
  {
    const [w, h] = wh(5);
    let b = aladdinGround(w, h, 206, '#E9D9BC');
    // 왕의 명령서 (두루마리를 번쩍 들어 보임)
    const dx = 104, dy = 16, dw = 136, dh = 92;
    b += rect(dx, dy + 6, dw, dh - 12, '#FFFDF8', 2, 2.6);
    b += rect(dx - 6, dy, dw + 12, 13, PURPLE, 6.5, 2.6) + rect(dx - 6, dy + dh - 13, dw + 12, 13, PURPLE, 6.5, 2.6);
    b += tx(dx + dw / 2, dy + 44, '무료 간식법', 22) + tx(dx + dw / 2, dy + 72, '오늘부터 시행!', 20, C.red);
    b += king({ x: 66, y: 222, s: 1.5, lh: [-22, -46], rh: [36, -79], rb: 8 });
    // 간식을 받은 아이
    b += person({ x: 196, y: 222, s: 0.86, hs: 'pony', hair: HR.brown, skin: SK[0], top: C.green, skirt: GOLD, face: 'happy', lh: [-16, -44], rh: [18, -92] });
    b += G(pg('-7,0 7,0 0,18', '#E8B878', 2) + circ(0, -4, 8, '#FF9EC0', 2.2), `translate(${196 + 18 * 0.86} ${222 - 92 * 0.86 - 14})`);
    addPanel(5, b, '#FBEFD9');
  }

  return comicPage(panels);
}

/* ================= 장면 7. 별주부전: 용궁 출근기 ================= */
const seaweed = (x, y, h, c = '#3FA36B') => pth(`M${x} ${y}C${x - 10} ${y - h * .3} ${x + 10} ${y - h * .6} ${x} ${y - h}`, 'none', 0, { stroke: INK, 'stroke-width': 9, 'stroke-linecap': 'round' }) + pth(`M${x} ${y}C${x - 10} ${y - h * .3} ${x + 10} ${y - h * .6} ${x} ${y - h}`, 'none', 0, { stroke: c, 'stroke-width': 5, 'stroke-linecap': 'round' });
/* ================= 장면: 별주부전 용궁 출근기 (만화 한 쪽, 6칸) ================= */
// 칸 순서 = 이야기 순서: report to work, respective, consult, instruct A to-v, confidential, update

// 밝은 간판: 가운데 x, 위 y, 너비 w, 줄 [[글, 크기, 색]]
function seaSign(cx, y, w, rows, f = '#FFFDF8') {
  const gap = 6, pad = 11;
  const h = pad * 2 + rows.reduce((a, r) => a + r[1], 0) + gap * (rows.length - 1);
  let b = rect(cx - w / 2, y, w, h, f, 10, 2.8);
  let yy = y + pad;
  for (const [t, s, c] of rows) { b += tx(cx, yy + s * 0.84, t, s, c || INK); yy += s + gap; }
  return b;
}
// 말풍선 + 글 (꼬리 끝 tx_, ty_)
function seaBubble(x, y, w, rows, tx_, ty_) {
  const gap = 6, pad = 11;
  const h = pad * 2 + rows.reduce((a, r) => a + r[1], 0) + gap * (rows.length - 1);
  let b = bubble(x, y, w, h, tx_, ty_, '#FFFDF8', 2.8);
  let yy = y + pad;
  for (const [t, s, c] of rows) { b += tx(x + w / 2, yy + s * 0.84, t, s, c || INK); yy += s + gap; }
  return b;
}
// 모래 바닥 띠 (윗선 하나)
const seaSand = (w, h, y) => rect(0, y, w, h - y, '#F2DFA8', 0, 0) + ln(0, y, w, y, 2.4);
// 크게 키운 키트 그림의 테두리 선을 가늘게 (팔다리처럼 굵은 선은 그대로)
const seaThin = (svg, f) => svg.replace(/stroke-width="([\d.]+)"/g, (m, v) => +v <= 3.2 ? `stroke-width="${(+v * f).toFixed(2)}"` : m);

// 꽃게 (집게를 위로 든 모습, 발 기준)
function seaCrab(x, y, s = 1) {
  const c = '#E5544B';
  let b = '';
  b += ln(-7, -26, -8, -38, 2.4) + ln(7, -26, 8, -38, 2.4);
  b += circ(-8, -41, 5, '#fff', 2) + circ(8, -41, 5, '#fff', 2) + circ(-8, -41, 2.2, INK, 0) + circ(8, -41, 2.2, INK, 0);
  b += limb(-19, -18, -23, -38, c, 3, 8, 5) + limb(19, -18, 23, -38, c, -3, 8, 5);
  b += pth('M-23 -36C-33 -40 -33 -56 -25 -60L-23 -50L-17 -56C-13 -48 -15 -38 -23 -36Z', c, 2.2);
  b += pth('M23 -36C33 -40 33 -56 25 -60L23 -50L17 -56C13 -48 15 -38 23 -36Z', c, 2.2);
  b += ell(0, -14, 24, 15, c, 2.6) + pth('M-6 -10Q0 -5 6 -10', 'none', 2);
  return G(b, `translate(${x} ${y}) scale(${s})`);
}

function scSea() {
  const P = comicPanels(6), panels = [];
  const wh = k => [P[k][2], P[k][3]];
  const add = (k, inner, bg) => panels.push(panelSvg(P[k], inner, bg));

  /* ---- 등장인물 (모든 칸에서 같은 모습) ---- */
  // 자라: 초록 등딱지 + 빨간 넥타이 회사원
  const turtle = (x, y, s, o = {}) => seaThin(turtleWorker(x, y, s, o), 0.95 / s);
  // 용왕: 회색 머리 + 흰 수염 + 금관 + 청록 용포
  const KING = '#2EA6A0';
  const king = o => seaThin(person({ hs: 'bald', hair: HR.grey, skin: SK[0], top: KING, face: 'smile', under: robe(KING), extra: beard() + crown(), ...o }), 0.95 / (o.s || 1));

  /* ---- 0. report to work: 아침 9시, 자라가 사원증을 찍고 출근 ---- */
  {
    const [w, h] = wh(0);
    let b = seaSand(w, h, 188);
    // 출입 단말기 (기둥 + 초록불)
    b += rect(48, 126, 10, 68, '#8E94AA', 3, 2.6);
    b += rect(34, 100, 38, 30, '#3A3F57', 6, 2.6) + circ(53, 115, 5, '#7CF29C', 2);
    // 자라 (사원증을 단말기에 대는 중, 다른 손엔 서류 가방)
    const s = 1.5, x0 = 168, y0 = 202;
    b += rect(x0 + 30, y0 - 42, 36, 26, '#A8744C', 4, 2.6) + pth(`M${x0 + 40} ${y0 - 42}V${y0 - 48}H${x0 + 56}V${y0 - 42}`, 'none', 2.4);
    b += turtle(x0, y0, s, { lh: [-56, -57], rh: [32, -32] });
    b += G(rect(-9, -7, 18, 14, '#fff', 2, 2) + rect(-6, -4, 6, 6, '#9CC3F0', 1, 0), `translate(${x0 - 56 * s - 4} ${y0 - 57 * s - 4}) rotate(-8)`);
    b += seaSign(74, 12, 124, [['아침 9시', 20], ['출근 완료!', 22, C.red]]);
    add(0, b, '#DDF0F4');
  }

  /* ---- 1. respective: 신하들이 각각의 자리에서 일해요 ---- */
  {
    const [w, h] = wh(1);
    let b = seaSand(w, h, 198);
    const xs = [50, 128, 206], dy = 152;
    // 꽃게 (서류), 복어 (계산기), 물고기 (안내 종): 각자 자기 책상 뒤에서
    b += seaCrab(xs[0], dy + 10, 1.22);
    b += seaThin(puffer(xs[1] - 4, dy + 8, 1.5), 0.62);
    b += seaThin(fish(xs[2] - 4, dy - 30, 1.75, '#F08A3C', false), 0.62);
    for (const x of xs) b += rect(x - 30, dy + 6, 60, 46, '#C9834A', 3, 2.6) + ln(x - 30, dy + 24, x + 30, dy + 24, 2.4) + circ(x, dy + 16, 2.6, INK, 0) + rect(x - 36, dy, 72, 10, '#A8744C', 4, 2.6);
    // 책상 위 물건 하나씩
    b += rect(xs[0] - 11, dy - 12, 22, 12, '#fff', 1, 2.2) + ln(xs[0] - 6, dy - 7, xs[0] + 6, dy - 7, 1.6, '#8E94AA');
    b += rect(xs[1] + 8, dy - 20, 20, 20, '#C9CEDF', 3, 2.2) + ln(xs[1] + 12, dy - 13, xs[1] + 24, dy - 13, 1.8) + ln(xs[1] + 12, dy - 7, xs[1] + 24, dy - 7, 1.8);
    b += pth(`M${xs[2] - 10} ${dy}V${dy - 6}a10 10 0 0 1 20 0V${dy}Z`, '#F4C24F', 2.2) + circ(xs[2], dy - 17, 2.6, '#F4C24F', 1.8);
    b += seaSign(w / 2, 12, 172, [['각자의 자리에서', 19], ['일하는 중!', 21, C.blue]]);
    add(1, b, '#E3EEF8');
  }

  /* ---- 2. consult: 배탈 난 용왕님이 문어 의사와 상담 ---- */
  {
    const [w, h] = wh(2);
    let b = seaSand(w, h, 192);
    // 침대
    b += rect(212, 100, 30, 102, '#C9834A', 8, 2.6);
    b += rect(116, 166, 126, 30, '#F4EFE6', 6, 2.6);
    b += king({ x: 184, y: 228, s: 1.42, legs: false, face: 'worry', lh: [-4, -48], rh: [8, -45] });
    b += pth('M156 82Q150 92 156 95Q162 92 156 82Z', '#9CD3F2', 2);
    b += rect(120, 194, 118, 34, '#C9834A', 4, 2.6);
    b += rect(116, 176, 126, 30, '#9CC3F0', 6, 2.6);
    // 문어 의사
    b += seaThin(octopus(58, 200, 1.42, { doctor: true }), 0.66);
    b += seaBubble(10, 12, 122, [['처방은', 20], ['토끼 간!', 22, C.red]], 60, 112);
    add(2, b, '#DDF0F4');
  }

  /* ---- 3. instruct A to-v: 용왕님이 자라에게 토끼를 데려오라고 지시 ---- */
  {
    const [w, h] = wh(3);
    let b = seaSand(w, h, 194);
    b += king({ x: 180, y: 214, s: 1.45, face: 'serious', lh: [-50, -72], lb: -2, rh: [20, -40] });
    b += turtle(64, 214, 1.2, { lh: [-26, -36], rh: [16, -92] });
    b += seaBubble(10, 10, 148, [['육지에 가서', 20], ['토끼를 데려와!', 20, C.red]], 158, 98);
    add(3, b, '#E3EEF8');
  }

  /* ---- 4. confidential: 꾀돌이 토끼 "간은 기밀 장소에 숨겨 뒀지롱~" ---- */
  {
    const [w, h] = wh(4);
    let b = seaSand(w, h, 192);
    // 자물쇠 잠긴 상자
    const cx = 196, cy = 196;
    b += rect(cx - 34, cy - 50, 68, 50, '#C9834A', 6, 2.6) + rect(cx - 34, cy - 50, 68, 16, '#A8744C', 6, 2.6);
    b += pth(`M${cx - 8} ${cy - 36}V${cy - 44}a8 8 0 0 1 16 0V${cy - 36}`, 'none', 2.6);
    b += rect(cx - 12, cy - 38, 24, 20, '#F4C24F', 3, 2.4) + circ(cx, cy - 29, 2.6, INK, 0);
    // 토끼 (윙크하며 쉿)
    b += seaThin(bunny(86, 214, 1.8, { wink: true, lh: [-14, -10], rh: [3, -31] }), 0.7);
    b += seaBubble(112, 12, 136, [['간은 기밀 장소에', 18], ['숨겨 뒀지롱~', 20, C.purple]], 120, 110);
    add(4, b, '#E6EEF8');
  }

  /* ---- 5. update: 자라가 용왕님께 최신 정보를 알려요 ---- */
  {
    const [w, h] = wh(5);
    let b = seaSand(w, h, 194);
    b += king({ x: 62, y: 214, s: 1.3, face: 'wow', lh: [-24, -40], rh: [20, -88] });
    b += turtle(176, 214, 1.45, { lh: [-34, -84], rh: [28, -40] });
    b += seaBubble(70, 10, 178, [['새 소식! 토끼가', 20], ['간을 가지러 간대요!', 20, C.red]], 170, 92);
    add(5, b, '#DDF0F4');
  }

  return comicPage(panels);
}

/* ================= 장면 목록 ================= */
const SCENE_ART = { dragon: scDragon, race: scRace, pigs: scPigs, pinocchio: scPinocchio, robin: scRobin, aladdin: scAladdin, sea: scSea };

