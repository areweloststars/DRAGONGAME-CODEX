# 그림 스토리 단어 미션 — 소스 구조

배포되는 게임은 `word-game/index.html` 한 파일이에요 (GitHub Pages: `https://<계정>.github.io/<저장소>/word-game/`).
이 파일은 **빌드 결과**라서 직접 고치지 않고, `app/src`를 고친 뒤 빌드해요.

```
npm install      # 테스트용 jsdom 받기 (게임 실행에는 필요 없음)
npm run build    # app/src → word-game/index.html
npm test         # 빌드가 최신인지 + 회귀 테스트
```

## 폴더

| 경로 | 내용 |
| --- | --- |
| `app/src/shell.html` | HTML 껍데기 (`/*@@STYLES@@*/`, `/*@@SCRIPT@@*/` 자리에 CSS·JS가 들어감) |
| `app/src/styles.css` | 화면 스타일 |
| `app/src/NN-*.js` | 게임 스크립트. 번호 순서대로 이어 붙여 하나의 `<script>`가 되고, 모두 같은 전역 범위를 써요 |
| `app/build.cjs` | 빌드 (`--check`는 비교만) |
| `app/tests/` | jsdom 회귀 테스트 |
| `word-game/ocr/` | 글자 인식(Tesseract.js)과 영어·한국어 단어 목록 |
| `word-game/tts/` | 영어 발음용 음성 엔진(Piper·eSpeak NG). 라이선스는 `word-game/tts/NOTICE.txt` |

## 스크립트 모듈

| 파일 | 하는 일 |
| --- | --- |
| `01-art-kit.js` | SVG 그림 부품 |
| `02-scenes.js` | 기본 단어장 장면 그림 7편 |
| `03-gen-panels.js` | 만화 칸 사양(JSON) → 그림 |
| `04-demo-deck.js` | 기본 단어장(창작 데모) 단어·자막·정답 |
| `05-decks.js` | 단어장 바꾸기, 단어장별 진행 기록, 단어장 보관함 |
| `06-make-ui.js` | 사진·글로 새 단어장 만들기 화면, 붙여 넣은 목록 읽기 |
| `07-ocr.js` | 사진 속 단어 읽기(이 기기 안에서), 줄·칸 맞추기, 사전으로 고치기 |
| `08-korean.js` | 한국어 조사·활용(불규칙 포함), 뜻의 품사 짐작 |
| `08-story-gen.js` | 단어 뜻으로 그림 고르기, 이야기 자동 만들기 (뜻 갈래별 장면 문장 + 품사별 기본 문장) |
| `09-picture-editor.js` | 그림 꾸미기 |
| `10-make-deck.js` | 정답 묶음 만들기, 에피소드 만들기, 저장 |
| `11-app-core.js` | 저장 기록, 난이도, 공용 아이콘 |
| `12-voice.js` | 효과음, 기기 음성·생성 음성·eSpeak 읽기 |
| `13-zoom-panel.js` | 확대되는 그림 패널 |
| `14-screens.js` | 홈·스토리 화면 |
| `15-mission.js` | 뜻 입력 미션·보스·복습 |
| `16-events-boot.js` | 이벤트 연결, 시작 |

사용자 기록은 브라우저 `localStorage`에만 저장돼요 (`day02-voca-mission-v1`: 진행 기록, `voca-decks-v1`: 만든 단어장). 키 이름은 예전 기록을 잃지 않도록 그대로 둬요.

## 사진 단어장의 이야기 문장 늘리기

Claude 없이 만드는 이야기는 `08-story-gen.js`의 표 두 개로 문장을 골라요.

- `SEM`: 뜻 갈래별 장면 문장. 한 줄이 `[뜻 열쇠말 정규식, { n: 명사, v: 동사, a: 형용사, d: 부사 문장 틀 }, 그림]`이에요.
  열쇠말은 낱말 첫머리에서만 찾아요(‘침착한’ 속 ‘착한’은 안 맞음). 위에 있는 줄이 먼저예요.
- `ST_GEN`: 갈래에 없는 뜻에 쓰는 품사·갈래별 기본 문장.

문장 틀 토큰: `{H}` 주인공 · `{F}` 친구 · `{V}` 말썽꾼 · `{P}` 장소 · `{G}` 찾는 물건 · `{E}` 사건 (`{H:은}`처럼 쓰면 받침에 맞는 조사),
`{W}` 단어 자리(`{W:을}` 뜻 + 조사), 동사 `{W:past}` `{W:ki}` `{W:go}` `{W:ryeo}` `{W:ryeodaga}` `{W:ra}`, 형용사 `{W:attr}` `{W:pp}` `{W:ge}`.
틀을 더하면 `npm test`가 조사·남은 기호·반복을 확인해요.
