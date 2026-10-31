/* ---------- 한국어 문장 다듬기: 받침에 맞는 조사, 동사·형용사 활용, 뜻의 품사 짐작 ----------
   이야기 자동 만들기가 단어 뜻을 문장 속에 넣을 때 써요 ('묶다' → '묶었어요', '용감한' → '용감했어요', '붕대' → '붕대를').
   불규칙 활용(ㄷ·ㅂ·ㅅ·ㅎ·르·으)도 표준 규칙대로 처리해요. */
const KO0 = 0xAC00;
// 글자 하나 → [첫소리, 가운뎃소리, 받침] 번호 (한글 글자가 아니면 null)
function koSplit(ch) { const c = String(ch || '').charCodeAt(0) - KO0; return c >= 0 && c < 11172 ? [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28] : null; }
const koJoin = (i, m, f = 0) => String.fromCharCode(KO0 + i * 588 + m * 28 + f);
// 마지막 글자의 받침 번호 (따옴표·문장부호는 건너뜀. 숫자는 읽는 소리로, 영어는 대충)
function koFinal(w) {
  const s = String(w || '').replace(/[\s'"’‘“”)\]}.,!?~…·]+$/u, ''), ch = s.slice(-1), sp = koSplit(ch);
  if (sp) return sp[2];
  if (/\d/.test(ch)) return [21, 8, 0, 16, 0, 0, 1, 8, 8, 0][+ch]; // 영 일 이 삼 사 오 육 칠 팔 구
  if (/[a-z]/i.test(ch)) return /[aeiouy]/i.test(ch) ? 0 : /l/i.test(ch) ? 8 : 4;
  return 0;
}
const jong = koFinal;
const J = (w, a, b) => w + (koFinal(w) ? a : b); // 받침에 맞는 조사: J('기사', '이', '가') → '기사가'
// 조사 붙이기: koP('기사', '이') → '기사가', koP('학교', '로') → '학교로', koP('길', '로') → '길로'
const KO_PAIR = { 이: ['이', '가'], 가: ['이', '가'], 은: ['은', '는'], 는: ['은', '는'], 을: ['을', '를'], 를: ['을', '를'], 과: ['과', '와'], 와: ['과', '와'], 아: ['아', '야'], 이야: ['이야', '야'], 이라고: ['이라고', '라고'], 이라는: ['이라는', '라는'], 이에요: ['이에요', '예요'], 이었어요: ['이었어요', '였어요'], 이나: ['이나', '나'], 이랑: ['이랑', '랑'] };
function koP(w, p) {
  if (!p) return w;
  if (p === '로' || p === '으로') { const f = koFinal(w); return w + (f && f !== 8 ? '으로' : '로'); }
  const pair = KO_PAIR[p];
  return pair ? w + (koFinal(w) ? pair[0] : pair[1]) : w + p; // 의·에·에게·에서·도·만은 그대로
}

/* 동사·형용사 활용. stem은 '다'를 뺀 줄기 ('묶다' → '묶'), en은 영어 단어 (뜻이 둘인 '묻다'·'이르다' 가르기) */
const KO_YANG = new Set([0, 2, 8]); // ㅏ ㅑ ㅗ 뒤에는 '-아'
const koDIrr = (stem, en) => /(듣|걷|싣|깨닫|일컫|붇|긷)$/.test(stem) || (/묻$/.test(stem) && !/bur(y|ied)/i.test(en || ''));
const koBIrr = stem => !/(잡|입|씹|접|뽑|업|좁|집|굽|수줍|뒤집|붙잡|사로잡|껴입|덮|엎)$/.test(stem);
const koSIrr = stem => /(짓|낫|붓|긋|잇|젓|잣)$/.test(stem);
const koHIrr = stem => /[렇떻갛랗얗맣]$/.test(stem);
const koAddFinal = (w, f) => { const sp = koSplit(w.slice(-1)); return sp && !sp[2] ? w.slice(0, -1) + koJoin(sp[0], sp[1], f) : w; };
// '-아/어' 꼴: 묶 → 묶어, 하 → 해, 미루 → 미뤄, 짓 → 지어, 돕 → 도와, 모르 → 몰라, 쓰 → 써, 듣 → 들어
function koInf(stem, en) {
  const head = stem.slice(0, -1), ch = stem.slice(-1), sp = koSplit(ch);
  if (!sp) return stem + '어';
  const [i, m, f] = sp, prev = koSplit(head.slice(-1));
  if (ch === '하') return head + '해';
  if (f) {
    const tail = KO_YANG.has(m) ? '아' : '어';
    if (f === 7 && koDIrr(stem, en)) return head + koJoin(i, m, 8) + tail;
    if (f === 17 && koBIrr(stem)) return head + koJoin(i, m, 0) + (/(^|\s)(돕|곱)$/.test(stem) ? '와' : '워');
    if (f === 19 && koSIrr(stem)) return head + koJoin(i, m, 0) + tail;
    if (f === 27 && koHIrr(stem)) return head + koJoin(i, m === 2 ? 3 : 1, 0); // 그렇 → 그래, 하얗 → 하얘
    return stem + tail;
  }
  if (ch === '르' && prev && !/(따르|치르|들르|우러르)$/.test(stem)) {
    if (/푸르$/.test(stem) || (/이르$/.test(stem) && /reach|arriv|attain|amount|lead/i.test(en || ''))) return stem + '러';
    return head.slice(0, -1) + koJoin(prev[0], prev[1], 8) + (KO_YANG.has(prev[1]) ? '라' : '러');
  }
  switch (m) {
    case 8: return head + koJoin(i, 9);   // 보 → 봐
    case 13: return head + koJoin(i, 14); // 주 → 줘
    case 20: return head + koJoin(i, 6);  // 마시 → 마셔
    case 11: return head + koJoin(i, 10); // 되 → 돼
    case 18: return head + koJoin(i, prev && KO_YANG.has(prev[1]) ? 0 : 4); // 쓰 → 써, 아프 → 아파
    case 16: case 19: return stem + '어'; // 쉬 → 쉬어
    default: return stem;                 // 가 → 가, 보내 → 보내, 켜 → 켜
  }
}
const koPast = (stem, en) => koAddFinal(koInf(stem, en), 20) + '어요'; // 묶었어요, 했어요, 지었어요
// '-으'로 시작하는 끝(-으려고·-으면·-으라고·-은) 앞의 꼴: 묶 → 묶으, 가 → 가, 떨 → 떨, 듣 → 들으, 돕 → 도우, 짓 → 지으, 그렇 → 그러
function koEu(stem, en) {
  const head = stem.slice(0, -1), ch = stem.slice(-1), sp = koSplit(ch);
  if (!sp) return stem;
  const [i, m, f] = sp;
  if (!f || f === 8) return stem;
  if (f === 7 && koDIrr(stem, en)) return head + koJoin(i, m, 8) + '으';
  if (f === 17 && koBIrr(stem)) return head + koJoin(i, m, 0) + '우';
  if (f === 19 && koSIrr(stem)) return head + koJoin(i, m, 0) + '으';
  if (f === 27 && koHIrr(stem)) return head + koJoin(i, m, 0);
  return stem + '으';
}
// 동사가 꾸미는 꼴(-는): 묶는, 떠는(ㄹ 빠짐)
const koVerbAttr = stem => { const sp = koSplit(stem.slice(-1)); return sp && sp[2] === 8 ? stem.slice(0, -1) + koJoin(sp[0], sp[1], 0) + '는' : stem + '는'; };
// 형용사가 꾸미는 꼴(-ㄴ/-은): 용감한, 작은, 무서운, 긴, 빨간, 재미있는
function koAdjAttr(stem, en) {
  if (/(있|없)$/.test(stem)) return stem + '는';
  const sp = koSplit(stem.slice(-1));
  if (!sp) return stem;
  if (sp[2] === 8) return stem.slice(0, -1) + koJoin(sp[0], sp[1], 4);
  const eu = koEu(stem, en);
  if (eu.endsWith('으')) return eu.slice(0, -1) + '은';
  const last = koSplit(eu.slice(-1));
  return eu.slice(0, -1) + koJoin(last[0], last[1], 4);
}
// 동사 줄기 하나로 만드는 꼴들
function koVerbForms(stem, en) {
  const eu = koEu(stem, en);
  return { past: koPast(stem, en), ki: stem + '기', go: stem + '고', ji: stem + '지', ryeo: eu + '려고', ryeodaga: eu + '려다가', ra: eu + '라고', neun: koVerbAttr(stem) };
}

/* 뜻의 품사 짐작 (사진으로 읽은 단어장에는 품사 표시가 없을 때가 많아요) */
// '-하다'로 끝나도 형용사인 말의 앞부분 (용감하다·중요하다 …)
const KO_HA_ADJ = new Set('용감 친절 중요 필요 위험 안전 조용 깨끗 유명 풍부 정확 적절 충분 가능 불가능 확실 분명 다양 독특 특별 비슷 이상 심각 강 약 부족 행복 불행 편리 불편 편안 복잡 간단 단순 솔직 정직 성실 겸손 부지런 똑똑 현명 무례 공손 관대 엄격 신중 침착 활발 명랑 상냥 다정 대담 소심 피곤 지루 따분 우울 초조 불안 긴급 시급 급 유용 유익 효율 적합 적당 완벽 완전 정밀 섬세 거대 막대 광대 방대 사소 미세 희미 선명 뚜렷 투명 신선 건강 튼튼 연약 허약 강력 유능 무능 능숙 익숙 친숙 유사 동일 평범 흔 희귀 진지 엄숙 화려 소박 검소 비참 잔인 냉정 냉담 열렬 성급 느긋 한가 부유 가난 빈곤 풍족 넉넉 고요 평화 평온 시원 따뜻 포근 쌀쌀 서늘 축축 건조 단단 딱딱 매끈 날씬 뚱뚱 어색 영리 우수 훌륭 탁월 저렴 민감 예민 공평 정당 부당 순수 순진 성숙 미숙 유치 친밀 소중 귀중 신기 기묘 수상 명확 모호 애매 막연 상당 타당 마땅 당연 확고 견고 꾸준 무수 유창 정중 불가피 신속 민첩 근면 나태 태만 궁핍 청결 불결 지저분 요란 소란 잠잠 캄캄 깜깜 환 아찔 곤란 수월 무사 분주 굉장 대단 특이 참신 간결 진실 불쾌 유쾌 상쾌 통쾌 뿌듯 섭섭 서운 쓸쓸 씩씩 당당 비겁 억울 궁금 답답 심심 든든 허전 흐릿 찬란 단호 온화 은은 창백 초라 화창 흐뭇 희한 엉뚱 멍청 무관심 평등 정상 비정상 유리 불리 원활 착 귀 친 흔 독 진 깊숙 자세 상세 적극 소극 정교 단정 비싼 값비싼 우아 고귀 비열 미안 만족 성급 간절 절실 치열 격렬 맹렬 열심 꼼꼼 세심 치밀 허술 엉성 서투 능통 무덤덤 무심 냉철 엄중 막강 무력 미약 희박 빈약 미흡 충실 착실 확연 역력 생생 또렷 아늑 쾌적 한적 번화 삭막 황량 울창 무성 비옥 척박 험 험난 평탄 완만 원만 순탄 무난 다급 긴박 절박 위급 심상 수수 평이 난해 기발 교묘 영특 총명 아둔 우둔 둔 민망 황당 당황 난처 어리둥절 의아 수상 미심 겸허 거만 오만 교만 건방 무뚝뚝 퉁명 상냥 싹싹 다감 정다 화목 단란 끈끈 돈독 소원 서먹 냉랭 쌀쌀맞 비슷비슷 공정 불공정 투명 불투명 명백 분명 불분명 정확 부정확 엄밀 명료 선명 확실 불확실'.split(' '));
// 줄기가 ㅂ으로 끝나는 형용사 (무섭다 → 무서운·무서웠어요)
const KO_B_ADJ = /(무섭|어렵|쉽|가볍|무겁|즐겁|귀엽|아름답|반갑|고맙|덥|춥|맵|곱|가깝|놀랍|두렵|부끄럽|어지럽|시끄럽|더럽|간지럽|서럽|차갑|뜨겁|따갑|가렵|그립|밉|싱겁|부드럽|안타깝|아깝|정답|사납|우습|미덥|괴롭|외롭|새롭|해롭|이롭|스럽|롭)$/;
// 받침 없는 줄기의 형용사 (큰 → 크, 빠른 → 빠르)
const KO_N_ADJ = /(^|\s)(크|희|세|빠르|느리|바쁘|슬프|기쁘|아프|예쁘|나쁘|고프|배고프|다르|게으르|바르|올바르|푸르|짜|싸|비싸|차|시|쓰|흐리|어리|이르|그르|가파르|지치|굶주리|여리|힘세|멋지|눈부시|재빠르|날래|모자라|굳세|억세|드세|거세|고되|외지|값지|기름지|건방지|야무지|목마르|졸리|흐리|어리석|미련하|가녀리|짙|옅)$/;
// 받침 있는 줄기의 흔한 형용사 (작다·좋다 …)
const KO_PLAIN_ADJ = /(^|\s)(작|많|적|좋|높|낮|길|짧|넓|좁|깊|얕|밝|어둡|무겁|가볍|같|옳|싫|젊|늙|굵|가늘|얇|두껍|붉|검|희|노랗|빨갛|파랗|하얗|까맣|맑|멀|달|낡|늦|괜찮|거칠|힘들|낯설|드물|둥글|길쭉|짧막|기다랗|커다랗|조그맣|자그맣|그렇|이렇|저렇|어떻|굳|곧|궂|못나|잘나|못생기|잘생기|오래되|새롭)$/;
// '-있다/-없다' 형용사
const KO_ISS_ADJ = /(재미|맛|멋|상관|관계|가치|의미|소용|필요|쓸모|힘|자신|흥미|관심|인기|실력|지혜|경험|분별|소질|재능|매력|여유|용기|정신|철|버릇|염치|두서|보잘것|하잘것|어이|어처구니|형편|틀림|다름|변함|빈틈|끝|틈|뜻|맛|별수|대책|소용|상관)\s*(있|없)$/;
const KO_L_ADJ = { 긴: '길', 먼: '멀', 단: '달', 둥근: '둥글', 가는: '가늘', 거친: '거칠', 힘든: '힘들', 낯선: '낯설', 드문: '드물', 어진: '어질', 기다란: '기다랗', 커다란: '커다랗', 조그만: '조그맣', 자그만: '자그맣', 기나긴: '기나길', 빨간: '빨갛', 파란: '파랗', 노란: '노랗', 하얀: '하얗', 까만: '까맣', 동그란: '동그랗', 그런: '그렇', 이런: '이렇', 저런: '저렇', 어떤: '어떻' };
const KO_HAN_NOUN = new Set('제한 권한 기한 무한 시한 유한 원한 국한 극한 최소한 최대한 상한 하한 대한 한 은한 간한 기한'.split(' '));
// 영어 철자로 보는 품사 힌트 (한국어 꼴로 판단이 안 될 때만 씀)
const EN_ADJ = /(ous|ful|tive|sive|able|ible|ic|ical|less)$/i;
const EN_ADV = /^(rather|otherwise|merely|however|therefore|almost|already|soon|often|seldom|never|still|yet|even|instead|besides|nevertheless|nonetheless|moreover|furthermore|thus|hence|indeed|quite|too|also|once|again|away|abroad|ahead|apart|aside|forward|together|perhaps|maybe|nearly|hardly|barely|scarcely|rarely|eventually|finally|recently|lately|meanwhile|somewhat|anyway|beforehand|whereas|consequently|accordingly|likewise|altogether|overseas|outdoors|indoors|regardless|thereby|afterward|afterwards|in advance|at once|at last|in fact|of course|at least|at first|for instance|for example|on purpose|by chance|in time|on time|all of a sudden|in the end|after all|so far|by far|in addition|in contrast|on the other hand|as a result|in particular|above all|as usual|at all|for good|in vain|in turn|by accident|on average|in short|in general|in person|at times|from time to time|sooner or later|over and over|little by little|all at once|right away|at the same time)$/i;
const EN_LY_NOT = /^(friendly|lovely|lonely|likely|unlikely|costly|early|daily|weekly|monthly|yearly|elderly|ugly|silly|holy|deadly|lively|orderly|timely|curly|chilly|jolly|smelly|cowardly|scholarly|heavenly|worldly|homely|lowly|manly|leisurely|kindly|sickly|surly|burly|hilly|oily|woolly|prickly|supply|family|reply|apply|rely|comply|imply|multiply|ally|belly|jelly|bully|rally|assembly|monopoly|anomaly|fly|july|lily|italy|only|melancholy|folly|tally|sully|dally|gully|hilly|anomaly)$/i;
// 부사로 자주 쓰는 말
const KO_ADV = new Set('미리 단지 그저 오직 겨우 다만 오로지 단순히 꽤 매우 아주 너무 거의 오히려 도리어 차라리 특히 심지어 훨씬 약간 조금 상당히 무척 몹시 정말 정말로 완전히 대단히 곧 이미 벌써 아직 마침내 드디어 결국 끝내 즉시 당장 곧바로 바로 금방 이내 나중에 일찍 늦게 자주 가끔 종종 때때로 항상 늘 언제나 매일 결코 절대 절대로 전혀 도저히 아마 아마도 분명히 틀림없이 물론 확실히 게다가 또한 더구나 그러나 하지만 그런데 그렇지만 반면에 반면 그래서 따라서 그러므로 그러니까 결과적으로 대신 대신에 함께 같이 서로 혼자 홀로 스스로 갑자기 문득 별안간 다시 또 또다시 빨리 천천히 재빨리 급히 서둘러 몰래 살짝 잠깐 잠시 오래 영원히 한때 일단 우선 먼저 처음에 마지막으로 마침 우연히 대개 보통 주로 흔히 즉 점점 점차 차차 더욱 가장 여전히 이제 지금 방금 아까 실제로 정확히 대체로 저절로 억지로 함부로 새로 일부러 고의로 특별히 대략 거꾸로 따로 각각 모두 전부 모조리 가득 꼭 반드시 부디 제발 어쨌든 아무튼 하여튼 여기저기 이리저리 미처 비로소 내내 줄곧 계속 계속해서 끊임없이 한꺼번에 동시에 단번에 어느새 이따금 간혹 이윽고 머지않아 조만간 사실 사실은 물론이고 뜻밖에 의외로 마음껏 힘껏 정성껏 실컷 깨끗이 많이 높이 깊이 일찍이 굳이 곰곰이 일일이 낱낱이 틈틈이 겹겹이 고루 골고루 두루 널리 멀리 가까이 자세히 조용히 가만히 열심히 꾸준히 충분히 분명 그렇지 않으면 안 그러면 그 대신 뿐만 아니라 그 결과 예를 들면 예를 들어 이를테면 말하자면 다시 말해 요컨대 결론적으로 그다지 별로 좀처럼 미처 감히 차마 아무리 비록 만약 만일 혹시 마치 설마 하물며 오죽'.split(' '));
// '-의'로 끝나는 명사 (회의·정의 …): 꾸미는 말('고대의')로 보지 않음
const KO_UI_NOUN = new Set('회의 정의 의의 강의 합의 논의 동의 토의 건의 예의 결의 질의 협의 성의 호의 적의 열의 창의 고의 편의 민의 본의 무의 상의 하의 내의 우의 신의 대의 이의 자의 타의 사의 경의 조의 축의 탈의 수의 문의 여의 모의 심의 발의 중의 거의 수의사'.split(' '));
const KO_GE_NOUN = /(^|\s)(가게|무게|지게|집게|베게|게|성게|꽃게|대게|바다게|민물게)$/;

// 뜻(한 가지) → 품사. 'n' 명사 · 'v' 동사 · 'a' 형용사 · 'd' 부사(이어 주는 말 포함)
// v: { stem }, a: { stem(모르면 ''), attr(꾸미는 꼴), jeok('-적' 앞말, '-적인'일 때), pert('-의' 꼴일 때) }
function koKind(m, en, pos) {
  const w = String(m || '').trim(), e = String(en || '').trim().toLowerCase();
  const predLike = /[가-힣]다$/.test(w) || /(한|은|는|운|적인|[가-힣]의)$/.test(w);
  const enAdv = EN_ADV.test(e) || (/[a-z]{3,}ly$/.test(e) && !EN_LY_NOT.test(e));
  // 1) 부사
  if (pos === 'd' || KO_ADV.has(w)) return { kind: 'd' };
  if (/^[가-힣 ]*[가-힣]{2,}(게|히)$/.test(w) && !KO_GE_NOUN.test(w)) return { kind: 'd' };
  if (enAdv && !predLike && /(게|히|이|로|리|서|껏|면|에|고|도|만|록|듯|지)$/.test(w)) return { kind: 'd' };
  // 2) '-다'로 끝나는 말: 동사 또는 형용사
  if (/[가-힣]다$/.test(w) && w.length >= 2) {
    const stem = w.slice(0, -1);
    if (/[가-힣]적이$/.test(stem)) { const x = stem.slice(0, -1); return { kind: 'a', stem: '', attr: x + '인', jeok: x }; }
    let adj;
    if (/하$/.test(stem)) {
      const x = stem.slice(0, -1).replace(/\s+/g, '');
      adj = KO_HA_ADJ.has(x) || (pos === 'a') || (EN_ADJ.test(e) && !/\s/.test(stem));
    } else adj = pos === 'a' || KO_B_ADJ.test(stem) || KO_N_ADJ.test(stem) || KO_PLAIN_ADJ.test(stem) || KO_ISS_ADJ.test(stem);
    if (pos === 'v') adj = false;
    return adj ? { kind: 'a', stem, attr: koAdjAttr(stem, e) } : { kind: 'v', stem };
  }
  // 3) 꾸미는 꼴: 용감한·작은·무서운·꺼리는·빠른·고대의·효과적인
  if (/[가-힣]적인$/.test(w)) return { kind: 'a', stem: '', attr: w, jeok: w.slice(0, -1) };
  if (/^[가-힣]{2,}의$/.test(w) && pos !== 'n' && !KO_UI_NOUN.has(w) && !/주의$/.test(w)) return { kind: 'a', stem: '', attr: w, pert: true };
  if ((w.length >= 2 || /^[큰긴단먼센짠싼찬쓴신흰]$/.test(w)) && !KO_HAN_NOUN.has(w.replace(/^.*\s/, '')) && (/(한|은|는|운)$/.test(w) || (koSplit(w.slice(-1)) || [])[2] === 4)) {
    const st = koAdjStem(w, e);
    if (st) return { kind: 'a', stem: st, attr: w };
  }
  return { kind: 'n' };
}
// 형용사 꾸미는 꼴 → 줄기 (모르면 null)
function koAdjStem(a, en) {
  const tail = a.replace(/^.*\s/, ''), lead = a.slice(0, a.length - tail.length);
  if (KO_L_ADJ[tail]) return lead + KO_L_ADJ[tail];
  let m;
  if ((m = a.match(/^(.+)스러운$/))) return m[1] + '스럽';
  if ((m = a.match(/^(.+)로운$/))) return m[1] + '롭';
  if ((m = a.match(/^(.+)한$/))) return m[1] + '하';
  if ((m = a.match(/^(.+)(있|없)는$/))) return m[1] + m[2];
  if ((m = a.match(/^(.+[가-힣])는$/))) return m[1]; // 동사가 꾸미는 꼴: 꺼리는 → 꺼리
  if ((m = a.match(/^(.*)(.)운$/))) { const sp = koSplit(m[2]); if (sp && !sp[2]) { const st = m[1] + koJoin(sp[0], sp[1], 17); if (KO_B_ADJ.test(st)) return st; } return null; }
  if ((m = a.match(/^(.+)은$/))) { const sp = koSplit(m[1].slice(-1)); return sp && sp[2] ? m[1] : null; }
  const sp = koSplit(a.slice(-1));
  if (sp && sp[2] === 4) {
    const base = a.slice(0, -1) + koJoin(sp[0], sp[1], 0);
    if (KO_N_ADJ.test(base) || (EN_ADJ.test(en || '') && !/\s/.test(a))) return base;
  }
  return null;
}
// 형용사 줄기·꾸미는 꼴로 만드는 꼴들: attr(용감한) · pp(용감했어요) · ge(용감하게)
function koAdjForms(k, en) {
  if (k.jeok) return { attr: k.attr, pp: k.jeok + '이었어요', ge: k.jeok + '으로' };
  if (k.pert) return { attr: k.attr };
  if (!k.stem) return { attr: k.attr };
  return { attr: k.attr, pp: koPast(k.stem, en), ge: k.stem + '게' };
}
// 명사 갈래: 사람 · 곳 · 돈 · 느낌 · 때 · 일(사건) · 물건 · 생각(나머지)
const KO_N_PERSON = /(^|\s)(사람|인물|영웅|왕|여왕|왕자|공주|군인|장군|경찰|선생님|조수|비서|대표|회원|단원|동반자|동료|친구|이웃|부모|아이|어른|가족|친척|형제|자매|아기|노인|청소년|어린이|소년|소녀|남자|여자|신사|숙녀|직원|사장|고객|손님|주인|박사|교사|의사|간호사|약사|작가|화가|가수|배우|기자|학생|승객|관객|청중|시민|국민|주민|지도자|후보|상인|농부|어부|요리사|선수|감독|심판|코치|목수|건축가|기업가|사업가|예술가|전문가|정치가|작곡가|소설가|과학자|학자|기술자|노동자|소비자|생산자|참가자|지원자|운전자|관리자|담당자|책임자|조상|후손|경쟁자|라이벌|적|상대|낯선 사람|이방인|외국인|여행자|여행객|관광객|탑승객|방문객|구경꾼|목격자|범인|도둑|용의자|피해자|희생자|생존자|자원봉사자|봉사자|후원자|지지자|팬|동포|청년|소년단|팀|팀원|대원|부하|상사|부하 직원|신입|후배|선배|스승|제자|멘토|조언자|안내자|가이드|통역사|번역가|변호사|판사|검사|은행원|공무원|대통령|총리|장관|국회의원|의원|시장|주지사|대사|외교관|군대|부대|집단|무리|군중|대중|인류|인간)$/;
const KO_N_PLACE = /(^|\s)(장소|곳|학교|교실|도서관|박물관|미술관|병원|공원|시장|가게|상점|식당|공장|회사|사무실|은행|역|공항|항구|도시|마을|나라|국가|섬|산|강가|해변|바닷가|숲|사막|동굴|성|궁전|광장|운동장|경기장|극장|영화관|교회|절|감옥|농장|정원|부엌|방|거실|창고|지하실|옥상|호숫가|들판|언덕|골목|거리|지역|구역|영토|국경|해안|대륙|지구|우주|행성|기지|센터|건물|시설|캠프|목적지|출발지|도착지|정류장|터미널|주차장|주유소|우체국|경찰서|소방서|시청|법원|대사관|호텔|숙소|기숙사|연구소|실험실|작업장|공방|매장|백화점|편의점|카페|빵집|약국|체육관|수영장|놀이터|동물원|식물원|수족관|유적지|관광지|휴양지|고향|외국|해외|시골|도심|교외|근처|주변|입구|출구|통로|복도|계단|다리|도로|길|철도|선로|항로|경로|진로|코스|구간|목장|과수원|논|밭|밀림|정글|초원|빙하|화산|폭포|계곡|협곡|해협|만|반도|오아시스|사원|신전|탑|요새|성벽|마당|뜰|현관|지붕|창가)$/;
const KO_N_MONEY = /(^|\s)(돈|비용|가격|값|요금|예산|수익|수입|이익|이윤|소득|매출|자금|자본|재산|임금|월급|급여|연봉|세금|상금|벌금|이자|용돈|수수료|입장료|등록금|보험료|운임|동전|지폐|현금|금화|은화|부|재물|보물|저금|저축|빚|부채|대출|할인|환불|영수증|요금표|가치|손해|손실|적자|흑자|경비|지출|비자금|기금|모금액|기부금|후원금|장학금|보상금|배당금|투자금|원금|잔액|잔돈|거스름돈)$/;
const KO_N_FEEL = /(^|\s)(기쁨|슬픔|분노|화|두려움|공포|걱정|근심|불안|긴장|놀람|실망|후회|만족|감동|감정|기분|마음|사랑|애정|미움|증오|질투|부러움|외로움|그리움|행복|불행|희망|절망|좌절|용기|자신감|자부심|자존심|수치심|호기심|관심|흥미|열정|열의|감사|미안함|죄책감|안도|안도감|평온|짜증|지루함|스트레스|우울|우울함|즐거움|재미|설렘|흥분|당황|부끄러움|창피|동정|연민|존경|경외|신뢰|불신|의심|확신|자만|겸손|인내|끈기|책임감|소속감|성취감|만족감|허탈감|상실감|안정감|유대감|친밀감|긴장감|위기감|두근거림|향수|기대|기대감|실망감)$/;
const KO_N_TIME = /(^|\s)(시간|기간|시기|시대|순간|날|하루|주|달|해|년|세기|아침|저녁|밤|낮|새벽|오후|오전|마감|마감일|기한|일정|약속|계절|봄|여름|가을|겨울|과거|현재|미래|휴일|휴가|방학|주말|평일|생일|기념일|명절|연휴|순서|차례|기회|때|무렵|직전|직후|당일|내일|어제|오늘|모레|이번 주|다음 주|올해|내년|작년|미래 세대|일생|평생|청춘|어린 시절|노년|유년기|사춘기|임기|정년|시한|마감 시간|출발 시간|도착 시간|첫날|마지막 날)$/;
const KO_N_EVENT = /(^|\s)(축제|행사|대회|경기|시합|잔치|파티|회의|모임|공연|전시|전시회|박람회|여행|사고|사건|재난|재해|전쟁|싸움|전투|혁명|선거|시험|수업|강의|발표|면접|결혼|결혼식|장례|장례식|졸업|졸업식|입학|입학식|탄생|죽음|모험|탐험|실험|훈련|연습|공사|수술|소풍|캠핑|여정|항해|원정|경주|마라톤|올림픽|콘서트|연주회|음악회|시상식|기념식|개막식|폐막식|퍼레이드|행진|시위|집회|회담|협상|토론|토론회|세미나|워크숍|강연|설명회|오디션|경매|세일|바자회|사건 사고|화재|홍수|지진|태풍|폭풍|가뭄|산불|정전|고장|실수|위기|비상|응급|긴급 상황)$/;
const KO_N_THING = /(^|\s)(상자|가방|열쇠|도구|장비|기계|장치|책|종이|편지|선물|보물|옷|신발|모자|안경|시계|컴퓨터|전화|휴대폰|자동차|차|배|비행기|자전거|공|칼|총|방패|창|활|화살|밧줄|끈|띠|줄|붕대|반창고|다발|꾸러미|묶음|뭉치|막대|막대기|울타리|벽|문|창문|의자|책상|침대|그릇|컵|접시|음식|빵|과일|채소|고기|약|돌|바위|나무|꽃|풀|씨앗|열매|금|은|철|유리|천|실|바늘|못|망치|사다리|지도|깃발|램프|등불|촛불|거울|사진|그림|악기|피아노|기타|북|노트|공책|연필|펜|지갑|카드|표|티켓|동전|반지|목걸이|왕관|장난감|인형|우산|담요|이불|베개|수건|비누|칫솔|양동이|바구니|병|통|항아리|냄비|솥|주전자|숟가락|젓가락|포크|가위|풀|테이프|봉투|우표|소포|짐|화물|재료|자재|부품|제품|상품|물건|물품|작품|발명품|기념품|장식|장식품|무기|갑옷|투구|헬멧|망원경|현미경|돋보기|나침반|손전등|배터리|전구|플러그|전선|케이블|안테나|로봇|드론|카메라|텔레비전|라디오|냉장고|세탁기|청소기|에어컨|난로|선풍기|엔진|바퀴|날개|돛|노|닻|그물|낚싯대|덫|함정|미끼|사슬|자물쇠|금고|서랍|선반|책장|옷장|커튼|카펫|양탄자|매트|텐트|침낭|배낭|썰매|스키|보트|뗏목|카누|기차|버스|트럭|오토바이|헬리콥터|로켓|우주선|잠수함|탱크|대포|폭탄|화약|성냥|라이터|연료|석유|석탄|가스|전기|물|기름|소금|설탕|밀가루|쌀|우유|달걀|치즈|버터|꿀|잼|과자|사탕|초콜릿|케이크|쿠키|아이스크림|음료|주스|차|커피|국|수프|반찬|도시락|간식|사료|비료|씨|묘목|화분|꽃다발|화환|리본|단추|지퍼|벨트|넥타이|장갑|양말|목도리|스카프|코트|외투|치마|바지|셔츠|드레스|교복|제복|유니폼|가면|탈|분장|화장품|향수|보석|다이아몬드|진주|금괴|은괴|동상|조각상|기념비|비석|간판|표지판|팻말|게시판|칠판|분필|지우개|자|계산기|공구|연장|삽|괭이|낫|도끼|톱|드라이버|렌치|나사|볼트|너트|못|접착제|본드|밴드)$/;

function koNounKind(w) {
  const s = String(w || '').trim();
  if (KO_N_PERSON.test(s)) return 'person';
  if (KO_N_MONEY.test(s)) return 'money';
  if (KO_N_FEEL.test(s)) return 'feel';
  if (KO_N_TIME.test(s)) return 'time';
  if (KO_N_EVENT.test(s)) return 'event';
  if (KO_N_PLACE.test(s)) return 'place';
  if (KO_N_THING.test(s) || /[가-힣](물|품)$/.test(s) && !/(인물|생물학|선물하|사물놀이)$/.test(s)) return 'thing';
  return 'idea';
}
