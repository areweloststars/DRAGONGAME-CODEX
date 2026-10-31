# 게임과 연결하는 방법

엔진은 게임의 화면과 저장 방식을 알지 못합니다. 게임 어댑터가 현재 학습 내용을 설계서로 바꾸고, 반환된 그림 묶음을 해당 단어에 연결합니다.

```js
const { core } = require('../index.cjs');
const plan = core.normalizePlan(currentLessonPlan);
// Save plan as JSON, render separately, then read the resulting package.
const safe = core.validateArtPackage(receivedPackage, plan);
for (const picture of safe.images) {
  core.rasterDimensions(picture.dataUrl);
  // Browser adapters must also await actual bitmap decoding before persistence.
  // Store under (plan.deckId, plan.sceneId, picture.wordId).
}
```

`currentLessonPlan`과 `receivedPackage`는 게임이 제공하는 값입니다. 이 코드는 연결 순서를 보여주는 예시이며 단독 실행 파일이 아닙니다. 브라우저에서는 `core.js`를 로드하면 `globalThis.VocaImageEngine`을 사용합니다. Node에서는 패키지의 `core`를 가져옵니다.

기존 단어 게임 연결은 앱의 `09-story-art-ui.js`가 담당합니다. 앱 빌드가 이 패키지의 `core.js`를 HTML 안에 포함하므로 페이지를 열 때 엔진 서버에 접속하지 않습니다. 기존 `08-image-engine.js`는 Node용 호환 진입점입니다. 원본 파일들을 각각 script 태그로 붙이는 방식 대신 앱 빌드를 사용하세요.

학습 단어, 정답, 점수와 복습 기록은 게임이 소유합니다. 그림 가져오기·삭제는 이 상태를 수정하지 않아야 합니다. 기존 연결은 IndexedDB에 그림을 보관하고, 그림이 없거나 저장소를 사용할 수 없으면 기본 삽화를 표시합니다.

비동기로 읽거나 디코딩할 때 시작 당시의 단어장·에피소드·열린 창을 기록하세요. 그 사이 사용자가 단어장을 바꾸거나 창을 닫았으면 늦게 끝난 결과를 설치하지 않습니다. 기존 연결은 epoch와 장면별 revision으로 이 조건을 검사합니다.

기존 게임에서 **이야기 삽화 넣기 → 장면 설계서 받기 → 별도 엔진 실행 → 결과 파일 가져오기** 순서로 사용합니다. 브라우저에는 모델 실행 키나 외부 API 키를 넣지 않습니다. 원본 `.voca-art.json`은 브라우저 데이터 삭제에 대비해 별도로 보관하세요.
