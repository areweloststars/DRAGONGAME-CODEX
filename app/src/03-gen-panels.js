/* ================= 생성 만화 칸: 칸 사양(JSON) → 그림 =================
   Claude가 단어마다 작은 "칸 사양"을 쓰면, 여기서 기존 SVG 키트(art.js, art2.js, scenes.js)로
   손으로 그린 칸과 같은 모양(밝은 배경 + 옅은 땅 띠 + 크게 그린 주인공 하나 + 표지 하나)으로 그려요.
   전역 이름은 GEN_SPEC_DOC, genNormalize, genPanelBg, genPanel, genScene 다섯 개만 내보내요. */

const GEN_SPEC_DOC = `PANEL SPEC: one JSON object per word = one comic panel. Every field is optional.
{"bg":"warm","ground":"floor","subject":{"kind":"person","hair":"short","outfit":"blue","pose":"hold","face":"smile"},"hold":"📄","sign":"내일\\n시험!","signStyle":"board","mark":"clock"}
bg: sky|warm|mint|lavender|blush|grey|night|sea|sand
ground: grass|floor|sand|road|water|snow|stage|none
subject.kind: person | an animal | emoji
- person: hair short|long|bun|curly|bald|pony|side; hairColor black|brown|blond|grey|red; skin 0|1|2 (light→dark); outfit red|blue|green|yellow|purple|orange|white|navy|grey|pink|brown; hat none|crown|helm|hood|turban|cap|pointy; extra none|beard|robe|glasses|suit|vest (or a list of 2, e.g. ["robe","beard"]); pose stand|cheer|point|wave|hold|think|run|shrug|sad|sleep (sleep = in bed); face happy|smile|wow|worry|angry|shout|serious
- animals: pig|tortoise|bunny|hare|squirrel|wolf|cricket|genie|octopus|crab|puffer|fish|deer|horse|dragon|bear|frog|bird. pig, bunny, bear, frog take pose cheer|wave|hold; hare takes run|sleep.
- emoji: {"kind":"emoji","emoji":"🏆"} draws ONE big emoji as the main thing (object, food, place, weather).
hold: one emoji the subject holds (person, pig, bunny, bear, frog) or that sits beside it.
props: up to 2 emoji standing on the ground beside the subject.
sign: short Korean cue, at most 2 lines of ≤9 characters; "\\n" = line break. Longer text is shrunk.
signStyle: board (white card) | bubble (speech bubble from the subject) | banner (red ribbon title).
mark: none|check|cross|heart|up|down|plus|exclaim|question|clock|money|star|idea|music|sweat (one small icon by the head).
Tips: one clear idea per panel; a recurring character keeps the same hair/outfit/hat/skin; show the meaning with pose, hold, props and mark; omit a field rather than guess.`;

const genArt = (() => {
  /* ---------- 팔레트 ---------- */
  const BG = { sky: '#E3F1FB', warm: '#FBEFD9', mint: '#E4F4E1', lavender: '#EEE8FB', blush: '#FCE8EC', grey: '#ECEEF3', night: '#34407A', sea: '#D2EEF4', sand: '#F8ECD2' };
  const GROUND = { grass: '#CFE6B8', floor: '#E9D9BC', sand: '#F1DDB0', road: '#CDD2DE', water: '#A6D6EF', snow: '#FFFFFF', stage: '#D9A970' };
  const GROUND_N = { grass: '#5F8E70', floor: '#7D7392', sand: '#B6A47F', road: '#5D6582', water: '#4D74AE', snow: '#DCE5F3', stage: '#8E6845' };
  const OUTFIT = { red: C.red, blue: C.blue, green: C.green, yellow: C.yellow, purple: C.purple, orange: C.orange, white: '#FFFFFF', navy: C.navy, grey: '#AEB4C6', pink: C.pink, brown: '#A0703F' };
  const HAIRC = { black: HR.black, brown: HR.brown, blond: HR.blond, grey: HR.grey, red: HR.red };
  const ENUM = {
    bg: Object.keys(BG), ground: [...Object.keys(GROUND), 'none'],
    hair: ['short', 'long', 'bun', 'curly', 'bald', 'pony', 'side', 'bob'], hairColor: Object.keys(HAIRC), outfit: Object.keys(OUTFIT),
    hat: ['none', 'crown', 'helm', 'hood', 'turban', 'cap', 'pointy'], extra: ['none', 'beard', 'robe', 'glasses', 'suit', 'vest'],
    pose: ['stand', 'cheer', 'point', 'wave', 'hold', 'think', 'run', 'shrug', 'sad', 'sleep'],
    face: ['happy', 'smile', 'wow', 'worry', 'angry', 'shout', 'serious', 'open'],
    signStyle: ['board', 'bubble', 'banner'],
    mark: ['none', 'check', 'cross', 'heart', 'up', 'down', 'plus', 'exclaim', 'question', 'clock', 'money', 'star', 'idea', 'music', 'sweat']
  };
  const ANIMALS = ['pig', 'tortoise', 'bunny', 'hare', 'squirrel', 'wolf', 'cricket', 'genie', 'octopus', 'crab', 'puffer', 'fish', 'deer', 'horse', 'dragon', 'bear', 'frog', 'bird'];
  const KIND_ALIAS = {
    rabbit: 'bunny', turtle: 'tortoise', squid: 'octopus', blowfish: 'puffer', grasshopper: 'cricket', bug: 'cricket', insect: 'cricket',
    pony: 'horse', lizard: 'dragon', monster: 'dragon', toad: 'frog', chick: 'bird', parrot: 'bird', crow: 'bird', sparrow: 'bird', teddy: 'bear',
    man: 'person', woman: 'person', boy: 'person', girl: 'person', kid: 'person', child: 'person', human: 'person', people: 'person', king: 'person', queen: 'person',
    knight: 'person', wizard: 'person', teacher: 'person', student: 'person', doctor: 'person', worker: 'person', object: 'emoji', thing: 'emoji', icon: 'emoji'
  };
  // 키트에 없는 동물·사물은 이모지로 그려요
  const KIND_EMOJI = {
    cat: '🐈', kitten: '🐈', dog: '🐕', puppy: '🐕', fox: '🦊', lion: '🦁', tiger: '🐯', mouse: '🐭', rat: '🐭', cow: '🐄', chicken: '🐔', hen: '🐔', duck: '🦆',
    elephant: '🐘', monkey: '🐒', snake: '🐍', whale: '🐋', shark: '🦈', penguin: '🐧', owl: '🦉', bee: '🐝', butterfly: '🦋', ant: '🐜', sheep: '🐑',
    dinosaur: '🦖', dino: '🦖', unicorn: '🦄', robot: '🤖', ghost: '👻', alien: '👽', cake: '🎂', book: '📚', car: '🚗', house: '🏠', tree: '🌳', sun: '☀️', heart: '❤️', money: '💰'
  };
  const KIND_PRESET = { woman: { hair: 'long' }, girl: { hair: 'pony' }, queen: { hair: 'long', hat: 'crown', extra: 'robe' }, king: { hat: 'crown', extra: 'robe' }, knight: { hat: 'helm', outfit: 'grey' }, wizard: { hat: 'pointy', extra: 'robe', outfit: 'purple' }, doctor: { outfit: 'white', extra: 'glasses' }, worker: { extra: 'vest', outfit: 'orange', hat: 'cap' } };
  const POSE_FACE = { stand: 'smile', cheer: 'happy', point: 'open', wave: 'happy', hold: 'smile', think: 'serious', run: 'shout', shrug: 'worry', sad: 'worry', sleep: 'smile' };
  const EMO_FONT = "'Noto Color Emoji','Apple Color Emoji','Segoe UI Emoji',sans-serif";

  /* ---------- 작은 도구 ---------- */
  const num = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : (typeof v === 'string' && v.trim() !== '' && isFinite(+v)) ? +v : d;
  const lim = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = v => Math.round(v * 10) / 10;
  const str = v => (typeof v === 'string' ? v : typeof v === 'number' && isFinite(v) ? String(v) : '');
  const key = v => str(v).slice(0, 40).trim().toLowerCase().replace(/[\s_-]+/g, '').slice(0, 24);
  const pick = (v, list, d) => { const k = key(v); const hit = list.find(x => x.toLowerCase() === k); return hit || d; };
  let EMO_RE = null;
  try { EMO_RE = new RegExp('(?:\\p{Regional_Indicator}{2}|[#*0-9]\\uFE0F?\\u20E3|\\p{Extended_Pictographic}(?:\\uFE0F|[\\u{1F3FB}-\\u{1F3FF}])*(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F|[\\u{1F3FB}-\\u{1F3FF}])*)*)', 'gu'); } catch (e) { EMO_RE = null; }
  // 문자열에서 이모지를 순서대로 최대 n개 꺼내요
  function emojis(v, n) {
    const s = str(v).slice(0, 200);
    if (!s) return [];
    let out = [];
    if (EMO_RE) { EMO_RE.lastIndex = 0; out = (s.match(EMO_RE) || []).filter(e => !/^[#*0-9]$/.test(e)); }
    else { const m = s.match(/[\uD83C-\uD83E][\uDC00-\uDFFF]|[☀-➿]/g); out = m || []; }
    out = out.map(e => { const cp = e.codePointAt(0); return (e.length === 1 && cp >= 0x2190 && cp <= 0x2BFF) ? e + '️' : e; });
    return out.slice(0, n);
  }
  // 글자 폭 어림값 (글자 크기의 배수): 한글 1.0, 영문 약 0.6
  function cw(ch) {
    const c = ch.codePointAt(0);
    if (c === 32) return 0.3;
    if (c >= 0x1100 && ((c >= 0x1100 && c <= 0x11FF) || (c >= 0x2E80 && c <= 0xA4CF) || (c >= 0xAC00 && c <= 0xD7A3) || (c >= 0xF900 && c <= 0xFAFF) || (c >= 0xFF00 && c <= 0xFF60) || (c >= 0x3130 && c <= 0x318F))) return 1.0;
    if (c >= 0x1F000 || (c >= 0x2600 && c <= 0x27BF)) return 1.3;
    if (/[A-Z]/.test(ch)) return 'MW'.includes(ch) ? 1.0 : 0.74;
    if (/[a-z]/.test(ch)) return 'mw'.includes(ch) ? 0.92 : 'ijlft'.includes(ch) ? 0.4 : 0.64;
    if (/[0-9]/.test(ch)) return 0.64;
    if (/[.,:;!'|`]/.test(ch)) return 0.34;
    if (/["?()\[\]{}\-_/]/.test(ch)) return 0.5;
    if (c === 0xFE0F || c === 0x200D) return 0;
    return 1.0;
  }
  const tw = s => Array.from(s).reduce((a, ch) => a + cw(ch), 0);
  const hit = (a, b, m = 0) => a[0] < b[2] + m && a[2] > b[0] - m && a[1] < b[3] + m && a[3] > b[1] - m;
  const inside = (a, W, H, m = 0) => a[0] >= m && a[1] >= m && a[2] <= W - m && a[3] <= H - m;
  const box = (cx, cy, w, h) => [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
  // 이모지 한 글자: (cx, cy)가 그림 한가운데
  const emo = (cx, cy, size, ch) => E('text', { x: r1(cx), y: r1(cy + size * 0.34), 'font-size': r1(size), 'text-anchor': 'middle', 'font-family': EMO_FONT }, esc(ch));
  const EMO_W = 1.18, EMO_H = 1.18; // 이모지 그림 크기(글자 크기 배수)
  const SWEAT = 0.62; // 땀방울 표시는 다른 표시보다 작게

  /* ---------- 사양 다듬기 ---------- */
  // XML에 쓸 수 없는 글자(짝 없는 서로게이트, U+FFFE/U+FFFF)를 빼요. 뒤돌아보기 정규식은 옛 iOS에서 안 되니 쓰지 않아요.
  const xmlSafe = t => t.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF\uFFFE\uFFFF]/g, m => m.length === 2 ? m : '');
  function cleanSign(v) {
    let s = xmlSafe(str(v).slice(0, 400)).replace(/\\n/g, '\n').replace(/\r/g, '').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '');
    let ls = s.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!ls.length) return '';
    if (ls.length > 2) ls = [ls[0], ls.slice(1).join(' ')];
    // 한 줄이면 나중에 두 줄로 나눌 수 있으니 길게 두고, 두 줄이면 줄마다 잘라요
    const cap = (l, n) => { const a = Array.from(l); return a.length > n ? a.slice(0, n - 1).join('').trim() + '…' : l; };
    ls = ls.length === 1 ? [cap(ls[0], 22)] : ls.map(l => cap(l, 14));
    return ls.join('\n');
  }
  function genNormalize(spec) {
    const sp = (spec && typeof spec === 'object' && !Array.isArray(spec)) ? spec : (typeof spec === 'string' ? { subject: spec } : {});
    let sj = sp.subject;
    if (typeof sj === 'string') sj = emojis(sj, 1).length ? { kind: 'emoji', emoji: sj } : { kind: sj };
    if (!sj || typeof sj !== 'object' || Array.isArray(sj)) sj = {};
    const rawKind = key(sj.kind || sj.type || sj.animal);
    const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; // 'constructor' 같은 이름 막기
    let kind = rawKind === 'person' || rawKind === 'emoji' || ANIMALS.includes(rawKind) ? rawKind : (own(KIND_ALIAS, rawKind) || '');
    let em = emojis(sj.emoji, 1)[0] || emojis(sj.kind, 1)[0] || '';
    if (!kind && own(KIND_EMOJI, rawKind)) { kind = 'emoji'; em = em || emojis(own(KIND_EMOJI, rawKind), 1)[0]; }
    if (!kind) kind = em ? 'emoji' : 'person';
    const preset = own(KIND_PRESET, rawKind) || {};
    const subject = { kind };
    if (kind === 'emoji') subject.emoji = em || '⭐';
    else {
      subject.pose = pick(sj.pose, ENUM.pose, preset.pose || 'stand');
      if (kind === 'person') {
        subject.hair = pick(sj.hair, ENUM.hair, preset.hair || 'short');
        subject.hairColor = pick(sj.hairColor || sj.haircolor || sj.hair_color, ENUM.hairColor, 'black');
        subject.skin = lim(Math.round(num(sj.skin, 0)), 0, 2);
        subject.outfit = pick(sj.outfit || sj.color, ENUM.outfit, preset.outfit || 'blue');
        subject.hat = pick(sj.hat, ENUM.hat, preset.hat || 'none');
        const ex = (Array.isArray(sj.extra) ? sj.extra : [sj.extra]).map(e => pick(e, ENUM.extra, 'none')).filter(e => e !== 'none');
        subject.extra = ex.length ? ex[0] : (preset.extra || 'none');
        if (ex.length > 1) subject.extra2 = ex[1] !== subject.extra ? ex[1] : 'none';
        subject.face = pick(sj.face, ENUM.face, POSE_FACE[subject.pose] || 'smile');
      } else subject.face = pick(sj.face, ENUM.face, 'smile');
    }
    let bg = pick(sp.bg || sp.background, ENUM.bg, '');
    const sea = ['fish', 'puffer', 'octopus', 'crab'].includes(kind);
    if (!bg) bg = sea ? 'sea' : 'sky';
    let ground = pick(sp.ground, ENUM.ground, '');
    if (!ground) ground = bg === 'sea' ? 'sand' : bg === 'sand' ? 'sand' : bg === 'warm' || bg === 'lavender' || bg === 'blush' || bg === 'grey' ? 'floor' : 'grass';
    let props = Array.isArray(sp.props) ? sp.props.slice(0, 6).flatMap(p => emojis(p, 2)) : emojis(sp.props, 2);
    props = props.slice(0, 2);
    const hold = emojis(sp.hold, 1)[0] || '';
    const sign = cleanSign(sp.sign != null ? sp.sign : sp.text);
    const signStyle = pick(sp.signStyle || sp.signstyle || sp.sign_style, ENUM.signStyle, 'board');
    const mark = pick(sp.mark, ENUM.mark, 'none');
    return { bg, ground, subject, hold, props, sign, signStyle, mark };
  }

  /* ---------- 주인공: 사람 ---------- */
  const SHOULDER = { l: [-12.5, -69], r: [12.5, -69] };
  // 손 위치는 발 기준 좌표(키 약 108)
  const POSES = {
    stand: { lh: [-17, -38], rh: [17, -38] },
    cheer: { lh: [-21, -116], rh: [21, -116], lb: 6, rb: -6 },
    point: { lh: [-17, -38], rh: [43, -80], rb: 2 },
    wave: { lh: [-17, -38], rh: [28, -110], rb: 7 },
    hold: { lh: [-17, -38], rh: [29, -58], rb: 6 },
    think: { lh: [8, -49], rh: [12, -72.5], lb: 6, rb: -15 },
    run: { lh: [-27, -56], rh: [26, -48], lb: -6, rb: 6 },
    shrug: { lh: [-32, -54], rh: [32, -54], lb: 7, rb: -7 },
    sad: { lh: [-13, -36], rh: [13, -36] },
    sleep: { lh: [-14, -40], rh: [14, -40] }
  };
  const HAT_TOP = { none: 0, crown: -117, helm: -125, hood: -125, turban: -117, cap: -112, pointy: -122 };
  const HAIR_TOP = { short: -109, side: -109, long: -110, curly: -111, bob: -110, pony: -110, bun: -115, bald: -105 };
  const segBox = (a, b, m) => [Math.min(a[0], b[0]) - m, Math.min(a[1], b[1]) - m, Math.max(a[0], b[0]) + m, Math.max(a[1], b[1]) + m];

  function personSubject(o, holdOn) {
    const skin = SK[o.skin] || SK[0], hair = HAIRC[o.hairColor] || HR.black;
    let pose = o.pose;
    let ps = { ...POSES[pose] };
    let top = OUTFIT[o.outfit] || C.blue, bot = o.outfit === 'navy' ? '#3A3F57' : '#4A4F6B';
    const extras = [o.extra, o.extra2].filter(e => e && e !== 'none');
    const po = { x: 0, y: 0, s: 1, skin, hair, hs: o.hair === 'bob' ? 'bob' : o.hair, top, bot, face: o.face };
    let under = '', ex = '';
    if (extras.includes('suit')) { po.suit = true; po.top = C.suit; po.tie = ['navy', 'grey', 'white'].includes(o.outfit) ? C.red : top; po.bot = C.suit; }
    if (extras.includes('vest')) { po.vest = top === '#FFFFFF' ? C.orange : top; po.top = '#FFFFFF'; }
    // 누워 자면 이불이 덮으니 도포는 안 그려요 (이불 밖으로 삐져나와 이불이 두 겹처럼 보여요)
    if (extras.includes('robe') && pose !== 'sleep') under += robe(top, '#F4C24F');
    if (extras.includes('glasses')) po.glasses = true;
    if (extras.includes('beard')) ex += beard(o.hairColor === 'grey' || o.hairColor === 'blond' ? '#F4F4F4' : hair);
    const hatC = o.outfit === 'red' ? C.blue : C.red;
    if (o.hat === 'crown') ex += crown();
    else if (o.hat === 'helm') ex += helm();
    else if (o.hat === 'hood') ex += hood();
    else if (o.hat === 'turban') ex += turban(o.outfit === 'white' ? '#F4E3C3' : '#F4F4F4');
    else if (o.hat === 'cap') ex += pth('M-15.5 -93C-15.5 -111 15.5 -111 15.5 -93Z', hatC, 2.6) + rect(-19, -95, 38, 5.5, hatC, 2.5, 2.4);
    else if (o.hat === 'pointy') ex += pointyHat(o.outfit === 'yellow' ? C.purple : '#F4C24F');
    // 머리 영역(얼굴+머리카락+모자)
    let hTop = Math.min(HAIR_TOP[o.hair] || -109, HAT_TOP[o.hat] || 0);
    let hx0 = -18, hx1 = 18;
    if (o.hair === 'pony') hx1 = 27;
    if (o.hair === 'curly') { hx0 = -21; hx1 = 19; }
    if (o.hat === 'helm') hx1 = 27;
    if (o.hat === 'hood') hx1 = 33;
    if (o.hat === 'pointy') { hx0 = -17; hx1 = 25; }
    if (o.hat === 'cap') { hx0 = -20; hx1 = 20; }
    const head = [hx0, hTop, hx1, -74];
    // 들고 있는 물건
    let hold = null;
    const HQ = 28;
    if (holdOn && pose !== 'sleep') {
      if (pose === 'stand' || pose === 'sad') ps = { ...ps, rh: POSES.hold.rh, rb: POSES.hold.rb };
      const useLeft = pose === 'think';
      let hp = useLeft ? [-29, -58] : ps.rh;
      if (useLeft) { ps.lh = hp; ps.lb = -6; }
      const side = useLeft ? -1 : 1;
      let cx = hp[0] + side * 2, cy = hp[1] - HQ * 0.42;
      const ib = () => box(cx, cy, HQ * EMO_W, HQ * EMO_H);
      // 얼굴과 겹치면 바깥으로 밀고, 손도 같이 옮겨요
      let guard = 0;
      while (hit(ib(), head, 1) && guard++ < 30) cx += side * 2;
      if (Math.abs(cx - hp[0]) > 4) { hp = [cx - side * 3, hp[1]]; if (useLeft) ps.lh = hp; else ps.rh = hp; }
      hold = { c: [cx, cy], q: HQ, hand: hp, handC: skin, handR: 4.7, handSW: 2.2 };
    }
    if (pose === 'sad') ex += pth('M9.5 -86Q12.5 -80 9.5 -77.5Q6.5 -80 9.5 -86Z', '#9FD3F5', 1.4);
    if (pose === 'wave') ex += pth(`M${ps.rh[0] + 9} ${ps.rh[1] - 9}Q${ps.rh[0] + 14} ${ps.rh[1] - 1} ${ps.rh[0] + 10} ${ps.rh[1] + 7}`, 'none', 2.2) + pth(`M${ps.rh[0] - 10} ${ps.rh[1] - 10}Q${ps.rh[0] - 14} ${ps.rh[1] - 2} ${ps.rh[0] - 11} ${ps.rh[1] + 5}`, 'none', 2.2);
    if (pose === 'point' && !hold) ex += ln(ps.rh[0] + 3, ps.rh[1] - 0.6, ps.rh[0] + 8.5, ps.rh[1] - 1.6, 4.6) + ln(ps.rh[0] + 3, ps.rh[1] - 0.6, ps.rh[0] + 8.5, ps.rh[1] - 1.6, 2, skin) + circ(ps.rh[0], ps.rh[1], 4.7, skin, 2.2);
    if (pose === 'sleep') ex += ell(-5, -90.5, 2.8, 3.4, skin, 0) + ell(5, -90.5, 2.8, 3.4, skin, 0) + pth('M-7.8 -91Q-5 -88 -2.2 -91', 'none', 1.8) + pth('M2.2 -91Q5 -88 7.8 -91', 'none', 1.8);
    Object.assign(po, { lh: ps.lh, rh: ps.rh, lb: ps.lb, rb: ps.rb, under: under || undefined, extra: ex || undefined });
    if (pose === 'sleep') { po.face = 'smile'; po.glasses = false; }

    // 몸통/팔 충돌 상자
    const parts = [head];
    const robeOn = extras.includes('robe');
    parts.push(robeOn ? [-26, -78, 26, 0] : [-20, -78, 20, 1]);
    parts.push(segBox(SHOULDER.l, ps.lh, 6), segBox(SHOULDER.r, ps.rh, 6));
    let draw;
    if (pose === 'run') {
      po.legs = false;
      const legs = limb(-6, -38, -21, -7, po.bot, 7, 10, 6.5) + limb(6, -38, 22, -10, po.bot, -9, 10, 6.5) +
        G(ell(0, 0, 7.6, 4.2, INK, 0), 'translate(-24 -5) rotate(-14)') + G(ell(0, 0, 7.6, 4.2, INK, 0), 'translate(26 -8) rotate(-8)');
      draw = () => speedMarks(-32, -74, -1, 3, 13, 10, '#8E94AA') + legs + person(po);
      parts.push([-48, -78, -28, -50], [-32, -40, 34, 1]);
    } else if (pose === 'sleep') {
      // 침대에 누워 자요 (머리가 왼쪽)
      const quilt = top === '#FFFFFF' ? '#9CC3F0' : top;
      draw = () => {
        let b = rect(-80, -52, 11, 54, C.wood, 3, 2.6) + rect(-74, -14, 152, 12, '#FFFFFF', 4, 2.6) + rect(-74, -4, 152, 8, C.wood, 3, 2.6) + rect(70, -24, 9, 28, C.wood, 3, 2.6);
        b += ell(-44, -20, 18, 8, '#FFFFFF', 2.4);
        b += G(person(po), 'translate(50 -30) rotate(-90)');
        b += pth('M-26 -48Q22 -54 70 -46L70 -12L-26 -12Z', quilt, 2.8) + pth('M-26 -36Q22 -42 70 -34', 'none', 0, { stroke: '#FFFFFF', 'stroke-width': 3, opacity: .55 });
        return b;
      };
      // z 글자는 뒤집지 않고 칸 좌표에 따로 그려요 (render 참고)
      return { draw, box: [-81, -110, 80, 5], head: [-60, -58, -24, -14], parts: [[-60, -58, -24, -14], [-26, -56, 80, 5], [-81, -54, -68, 5]], mouth: [-40, -40], hold: null, dir: 0, st: 3, sMax: 2.4,
        zz: { g: [[-10, -58, 'z', 13], [2, -72, 'z', 16], [16, -90, 'Z', 20]], box: [-18, -108, 27, -58] } };
    } else draw = () => person(po);
    let bx0 = Math.min(robeOn ? -26 : -22, hx0, ps.lh[0] - 6, ps.rh[0] - 6), bx1 = Math.max(robeOn ? 26 : 22, hx1, ps.lh[0] + 6, ps.rh[0] + 6);
    let by0 = Math.min(hTop, ps.lh[1] - 6, ps.rh[1] - 6);
    if (pose === 'run') { bx0 = Math.min(bx0, -48); bx1 = Math.max(bx1, 36); }
    if (pose === 'wave') { bx1 = Math.max(bx1, ps.rh[0] + 16); by0 = Math.min(by0, ps.rh[1] - 12); parts.push([ps.rh[0] - 15, ps.rh[1] - 12, ps.rh[0] + 16, ps.rh[1] + 9]); }
    if (pose === 'point' && !hold) bx1 = Math.max(bx1, ps.rh[0] + 12);
    const dir = pose === 'point' ? 1 : (hold ? (pose === 'think' ? -1 : 1) : 0);
    return { draw, box: [bx0, by0, bx1, 3], head, parts, mouth: [0, -86], face: [0, -92, 17], hold, dir, st: 3, sMax: 2.35, person: true };
  }

  /* ---------- 주인공: 동물 ---------- */
  function armsFor(pose, base) { // 팔 달린 동물의 손 위치
    const [lx, ly, rx, ry] = base;
    if (pose === 'cheer') return { lh: [lx - 4, ly - 34], rh: [rx + 4, ry - 34] };
    if (pose === 'wave') return { lh: [lx, ly], rh: [rx + 6, ry - 30] };
    return { lh: [lx, ly], rh: [rx, ry] };
  }
  function bearDraw(a, face) {
    const c = '#A0703F', d = '#E5C49A';
    let b = ell(-10, -3, 9, 5, c, 2.4) + ell(10, -3, 9, 5, c, 2.4);
    b += ell(0, -28, 22, 25, c, 2.8) + ell(0, -24, 13, 15, d, 0);
    b += G(circ(-11, -14, 6, c, 2.2) + circ(11, -14, 6, c, 2.2) + circ(0, 0, 15, c, 2.6) + ell(0, 5, 7, 5, d, 0) + circ(0, 3, 2.4, INK, 0) + ell(-5, -3, 1.6, 2.2, INK, 0) + ell(5, -3, 1.6, 2.2, INK, 0) +
      (face === 'worry' || face === 'sad' ? pth('M-3 10Q0 8 3 10', 'none', 1.2) : pth('M-3 8.5Q0 11 3 8.5', 'none', 1.2)) + circ(-9, 4, 2, '#F49A9A', 0, { opacity: .6 }) + circ(9, 4, 2, '#F49A9A', 0, { opacity: .6 }), 'translate(0 -66) scale(1.35)');
    b += limb(-16, -42, a.lh[0], a.lh[1], c, -3, 10, 6.6) + circ(a.lh[0], a.lh[1], 4.6, c, 2.2);
    b += limb(16, -42, a.rh[0], a.rh[1], c, 3, 10, 6.6) + circ(a.rh[0], a.rh[1], 4.6, c, 2.2);
    return b;
  }
  function frogDraw(a) {
    const c = '#7CC46A', d = '#BFE89F';
    let b = ell(-17, -7, 12, 7, c, 2.4) + ell(17, -7, 12, 7, c, 2.4) + ell(-24, -1, 7, 3.5, c, 2) + ell(24, -1, 7, 3.5, c, 2);
    b += ell(0, -20, 17, 17, c, 2.6) + ell(0, -17, 10, 11, d, 0);
    b += G(circ(-8, -10, 6, c, 2.2) + circ(8, -10, 6, c, 2.2) + ell(0, 0, 15, 11, c, 2.6) + circ(-8, -10, 3.4, '#fff', 0) + circ(8, -10, 3.4, '#fff', 0) + circ(-8, -10, 2, INK, 0) + circ(8, -10, 2, INK, 0) + pth('M-7 3Q0 8 7 3', 'none', 1.6) + circ(-10, 2, 1.8, '#F49A9A', 0, { opacity: .6 }) + circ(10, 2, 1.8, '#F49A9A', 0, { opacity: .6 }), 'translate(0 -44) scale(1.5)');
    b += limb(-12, -28, a.lh[0], a.lh[1], c, -2, 8, 5) + circ(a.lh[0], a.lh[1], 3.6, c, 1.8);
    b += limb(12, -28, a.rh[0], a.rh[1], c, 2, 8, 5) + circ(a.rh[0], a.rh[1], 3.6, c, 1.8);
    return b;
  }
  function birdDraw() {
    const c = '#4C9BE0';
    let b = ln(-6, -8, -8, 0, 2.6, '#E0A030') + ln(6, -8, 7, 0, 2.6, '#E0A030') + ln(-12, 0, -3, 0, 2.6, '#E0A030') + ln(2, 0, 11, 0, 2.6, '#E0A030');
    b += pg('-22,-30 -40,-40 -38,-22', c, 2.4);
    b += ell(-2, -24, 22, 17, c, 2.6) + ell(4, -20, 12, 10, '#CFE6FA', 0);
    b += pth('M-16 -30Q-6 -16 8 -26Q-2 -36 -16 -30Z', '#3A82C8', 2.2);
    b += G(circ(0, 0, 12, c, 2.6) + pg('10,-2 20,2 10,5', '#F4C24F', 1.6) + circ(4, -3, 2, INK, 0) + pth('M-4 -11L0 -18L3 -11Z', c, 1.6) + circ(1, 3, 2, '#F49A9A', 0, { opacity: .6 }), 'translate(12 -46) scale(1.35)');
    return b;
  }
  function bigFish(c = C.orange) {
    let b = pg('30,0 56,-19 56,19', c, 3) + pth('M-10 -20Q4 -38 22 -18', c, 2.6);
    b += ell(0, 0, 38, 23, c, 3);
    b += pth('M6 -14Q14 0 6 14', 'none', 0, { stroke: '#FFFFFF', 'stroke-width': 3.4, opacity: .55, 'stroke-linecap': 'round' }) + pth('M16 -12Q23 0 16 12', 'none', 0, { stroke: '#FFFFFF', 'stroke-width': 3, opacity: .45, 'stroke-linecap': 'round' });
    b += circ(-20, -5, 6, '#FFFFFF', 2.2) + circ(-21, -5, 2.8, INK, 0) + pth('M-34 7Q-30 10 -26 8', 'none', 2.2) + circ(-15, 6, 3, '#F49A9A', 0, { opacity: .6 });
    return G(b, 'translate(0 -24)');
  }

  function animalSubject(kind, o, holdOn, tall) {
    const pose = o.pose || 'stand';
    const A = (draw, box, head, parts, mouth, extra = {}) => ({ draw, box, head, parts: [head, ...parts], mouth, dir: 0, st: 2.8, sMax: 2.5, hold: null, ...extra });
    // 배 앞에 두 손으로 안는 물건
    const hug = (cx, cy, q, hands, c, r, sw) => ({ c: [cx, cy], q, hand: null, hands, handC: c, handR: r, handSW: sw });
    switch (kind) {
      case 'pig': {
        const base = [-22, -24, 22, -24];
        let a = armsFor(pose, base), hold = null;
        if (holdOn) { a = { lh: [-12, -22], rh: [12, -22] }; hold = hug(0, -22, 24, [a.lh, a.rh], '#F28DA5', 4, 2); }
        return A(() => pig(0, 0, 1, { lh: a.lh, rh: a.rh, face: o.face === 'worry' || pose === 'sad' ? 'worry' : 'smile' }), [Math.min(-30, a.lh[0] - 6), Math.min(-84, a.rh[1] - 6), Math.max(28, a.rh[0] + 6), 2], [-22, -84, 22, -38], [[-26, -44, 26, 2], segBox([-14, -36], a.lh, 5), segBox([14, -36], a.rh, 5)], [0, -46], { hold });
      }
      case 'bunny': {
        const base = [-18, -18, 18, -18];
        let a = armsFor(pose, base), hold = null;
        if (holdOn) { a = { lh: [-9, -14], rh: [9, -14] }; hold = hug(0, -14, 20, [a.lh, a.rh], '#F4EFE6', 3.4, 1.8); }
        return A(() => bunny(0, 0, 1, { lh: a.lh, rh: a.rh, wink: pose === 'wave' }), [Math.min(-20, a.lh[0] - 5), Math.min(-86, a.rh[1] - 5), Math.max(20, a.rh[0] + 5), 3], [-16, -86, 16, -24], [[-20, -34, 20, 3], segBox([-12, -24], a.lh, 5), segBox([12, -24], a.rh, 5)], [0, -31], { hold, sMax: 2.4 });
      }
      case 'bear': {
        const base = [-26, -24, 26, -24];
        let a = armsFor(pose, base), hold = null;
        if (holdOn) { a = { lh: [-13, -26], rh: [13, -26] }; hold = hug(0, -27, 28, [a.lh, a.rh], '#A0703F', 4.6, 2.2); }
        return A(() => bearDraw(a, o.face), [Math.min(-31, a.lh[0] - 6), Math.min(-94, a.rh[1] - 6), Math.max(31, a.rh[0] + 6), 3], [-26, -94, 26, -44], [[-24, -54, 24, 3], segBox([-16, -42], a.lh, 6), segBox([16, -42], a.rh, 6)], [0, -56], { hold });
      }
      case 'frog': {
        const base = [-20, -14, 20, -14];
        let a = armsFor(pose, base), hold = null;
        if (holdOn) { a = { lh: [-10, -16], rh: [10, -16] }; hold = hug(0, -18, 22, [a.lh, a.rh], '#7CC46A', 3.6, 1.8); }
        return A(() => frogDraw(a), [Math.min(-32, a.lh[0] - 5), Math.min(-72, a.rh[1] - 5), Math.max(32, a.rh[0] + 5), 2], [-25, -72, 25, -27], [[-32, -36, 32, 2], segBox([-12, -28], a.lh, 5), segBox([12, -28], a.rh, 5)], [0, -38], { hold });
      }
      case 'tortoise':
        return A(() => tortoise(0, 0, 1), [-49, -41, 55, 2], [20, -35, 55, -8], [[-41, -42, 35, 2]], [52, -17], { dir: 1, st: 3, hold: holdOn ? { c: [-3, -54], q: 26 } : null });
      case 'hare':
        if (pose === 'sleep') return A(() => hareSleep(0, 0, 1), [-40, -74, 54, 2], [14, -40, 46, -4], [[-38, -30, 34, 2], [-14, -58, 30, -28]], [40, -16], { dir: 1, zz: { g: [[36, -46, 'z', 11], [46, -58, 'Z', 14]], box: [30, -72, 53, -42] } });
        return A(() => hareRun(0, 0, 1), [-86, -100, 44, -4], [8, -100, 44, -24], [[-62, -48, 20, -4], [-12, -100, 26, -50], [-86, -37, -58, -15]], [38, -36], { dir: 1, hold: holdOn ? { c: [58, -34], q: 22 } : null, lift: 6 });
      case 'squirrel':
        return A(() => squirrel(0, 0, 1), [-37, -83, 52, 3], [-8, -72, 20, -36], [[-37, -83, -3, -18], [-20, -42, 26, 3], [22, -62, 52, -30]], [8, -44], { dir: 1, st: 2.6 });
      case 'wolf':
        return A(() => wolf(0, 0, 1), [-57, -124, 98, 2], [-12, -118, 50, -62], [[-36, -66, 22, 2], [-57, -76, -26, -38], [46, -92, 98, -56], [-34, -124, -14, -98]], [46, -78], { dir: 1, hold: holdOn ? { c: [36, -46], q: 24 } : null, sMax: 2.2, cropSide: true });
      case 'cricket':
        return A(() => cricket(0, 0, 1), [-30, -95, 30, 2], [-18, -86, 18, -42], [[-30, -95, 30, -70], [-15, -48, 15, 2], segBox([-10, -36], [-24, -46], 5), segBox([10, -36], [22, -24], 5)], [0, -50], { st: 2.6, hold: holdOn ? { c: [27, -34], q: 22 } : null });
      case 'genie':
        if (tall) return A(() => lamp(-50, 0, 1) + genie(4, -32, 1), [-88, -240, 66, 4], [-24, -240, 48, -186], [[-46, -192, 66, -120], [-36, -126, 32, -30], [-88, -36, 6, 4]], [12, -192], { st: 2.8, hold: holdOn ? { c: [64, -172], q: 28 } : null });
        // 연기 꼬리는 칸 아래로 잘려요 (기준선 y=0 은 원래 그림의 y=-60)
        return A(() => genie(0, 60, 1), [-46, -146, 62, 0], [-26, -146, 42, -92], [[-46, -94, 62, -58], [-20, -102, 36, -62], [-30, -70, 36, 0]], [8, -100], { st: 2.8, crop: true, sMax: 2.2, hold: holdOn ? { c: [62, -94], q: 26 } : null });
      case 'octopus':
        return A(() => octopus(0, 0, 1, {}), [-34, -52, 34, 5], [-30, -52, 30, -16], [[-34, -20, 34, 5]], [0, -26], { hold: holdOn ? { c: [38, -18], q: 20 } : null });
      case 'crab':
        return A(() => crabClerk(0, 0, 1), [-36, -42, 36, 6], [-28, -42, 28, 4], [[-38, -42, -14, -10], [14, -42, 38, -10]], [0, -10], { st: 2.6, hold: holdOn ? { c: [30, -54], q: 18 } : null });
      case 'puffer':
        // 머리 상자는 눈과 입이 있는 앞쪽만 (말풍선 꼬리가 얼굴을 가리키게)
        return A(() => puffer(0, 0, 1), [-25, -45, 28, 5], [-25, -45, 2, 3], [[-25, -45, 28, 5]], [-12, -14], { dir: -1, st: 2.6, float: true });
      case 'fish':
        return A(() => bigFish(), [-41, -54, 58, 2], [-41, -48, -8, -2], [[-40, -54, 40, 1], [30, -44, 58, -4]], [-32, -17], { dir: -1, st: 3, float: true });
      case 'deer':
        return A(() => deer(0, 0, 1), [-31, -102, 56, 1], [26, -102, 56, -60], [[-31, -50, 38, 1], [18, -72, 46, -36]], [52, -66], { dir: 1, st: 2.6 });
      case 'horse':
        return A(() => horse(0, 0, 1), [-76, -128, 95, 4], [46, -128, 95, -84], [[-76, -86, 72, 4], [24, -120, 78, -48]], [88, -90], { dir: 1, st: 3, cropSide: true });
      case 'dragon':
        // 큰 용은 위쪽만 보여요(아랫부분은 칸 아래로 잘림). 기준선 y=0 은 원래 그림의 y=272
        return A(() => G(bigDragon({ dizzy: o.face === 'worry' }), 'translate(-470 -312)'), [-172, -272, 172, 0], [-172, -272, -70, -184], [[-120, -240, 172, 0], [-110, -236, -30, -150]], [-168, -200], { dir: -1, st: 3, sMax: 1.3, crop: true, cropSide: true });
      case 'bird':
        return A(() => birdDraw(), [-41, -73, 41, 2], [-6, -73, 41, -26], [[-41, -44, 22, 2]], [36, -44], { dir: 1, st: 2.6 });
    }
    return null;
  }
  function emojiSubject(ch) {
    // 크기 1 = 글자 크기 1. 바닥에서 살짝 떠 있어요
    return {
      draw: () => '', emoji: ch, box: [-0.6, -1.22, 0.6, 0], head: [-0.6, -1.22, 0.6, -0.04], parts: [[-0.6, -1.22, 0.6, 0]], mouth: [0, -1.1], dir: 0, st: 0, sMax: 999, hold: null, isEmoji: true
    };
  }
  function buildSubject(n, W, H) {
    const k = n.subject.kind;
    let sj = null;
    if (k === 'person') sj = personSubject(n.subject, !!n.hold);
    else if (k === 'emoji') sj = emojiSubject(n.subject.emoji);
    else sj = animalSubject(k, n.subject, !!n.hold, H >= W * 1.5);
    if (!sj) sj = personSubject(genNormalize({}).subject, !!n.hold);
    return sj;
  }

  /* ---------- 표지(글자판) ---------- */
  function signLayouts(text, style, W, H, pad) {
    if (!text) return [null];
    const fPref = lim(Math.round(H * 0.088), 18, 30);
    const padX0 = style === 'banner' ? 0.9 : 0.6, padXmin = style === 'banner' ? 0.6 : 0.4, padY = style === 'bubble' ? 0.55 : 0.45;
    // 띠는 칸 가장자리 가까이까지 써도 돼요
    const maxW = W - (style === 'banner' ? Math.min(pad, 3) : pad) * 2;
    // 글자 크기: 먼저 넉넉한 여백으로, 18보다 작아지면 여백을 줄여서 18을 지켜요
    function fit(ls) {
      const units = Math.max(...ls.map(tw), 1), nl = ls.length;
      let padX = padX0;
      let f = Math.min(fPref, (maxW - 4) / (units + padX * 2));
      if (f < 18) {
        const f2 = Math.min(18, maxW / (units + padXmin * 2));
        if (f2 > f) { f = f2; padX = lim((maxW / f - units) / 2, padXmin, padX0); }
      }
      // 위쪽 절반을 넘지 않게
      f = Math.min(f, (H * 0.42) / (nl * 1.2 + padY * 2));
      f = Math.max(8, Math.floor(f * 2 + 1e-6) / 2);
      return { units, nl, f, padX };
    }
    const given = text.split('\n');
    const variants = [{ ls: given, pref: 0.03 }];
    const flat = given.join(' ');
    // 한 줄이면 두 줄로 나눈 것도 해 봐요 (공백 기준으로 균형 있게)
    if (Array.from(flat).length >= 5) {
      const words = flat.split(' ');
      let best = null;
      if (words.length > 1) {
        for (let i = 1; i < words.length; i++) {
          const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
          const m = Math.max(tw(a), tw(b));
          if (!best || m < best.m) best = { ls: [a, b], m };
        }
      } else if (Array.from(flat).length >= 7) {
        // 공백 없는 낱말: 한글은 가운데서 나눠도 되지만, 영문·숫자는 한 줄로 18이 안 될 때만 붙임표(-)를 달아 나눠요
        const ch = Array.from(flat), mid = Math.ceil(ch.length / 2);
        const a = ch.slice(0, mid).join(''), b = ch.slice(mid).join('');
        if (!/[A-Za-z0-9\u00C0-\u024F\u0370-\u04FF]/.test(flat)) best = { ls: [a, b], m: 0 };
        else if (fit([flat]).f < 18) best = { ls: [a + '-', b], m: 0 };
      }
      if (best && best.ls.join('\n') !== text) variants.push({ ls: best.ls, pref: given.length === 1 ? 0.0 : -0.05 });
      if (given.length === 2) variants.push({ ls: [flat], pref: -0.07 });
    }
    const out = [];
    for (const v of variants) {
      const { units, nl, f, padX } = fit(v.ls);
      const lh = f * 1.2;
      let bw = Math.ceil(units * f + f * padX * 2 - 1e-6), bh = Math.ceil(nl * lh - f * 0.2 + f * padY * 2);
      bw = Math.max(bw, Math.ceil(f * (style === 'banner' ? 5 : 2.8)));
      if (style === 'banner') bw = Math.max(bw, Math.min(maxW, Math.round(W * 0.66)));
      bw = Math.min(bw, maxW);
      // 휴대폰에서 읽히려면 글자 18 이상이 좋아요: 작아질수록 크게 감점
      out.push({ ls: v.ls, f, lh, bw, bh, pref: v.pref + (f < 18 ? -0.05 * (18 - f) : 0), style, pad: (W - maxW) / 2, padX });
    }
    return out;
  }
  function signRects(sg, W, H, pad) {
    if (!sg) return [null];
    const y = pad;
    const r = (x, pos) => ({ ...sg, pos, r: [x, y, x + sg.bw, y + sg.bh] });
    if (sg.style === 'banner') return [r(Math.max(sg.pad, Math.round((W - sg.bw) / 2)), 'tc')];
    const list = [r(pad, 'tl'), r(W - pad - sg.bw, 'tr')];
    if (sg.bw < W - pad * 2 - 6) list.push(r(Math.round((W - sg.bw) / 2), 'tc'));
    else list[0].pos = 'tc';
    return sg.bw >= W - pad * 2 - 6 ? [list[0]] : list;
  }
  function drawSign(S, tail) {
    const [x, y, x2, y2] = S.r, w = x2 - x, h = y2 - y;
    let b = '';
    if (S.style === 'bubble') b += bubble(x, y, w, h, r1(tail[0]), r1(tail[1]), '#FFFFFF', 3);
    else if (S.style === 'banner') {
      const k = Math.min(10, h * 0.3, Math.max(5, S.f * (S.padX || 0.9) - 2)); // 빠듯하면 홈을 얕게
      b += pth(`M${x} ${y}H${x2}L${x2 - k} ${y + h / 2}L${x2} ${y2}H${x}L${x + k} ${y + h / 2}Z`, C.red, 2.8);
    } else b += rect(x, y, w, h, '#FFFDF8', 8, 2.8);
    const n = S.ls.length, cx = (x + x2) / 2, cy = (y + y2) / 2;
    S.ls.forEach((t, i) => {
      const col = S.style === 'banner' ? (i ? '#FFE45C' : '#FFFFFF') : (i && n > 1 ? C.red : INK);
      b += tx(r1(cx), r1(cy - (n - 1) * S.lh / 2 + i * S.lh + S.f * 0.36), t, S.f, col);
    });
    return b;
  }

  /* ---------- 표시(작은 아이콘) ---------- */
  function drawMark(kind, cx, cy, m) {
    const r = m / 2, k = m / 40;
    const T = s => `translate(${r1(cx)} ${r1(cy)}) scale(${r1(k * 100) / 100})`;
    switch (kind) {
      case 'check': return circ(r1(cx), r1(cy), r1(r), '#FFFFFF', 2.6) + check(r1(cx - k * 0.5), r1(cy + k * 1), k * 1.8, C.green);
      case 'cross': return circ(r1(cx), r1(cy), r1(r), '#FFFFFF', 2.6) + cross(r1(cx), r1(cy), r1(r * 0.45), C.red, r1(Math.max(3.5, k * 5.5)));
      case 'heart': return G(pth('M0 16C-8 9 -19 2 -19 -7C-19 -14 -13 -18 -8 -18C-4 -18 -1 -15 0 -12C1 -15 4 -18 8 -18C13 -18 19 -14 19 -7C19 2 8 9 0 16Z', '#F2607A', 2.6) + pth('M-12 -9Q-11 -13 -7 -13', 'none', 0, { stroke: '#FFFFFF', 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: .8 }), T());
      case 'up': return G(pth('M0 -19L17 0H7V18H-7V0H-17Z', C.green, 2.6), T());
      case 'down': return G(pth('M0 19L17 0H7V-18H-7V0H-17Z', C.red, 2.6), T());
      case 'plus': return G(circ(0, 0, 19, '#FFFFFF', 2.6) + pth('M-4 -11H4V-4H11V4H4V11H-4V4H-11V-4H-4Z', C.blue, 0), T());
      case 'exclaim': return G(burst(0, 0, 21, 14, 9, '#FFE45C', 2.4) + tx(0, 9, '!', 24, C.red), T());
      case 'question': return G(circ(0, 0, 19, '#FFFFFF', 2.6) + txE(0, 9, '?', 26, C.blue), T());
      case 'clock': return G(circ(0, 0, 19, '#FFFFFF', 2.8) + ln(0, 0, 0, -11, 3.2) + ln(0, 0, 8, 4, 3.2) + circ(0, 0, 2.4, C.red, 0) + ln(0, -15.5, 0, -13, 2.2) + ln(15.5, 0, 13, 0, 2.2) + ln(0, 15.5, 0, 13, 2.2) + ln(-15.5, 0, -13, 0, 2.2), T());
      case 'money': return G(circ(5, 3, 15, '#E0A92E', 2.4) + circ(-3, -3, 16, '#F4C24F', 2.6) + circ(-3, -3, 11, 'none', 1.6, { stroke: '#C8942C' }) + txE(-3, 4, '$', 19, '#9A6A12'), T());
      case 'star': return G(pg('0,-20 5.9,-8.1 19,-6.2 9.5,3.1 11.8,16.2 0,10 -11.8,16.2 -9.5,3.1 -19,-6.2 -5.9,-8.1', '#FFD84A', 2.6), T());
      case 'idea': return G(ln(-14, -16, -18, -20, 2.4) + ln(14, -16, 18, -20, 2.4) + ln(0, -21, 0, -26, 2.4) + ln(-19, -4, -24, -4, 2.4) + ln(19, -4, 24, -4, 2.4) +
        pth('M-7 9C-7 3 -13 0 -13 -7C-13 -14 -7 -19 0 -19C7 -19 13 -14 13 -7C13 0 7 3 7 9Z', '#FFE45C', 2.6) + rect(-6.5, 9, 13, 8, '#AEB4C6', 2, 2.2) + pth('M-3 -4L0 2L3 -4', 'none', 1.8), T());
      case 'music': return G(note(-8, 12, INK) + pth('M8 -2V-16L18 -18V-5', 'none', 2.4) + ell(5, -2, 4, 3, INK, 0) + ell(15, -5, 4, 3, INK, 0), T());
      case 'sweat': return G(pth('M0 -16Q9 -3 9 4Q9 12 0 12Q-9 12 -9 4Q-9 -3 0 -16Z', '#9FD3F5', 2.4) + pth('M-3 2Q-3 7 1 8', 'none', 0, { stroke: '#FFFFFF', 'stroke-width': 2, 'stroke-linecap': 'round' }), T());
    }
    return '';
  }

  /* ---------- 배경 장식 ---------- */
  function drawGround(g, W, H, gTop, night) {
    if (g === 'none') return '';
    const f = (night ? GROUND_N : GROUND)[g] || GROUND.grass;
    let b = rect(0, gTop, W, H - gTop + 2, f, 0, 0);
    if (g === 'water') {
      let d = `M0 ${gTop}`;
      for (let x = 0; x < W; x += 24) d += `Q${x + 6} ${gTop - 4} ${x + 12} ${gTop}T${x + 24} ${gTop}`;
      b += pth(d, 'none', 2.4);
      b += pth(`M${W * 0.12} ${gTop + (H - gTop) * 0.45}h${W * 0.14}M${W * 0.62} ${gTop + (H - gTop) * 0.7}h${W * 0.16}`, 'none', 0, { stroke: '#FFFFFF', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: .7 });
      return b;
    }
    if (g === 'road') b += ln(0, r1(gTop + (H - gTop) * 0.52), W, r1(gTop + (H - gTop) * 0.52), 3, '#FFFFFF', { 'stroke-dasharray': '16 12' });
    if (g === 'stage') {
      b += rect(0, gTop, W, 6, night ? '#7A5636' : '#C38F55', 0, 0);
      for (let x = 34; x < W; x += 52) b += ln(x, gTop + 6, x, H, 1.6, night ? '#6B4A2E' : '#B88250');
    }
    b += ln(0, gTop, W, gTop, 2.4);
    return b;
  }
  const moon = (cx, cy, r) => pth(`M${r1(cx + r * 0.2)} ${r1(cy - r)}A${r1(r)} ${r1(r)} 0 1 0 ${r1(cx + r * 0.95)} ${r1(cy + r * 0.45)}A${r1(r * 0.8)} ${r1(r * 0.8)} 0 1 1 ${r1(cx + r * 0.2)} ${r1(cy - r)}Z`, '#FFE9A0', 2.4);

  /* ---------- 말풍선 꼬리 ---------- */
  // 꼬리 끝: 머리 위 가장자리 바로 바깥, 풍선 쪽으로 조금. 머리 폭 안, 칸 안에 머물러요.
  // parts: 머리 위로 솟은 부분(토끼 귀, 귀뚜라미 더듬이 같은 것)이 있으면 그 위에서 멈춰요 (사람은 팔 상자가 커서 안 써요).
  // avoid(잠자는 z 글자, 표시 자리 같은 사각형 목록)가 있으면 꼬리가 그 위를 지나지 않는 x를 머리 폭 안에서 찾아요
  const triHitsAny = (tri, list) => list.some(b => triHits(tri, b));
  function tailTip(Sr, hd, mouthX, W, avoid, parts) {
    avoid = (avoid || []).filter(Boolean);
    const hx0 = Math.min(hd[0], hd[2]), hx1 = Math.max(hd[0], hd[2]), hy = Math.min(hd[1], hd[3]);
    const hc = (hx0 + hx1) / 2, dx = (Sr[0] + Sr[2]) / 2 - hc;
    const lo = Math.max(4, hx0 + 4), hi = Math.min(W - 4, hx1 - 4);
    let tX = lim(mouthX, hx0 - 2, hx1 + 2) + Math.sign(dx) * Math.min(Math.abs(dx), (hx1 - hx0) * 0.25);
    tX = lim(tX, lo, hi);
    const yAt = x => {
      let t = hy;
      if (parts) for (const p of parts) if (p !== hd && p[0] - 2 < x && p[2] + 2 > x && p[1] < t && p[3] > hy - 2) t = p[1];
      return Math.max(t - 4, Sr[3] + 10);
    };
    let tY = yAt(tX);
    if (avoid.length && hi > lo && triHitsAny(tailTri(Sr, [tX, tY]), avoid)) {
      const st = Math.max(2, (hi - lo) / 12), cs = [];
      for (let x = lo; x <= hi + 0.01; x += st) cs.push(x);
      cs.sort((a, b) => Math.abs(a - tX) - Math.abs(b - tX));
      for (const x of cs) { const y = yAt(x); if (!triHitsAny(tailTri(Sr, [x, y]), avoid)) return [x, y]; }
    }
    return [tX, tY];
  }
  // art.js bubble()과 같은 꼬리 삼각형
  function tailTri(Sr, tip) {
    const [x, y, x2, y2] = Sr, r = Math.min(16, (y2 - y) / 2);
    const bx = Math.max(x + r + 4, Math.min(x2 - r - 22, tip[0] - 8));
    return [[bx, y2], [bx + 18, y2], tip];
  }
  function triHits(tri, b, m = 2) {
    const [p, q, t] = tri;
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      for (const e of [p, q, [(p[0] + q[0]) / 2, p[1]]]) {
        const X = e[0] + (t[0] - e[0]) * u, Y = e[1] + (t[1] - e[1]) * u;
        if (X > b[0] - m && X < b[2] + m && Y > b[1] - m && Y < b[3] + m) return true;
      }
    }
    return false;
  }

  /* ---------- 칸 배치 ---------- */
  function layout(n, W, H) {
    const pad = Math.max(6, Math.round(Math.min(W, H) * 0.034));
    const tall = H > W * 1.4;
    const hasG = n.ground !== 'none';
    // 세로로 긴 칸은 땅을 조금 올려 빈 하늘을 줄여요
    const gTop = hasG ? Math.round(H * (tall ? 0.72 : 0.8)) : H;
    const foot0 = hasG ? Math.round(H - (H - gTop) * 0.4) : H - pad;
    const sj = buildSubject(n, W, H);
    const sw = sj.box[2] - sj.box[0], sh = sj.box[3] - sj.box[1];
    // 들 수 없으면 소품으로
    let props = n.props.slice();
    if (n.hold && !sj.hold) props = [n.hold, ...props].slice(0, 2);
    const mark = n.mark;
    const markM = mark !== 'none' ? lim(Math.round(H * 0.155), 24, 46) : 0;
    // 크기 한계: 칸 높이의 80%, 칸 너비, 선 굵기.
    // 큰 칸에서는 선이 조금 굵어져도 더 크게 그려요. 세로로 긴 칸(2칸·3칸 쪽)은 넓이로 따져요
    const big = H > W * 1.2 ? lim(Math.sqrt(W * H) / 238, 1, 1.5) : lim(Math.min(W, H) / 238, 1, 1.35);
    // 세로로 긴 칸에서 큰 동물은 등 쪽이 칸 밖으로 조금(폭의 30%까지) 잘려도 돼요
    const back = tall && sj.cropSide ? 0.3 : 0;
    let sCap = Math.min((H * 0.8) / sh, (W - 8) / (sw * (1 - back)), sj.sMax * big);
    if (sj.isEmoji) sCap = Math.min(H * 0.4, (W - 8) / sw, 120 * big);
    if (!sj.crop && !sj.float && !sj.isEmoji) sCap = Math.min(sCap, (foot0 - 6) / (-sj.box[1]));
    const sMin = sCap * 0.3;
    const signs = signLayouts(n.sign, n.signStyle, W, H, pad);
    const flips = sj.dir ? [1, -1] : (sj.person && sj.hold) || sj.person && n.subject.pose === 'point' ? [1, -1] : [1];
    const xs = W / 2;
    const BUBBLE_GAP = 16; // 말풍선 아래와 머리 사이 최소 간격
    const ratioOf = b => (b.s * (sj.isEmoji ? 1.22 : sh)) / H;
    let curProps = props;

    let best = search(props);
    // 소품 때문에 주인공이 많이 작아지면(소품 없을 때의 70% 밑, 또는 칸 높이의 45% 밑) 소품을 하나씩 빼요.
    // 주인공이 소품보다 중요해요. 들 수 없어서 소품이 된 물건(맨 앞)부터, 그다음 뒤에 적힌 소품을 빼요
    if (props.length) {
      const free = search([]);
      let holdProp = !!(n.hold && !sj.hold);
      const smallish = b => !b || b.s < 0.7 * free.s || (ratioOf(b) < 0.45 && b.s < 0.9 * free.s);
      while (free && props.length && smallish(best)) {
        props = holdProp ? props.slice(1) : props.slice(0, -1);
        holdProp = false;
        best = props.length ? search(props) : free;
      }
    }
    curProps = props;
    if (!best) {
      // 마지막 수단: 주인공만 작게 가운데에
      const s = sMin, p = props.length ? Math.min(Math.round(H * 0.12), Math.round(64 * big)) : 0;
      best = { s, p, x: W / 2, foot: sj.crop ? H : foot0, S: null, flip: 1, side: props.length === 2 ? 'S' : 'R', propR: [], markC: null, holdR: null, mouthP: [W / 2, H / 2], fallback: true };
      best.propR = propRects(best.p, best.side, foot0);
    }
    return { ...best, sj, props, pad, gTop, hasG, markM, foot0 };

    // 말풍선은 머리 가까이로 내려요 (꼬리가 길게 늘어지지 않게). 내려서 꼬리가 z 글자나 표시를 지나가게 되면 덜 내려요
    function settle(f, S) {
      const r = S.r, hd = f.headR;
      const avoid = [f.zzR, f.markC ? box(f.markC[0], f.markC[1], markM, markM) : null].filter(Boolean);
      let shift = Math.min(hd[1], hd[3]) - lim(Math.round(H * 0.075), BUBBLE_GAP, 34) - r[3];
      const obs = [...(f.partsR || []), hd, ...f.propR, ...avoid];
      if (f.holdR) obs.push(f.holdR);
      for (const o of obs) if (o[0] < r[2] + 6 && o[2] > r[0] - 6 && o[1] >= r[3] - 0.5) shift = Math.min(shift, o[1] - 8 - r[3]);
      shift = Math.min(shift, (hasG ? gTop : H) - 12 - r[3]);
      for (; shift > 2; shift -= Math.max(3, shift / 3)) {
        const S2 = { ...S, r: [r[0], r[1] + shift, r[2], r[3] + shift] };
        const tip = tailTip(S2.r, hd, f.mouthP[0], W, avoid, sj.person ? null : f.partsR);
        if (!triHitsAny(tailTri(S2.r, tip), avoid)) return { S: S2, tip, tailZ: false };
      }
      const tip = tailTip(r, hd, f.mouthP[0], W, avoid, sj.person ? null : f.partsR);
      // 그래도 꼬리가 z 글자를 지나가면 z는 그리지 않아요
      return { S, tip, tailZ: !!(f.zzR && triHits(tailTri(r, tip), f.zzR)) };
    }

    function search(list) {
      curProps = list;
      const propSides = list.length === 2 ? ['R', 'L', 'S'] : list.length === 1 ? ['R', 'L'] : ['-'];
      const propSizes = list.length ? [0.2, 0.17, 0.14, 0.12].map(f => Math.min(Math.round(H * f), Math.round(64 * big))) : [0];
      let top = null;
      for (const sg of signs) for (const S of signRects(sg, W, H, pad)) for (const flip of flips) for (const side of propSides) {
        let found = null;
        for (let s = sCap; s >= sMin && !found; s *= 0.96) {
          for (const p of propSizes) {
            const res = tryPlace(s, p, S, flip, side);
            if (res) { found = res; break; }
          }
        }
        if (!found) continue;
        // 숨 쉴 틈: 빠듯하면 조금 줄여 가운데로
        if (found.s < sCap * 0.999) {
          const res2 = tryPlace(found.s * 0.94, found.p, S, flip, side);
          if (res2 && res2.bad <= found.bad) found = res2;
        }
        let Sf = S; // 말풍선은 머리 가까이로 내린 자리(가로 위치는 같아요)
        if (S && S.style === 'bubble') { const st = settle(found, S); Sf = st.S; found = { ...found, tip: st.tip, tailZ: st.tailZ }; }
        // 점수: 주인공 크기 + 취향
        let score = ratioOf(found);
        if (sg) score += sg.pref;
        if (S && (sj.dir || flips.length > 1)) {
          const scx = (S.r[0] + S.r[2]) / 2, toward = Math.sign(scx - found.x) || 1;
          const facing = (sj.dir || 1) * flip;
          if (facing === toward) score += 0.05;
        } else if (!S && flip === -1) score -= 0.01;
        if (S && S.style === 'bubble') {
          const m = found.mouthP, scx = (S.r[0] + S.r[2]) / 2;
          score -= Math.min(0.06, Math.abs(m[0] - scx) / W * 0.08);
        }
        if (S && S.pos === 'tc' && S.style !== 'banner') score -= 0.01;
        score += 0.25 * found.p / H;
        score -= 0.04 * Math.abs(found.x - xs) / W;
        if (list.length && n.hold && !sj.hold && side !== 'S') { // 들 물건이 소품이 되면 바라보는 쪽에
          const facing = (sj.dir || 1) * flip;
          if ((side === 'R') === (facing > 0)) score += 0.02;
        }
        if (found.tailZ) score -= 0.12;
        if (found.markOv) score -= 0.1 * Math.min(1, found.markOv / (markM * markM));
        if (!top || score > top.score) top = { ...found, S: Sf, flip, side, score };
      }
      return top;
    }
    function propRects(p, side, foot) {
      const props = curProps;
      if (!props.length || !p) return [];
      const w = p * EMO_W, h = p * EMO_H, y1 = Math.min(foot + p * 0.08, H - 3), y0 = y1 - h;
      const gap = Math.round(p * 0.12);
      const L = x => [x, y0, x + w, y1];
      if (side === 'L') return props.length === 2 ? [L(pad), L(pad + w + gap)] : [L(pad)];
      if (side === 'R') return props.length === 2 ? [L(W - pad - w * 2 - gap), L(W - pad - w)] : [L(W - pad - w)];
      return [L(pad), L(W - pad - w)];
    }
    function tryPlace(s, p, S, flip, side) {
      // 세로 위치
      let foot;
      if (sj.crop) foot = H;
      else if (sj.float || sj.isEmoji && !hasG) {
        const top = S ? S.r[3] + 8 : pad, bot = hasG ? gTop - 4 : H - pad;
        const hgt = sh * s;
        foot = (top + bot) / 2 + hgt / 2 - (sj.box[3] * s);
        foot = Math.min(foot, bot - sj.box[3] * s);
      } else {
        foot = foot0 - (sj.isEmoji ? H * 0.03 : (sj.lift || 0) * s);
        // 발 아래로 삐져나오는 그림(게 몸통, 문어 다리)은 발을 올려서 칸 안에 넣어요
        if (!sj.isEmoji) foot = Math.min(foot, H - 4 - sj.box[3] * s);
      }
      const T = (r, x) => { const a = x + flip * r[0] * s, b = x + flip * r[2] * s; return [Math.min(a, b), foot + r[1] * s, Math.max(a, b), foot + r[3] * s]; };
      const bb0 = T(sj.box, 0);
      if (bb0[1] < 3) return null;
      if (!sj.crop && bb0[3] > H + 1) return null;
      const edge = sj.crop ? -s * 20 : 3;
      let xMin = edge - bb0[0], xMax = W - edge - bb0[2];
      if (back) { const ov = back * (bb0[2] - bb0[0]); if ((sj.dir || 1) * flip > 0) xMin -= ov; else xMax += ov; }
      if (xMin > xMax) return null;
      const pr = propRects(p, side, foot0);
      // 막힌 구간 모으기
      const block = [];
      const addBlock = (part, ob, m) => { // part는 x=0 기준 사각형
        if (part[1] >= ob[3] + m || part[3] <= ob[1] - m) return;
        block.push([ob[0] - m - part[2], ob[2] + m - part[0]]);
      };
      const partsP = sj.parts.map(r => T(r, 0));
      const headP = T(sj.head, 0);
      const zzP = sj.zz ? T(sj.zz.box, 0) : null;
      let holdP = null;
      if (sj.hold) { const q = sj.hold.q * s; const c = [flip * sj.hold.c[0] * s, foot + sj.hold.c[1] * s]; holdP = box(c[0], c[1], q * EMO_W, q * EMO_H); }
      const obst = [];
      if (S) obst.push([S.r, 7, 'sign']);
      for (const r of pr) obst.push([r, 3, 'prop']);
      for (const [ob, m, kind] of obst) {
        for (const part of partsP) addBlock(part, ob, m);
        if (zzP) addBlock(zzP, ob, m);
        addBlock(headP, ob, m + 3);
        if (holdP) addBlock(holdP, ob, kind === 'sign' ? 5 : 3);
      }
      if (holdP) { block.push([-Infinity, 3 - holdP[0]]); block.push([W - 3 - holdP[2], Infinity]); if (holdP[1] < 3) return null; }
      // 말풍선 꼬리: 입이 풍선 아래, 너무 옆으로 비껴가지 않게
      let mouthRel = [flip * sj.mouth[0] * s, foot + sj.mouth[1] * s];
      if (S && S.style === 'bubble') {
        const dy = headP[1] - S.r[3];
        if (dy < BUBBLE_GAP) return null;
        const reach = Math.max(10, dy * 1.1);
        // 입 x는 [S.x0 - reach, S.x1 + reach] 안에
        block.push([-Infinity, S.r[0] - reach - mouthRel[0]]);
        block.push([S.r[2] + reach - mouthRel[0], Infinity]);
      }
      // 빈 구간 계산
      const ivs = freeIntervals(xMin, xMax, block);
      if (!ivs.length) return null;
      // 가장 넓은 구간부터, 그 가운데에 놓아요. 꼬리가 z를 지나거나 표시가 몸에 겹치면 다른 자리를 더 찾아봐요
      ivs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]));
      let alt = null;
      for (const iv of ivs.slice(0, 3)) {
        const cands = [(iv[0] + iv[1]) / 2, iv[0], iv[1], iv[0] + (iv[1] - iv[0]) * 0.25, iv[0] + (iv[1] - iv[0]) * 0.75];
        for (const x of cands) {
          const head = [headP[0] + x, headP[1], headP[2] + x, headP[3]];
          const hold = holdP ? [holdP[0] + x, holdP[1], holdP[2] + x, holdP[3]] : null;
          const parts = partsP.map(r => [r[0] + x, r[1], r[2] + x, r[3]]);
          const zzR = zzP ? [zzP[0] + x, zzP[1], zzP[2] + x, zzP[3]] : null;
          let tip = null, tailZ = false;
          if (S && S.style === 'bubble') {
            tip = tailTip(S.r, head, mouthRel[0] + x, W, [zzR], sj.person ? null : parts);
            if (zzR) tailZ = triHits(tailTri(S.r, tip), zzR);
          }
          let markC = null, markOv = 0;
          const face = sj.face ? [x + flip * sj.face[0] * s, foot + (sj.face[1] + 2) * s, 14 * s] : null;
          if (markM) {
            const mk = placeMark(head, parts, hold, S, pr, face, tip, zzR);
            if (!mk) continue;
            markC = mk.c; markOv = mk.ov;
          }
          const bad = (tailZ ? 1e6 : 0) + markOv;
          const res = { s, p, x, foot, propR: pr, markC, markOv, holdR: hold, headR: head, partsR: parts, zzR, tailZ, bad, mouthP: [mouthRel[0] + x, mouthRel[1]] };
          if (bad === 0) return res;
          if (!alt || bad < alt.bad) alt = res;
        }
      }
      return alt;
    }
    function placeMark(head, parts, hold, S, pr, face, tip, zzR) {
      const m = markM, h2 = m / 2;
      const away = S ? (((S.r[0] + S.r[2]) / 2 > (head[0] + head[2]) / 2) ? -1 : 1) : 1;
      const hc = (head[0] + head[2]) / 2, hy = head[1];
      if (mark === 'sweat') {
        // 땀방울은 작게, 얼굴 바로 옆에 (머리카락·팔 위에 겹쳐도 괜찮아요)
        const q = markM * SWEAT;
        const fc = face || [hc, head[1] + (head[3] - head[1]) * 0.42, (head[2] - head[0]) * 0.36];
        const cs = [];
        for (const d of [away, -away]) cs.push([fc[0] + d * (fc[2] + q * 0.3), fc[1] - fc[2] * 0.3], [fc[0] + d * (fc[2] + q * 0.42), fc[1] - fc[2] * 0.75]);
        const okS = (c, strict) => {
          const r = box(c[0], c[1], q * 0.62, q * 0.75);
          if (!inside(r, W, H, 3)) return false;
          if (S && hit(r, S.r, 3)) return false;
          if (zzR && hit(r, zzR, 1)) return false;
          if (hold && hit(r, hold, 2)) return false;
          for (const p of pr) if (hit(r, p, 2)) return false;
          if (strict) for (const p of parts.slice(1)) if (hit(r, p, -4)) return false;
          return true;
        };
        for (const c of cs) if (okS(c, true)) return { c, ov: 0 };
        for (const c of cs) if (okS(c, false)) return { c, ov: 0 };
        return null;
      }
      const cands = [];
      for (const d of [away, -away]) {
        const sx = d > 0 ? head[2] + h2 + 3 : head[0] - h2 - 3;
        cands.push([sx, hy + h2 * 0.6], [sx, hy - h2 * 0.1], [hc + d * (head[2] - head[0]) * 0.55, hy - h2 - 3]);
      }
      cands.push([hc, hy - h2 - 4]);
      // 팔을 든 자세처럼 머리 옆이 막히면 조금 더 바깥으로
      for (const d of [away, -away]) { const sx = d > 0 ? head[2] + h2 + 3 : head[0] - h2 - 3; cands.push([sx + d * m * 0.6, hy + h2 * 0.6], [sx + d * m * 1.2, hy + h2 * 0.6]); }
      cands.push([pad + h2, pad + h2], [W - pad - h2, pad + h2], [pad + h2, (head[1] + head[3]) / 2], [W - pad - h2, (head[1] + head[3]) / 2]);
      // 더 찾기: 표지 아래~주인공 위의 빈 띠(머리에서 바깥으로), 주인공 양옆, 마지막으로 칸 전체(머리에서 가까운 순)
      const sb = parts.reduce((a, r) => [Math.min(a[0], r[0]), Math.min(a[1], r[1]), Math.max(a[2], r[2]), Math.max(a[3], r[3])], head.slice());
      const step = Math.max(6, m / 2);
      const yTop = (S ? S.r[3] + 4 : 3) + h2, yMax = (hasG ? gTop : H) - h2 - 3;
      const y1 = sb[1] - h2 - 4;
      for (const y of y1 >= yTop ? [y1, (y1 + yTop) / 2] : []) for (let k = 0; k * step <= W; k++) for (const d of k ? [away, -away] : [0]) cands.push([hc + d * k * step, y]);
      for (const d of [away, -away]) { const cx = d > 0 ? sb[2] + h2 + 4 : sb[0] - h2 - 4; for (let y = hy; y <= yMax; y += step) cands.push([cx, y]); }
      const grid = [];
      for (let y = h2 + 3; y <= yMax; y += step) for (let gx = h2 + 3; gx <= W - h2 - 3; gx += step) grid.push([gx, y]);
      grid.sort((a, b) => Math.hypot(a[0] - hc, a[1] - hy) - Math.hypot(b[0] - hc, b[1] - hy));
      cands.push(...grid);
      // 말풍선 꼬리가 지나갈 길은 비워 둬요
      let lane = null;
      if (S && S.style === 'bubble' && tip) { const t = tailTri(S.r, tip); lane = [Math.min(t[0][0], tip[0]) - 6, S.r[3], Math.max(t[1][0], tip[0]) + 6, tip[1] + 2]; }
      const ok = (c, strict) => {
        const r = box(c[0], c[1], m, m);
        if (!inside(r, W, H, 3)) return false;
        if (S && hit(r, S.r, 4)) return false;
        if (lane && hit(r, lane, 2)) return false;
        if (zzR && hit(r, zzR, 2)) return false;
        if (hit(r, head, 3)) return false;
        if (hold && hit(r, hold, 3)) return false;
        for (const q of pr) if (hit(r, q, 3)) return false;
        if (strict) for (const q of parts) if (hit(r, q, 1)) return false;
        return true;
      };
      for (const c of cands) if (ok(c, true)) return { c, ov: 0 };
      // 어디든 몸에 걸리면, 몸과 가장 적게 겹치는 곳
      let bestC = null, bestOv = Infinity;
      for (const c of cands) {
        if (!ok(c, false)) continue;
        const r = box(c[0], c[1], m, m);
        let ov = 0;
        for (const q of parts) ov += Math.max(0, Math.min(r[2], q[2] + 1) - Math.max(r[0], q[0] - 1)) * Math.max(0, Math.min(r[3], q[3] + 1) - Math.max(r[1], q[1] - 1));
        if (ov < bestOv - 0.5) { bestOv = ov; bestC = c; }
      }
      return bestC ? { c: bestC, ov: bestOv } : null;
    }
  }
  function freeIntervals(a, b, block) {
    const bl = block.filter(r => r[1] > a && r[0] < b).sort((p, q) => p[0] - q[0]);
    const out = [];
    let cur = a;
    for (const [s, e] of bl) { if (s > cur) out.push([cur, Math.min(s, b)]); cur = Math.max(cur, e); if (cur >= b) break; }
    if (cur < b) out.push([cur, b]);
    return out.filter(iv => iv[1] - iv[0] >= 0);
  }

  /* ---------- 칸 그리기 ---------- */
  function decorations(n, L, W, H) {
    const obst = [];
    if (L.S) obst.push(L.S.r);
    if (L.markC) obst.push(box(L.markC[0], L.markC[1], L.markM + 6, L.markM + 6));
    if (L.partsR) obst.push(...L.partsR);
    if (L.headR) obst.push(L.headR);
    if (L.zzR) obst.push(L.zzR);
    if (L.holdR) obst.push(L.holdR);
    obst.push(...L.propR);
    if (L.fallback) obst.push([W * 0.25, 0, W * 0.75, H]);
    const free = r => inside(r, W, H, 2) && !obst.some(o => hit(r, o, 6)) && (!L.hasG || r[3] < L.gTop - 4);
    let b = '';
    const spots = [[0.2, 0.17], [0.8, 0.17], [0.16, 0.36], [0.84, 0.36], [0.5, 0.12]];
    const u = Math.min(W, H) / 238;
    if (n.bg === 'night') {
      const mr = 13 * u;
      let used = null;
      for (const [fx, fy] of spots) { const c = [W * fx, H * fy]; if (free(box(c[0], c[1], mr * 2.4, mr * 2.4))) { b += moon(c[0], c[1], mr); used = c; break; } }
      let k = 0;
      for (const [fx, fy] of [[0.5, 0.1], [0.12, 0.5], [0.9, 0.55], [0.35, 0.3], [0.68, 0.28], [0.9, 0.12], [0.1, 0.12]]) {
        const c = [W * fx, H * fy];
        if (used && Math.hypot(c[0] - used[0], c[1] - used[1]) < mr * 3) continue;
        if (free(box(c[0], c[1], 14 * u, 14 * u))) { b += sparkle(r1(c[0]), r1(c[1]), r1(6 * u), '#FFF3B0'); if (++k >= 3) break; }
      }
    } else if (n.bg === 'sky') {
      for (const [fx, fy] of [[0.8, 0.16], [0.2, 0.16], [0.82, 0.32], [0.18, 0.32]]) {
        const c = [W * fx, H * fy], cs = 0.42 * u;
        if (free([c[0] - 50 * cs, c[1] - 38 * cs, c[0] + 44 * cs, c[1] + 2])) { b += cloud(r1(c[0]), r1(c[1]), r1(cs * 100) / 100); break; }
      }
    } else if (n.bg === 'sea') {
      let k = 0;
      for (const [fx, fy] of [[0.86, 0.3], [0.14, 0.42], [0.86, 0.6], [0.14, 0.2]]) {
        const c = [W * fx, H * fy];
        if (free([c[0] - 6, c[1] - 26, c[0] + 12, c[1] + 6])) { b += bubbleDots(r1(c[0]), r1(c[1])); if (++k >= 2) break; }
      }
    }
    return b;
  }
  function render(n, W, H) {
    const L = layout(n, W, H);
    const { sj, S = null } = L;
    const night = n.bg === 'night';
    let b = '';
    b += decorations(n, L, W, H);
    b += drawGround(n.ground, W, H, L.gTop, night);
    // 주인공
    const tf = `translate(${r1(L.x)} ${r1(L.foot)}) scale(${r1(L.flip * L.s * 1000) / 1000} ${r1(L.s * 1000) / 1000})`;
    if (sj.isEmoji) {
      const e = L.s;
      if (L.hasG) b += ell(r1(L.x), r1(L.foot0), r1(e * 0.42), r1(Math.max(3, e * 0.07)), night ? 'rgba(0,0,0,0.18)' : 'rgba(35,37,63,0.10)', 0);
      b += emo(L.x, L.foot - e * 0.61, e, sj.emoji);
    } else {
      b += G(sj.draw(), tf);
      // 잠자는 z: 뒤집힌 그림 밖에서, 칸 좌표로 (글자가 거울처럼 뒤집히지 않게)
      if (sj.zz && !L.tailZ) for (const [zx, zy, ch, f] of sj.zz.g) b += tx(r1(L.x + L.flip * zx * L.s), r1(L.foot + zy * L.s), ch, r1(f * L.s), '#4C7BE0');
    }
    // 든 물건 + 그 위로 손
    if (sj.hold && L.holdR) {
      const h = sj.hold, q = h.q * L.s;
      const c = [(L.holdR[0] + L.holdR[2]) / 2, (L.holdR[1] + L.holdR[3]) / 2];
      b += emo(c[0], c[1], q, n.hold);
      const hands = h.hands || (h.hand ? [h.hand] : []);
      if (hands.length) b += G(hands.map(p => circ(p[0], p[1], h.handR, h.handC, h.handSW)).join(''), tf);
    }
    // 소품
    L.propR.forEach((r, i) => {
      const p = (r[2] - r[0]) / EMO_W;
      if (L.hasG) b += ell(r1((r[0] + r[2]) / 2), r1(Math.min(r[3] - p * 0.06, H - 3)), r1(p * 0.42), r1(Math.max(2.5, p * 0.07)), night ? 'rgba(0,0,0,0.18)' : 'rgba(35,37,63,0.10)', 0);
      b += emo((r[0] + r[2]) / 2, (r[1] + r[3]) / 2 - p * 0.04, p, L.props[i]);
    });
    // 표시
    if (L.markC) b += drawMark(n.mark, L.markC[0], L.markC[1], n.mark === 'sweat' ? L.markM * SWEAT : L.markM);
    // 표지
    if (S) {
      let tail = null;
      if (S.style === 'bubble') tail = L.tip || (L.headR ? tailTip(S.r, L.headR, L.mouthP[0], W) : [(S.r[0] + S.r[2]) / 2, S.r[3] + 12]);
      b += drawSign(S, tail);
    }
    return b;
  }
  function panel(spec, w, h) {
    const W = lim(num(w, 256), 40, 2000), H = lim(num(h, 238), 40, 2000);
    let n;
    try { n = genNormalize(spec); } catch (e) { n = genNormalize({}); }
    try { return render(n, W, H); }
    catch (e) {
      try { return render(genNormalize({ bg: n.bg, subject: { kind: 'emoji', emoji: '⭐' } }), W, H); } catch (e2) { return ''; }
    }
  }
  function bgOf(spec) {
    try { return BG[genNormalize(spec).bg] || BG.sky; } catch (e) { return BG.sky; }
  }
  function scene(specs) {
    let list = Array.isArray(specs) ? specs.slice(0, 8) : (specs && typeof specs === 'object' ? [specs] : []);
    if (!list.length) list = [{}];
    const P = comicPanels(list.length);
    // 칸 svg의 크기 style은 panelSvg가 붙여요 (여기서 또 붙이면 style 속성이 둘이 되어 XML이 깨져요)
    return comicPage(list.map((sp, k) => {
      const [, , w, h] = P[k];
      return panelSvg(P[k], panel(sp, w, h), bgOf(sp));
    }));
  }
  const normalizeSafe = spec => { try { return genNormalize(spec); } catch (e) { return genNormalize({}); } };
  return { normalize: normalizeSafe, panel, bg: bgOf, scene, _layout: layout };
})();

function genNormalize(spec) { return genArt.normalize(spec); }
function genPanelBg(spec) { return genArt.bg(spec); }
function genPanel(spec, w, h) { return genArt.panel(spec, w, h); }
function genScene(specs) { return genArt.scene(specs); }

