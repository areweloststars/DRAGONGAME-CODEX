# DRAGONGAME-CODEX · 용과 기사

차분한 중세 수채화 삽화를 사용하는 이야기 게임, 기존 AI 단어 학습 프로그램, 독립 이미지 생성 엔진의 작업 저장소입니다.

## 실행

저장소 루트의 `index.html`을 열면 게임 두 가지를 선택할 수 있습니다. 로컬 서버가 필요하면 `python -m http.server 8787`을 실행하고 `http://localhost:8787`에 접속하세요. 서버는 개발 미리보기용입니다.

- `episode-1/index.html`: 8장면 삽화와 기존 음성이 포함된 독립 이야기 게임.
- `word-game/index.html`: 기존 AI 단어 학습 프로그램. 학습 기록은 사용한 브라우저에 저장됩니다.
- `examples/dragon-mist.voca-art.json`: 기존 게임의 **이야기 삽화 넣기**에서 가져올 승인 그림 7장.
- `image-engine/`: 별도 프로그램에서도 사용할 수 있는 Node 이미지 엔진. [엔진 안내](image-engine/README.md).
- `episode-1/art/`: 승인된 원본 PNG와 화면용 JPEG, 기준 그림 및 제작 프롬프트.
- `episode-1/audio/`: 현재 적용된 기존 음성. 새 할머니 음성이 아닙니다.

## 생성 비용 없는 검사

Node.js 22 이상을 사용합니다. 엔진 검사는 설치 없이 가능합니다.

```sh
npm --prefix image-engine test
npm --prefix image-engine run demo:plan
npm run build
npm test
```

앱 테스트는 jsdom 개발 의존성이 필요합니다. 클라우드에 없으면 의존성 설치 허용 범위를 먼저 확인하세요. 모델·유료 API는 검사에 사용하지 않습니다. 이야기 게임 재빌드는 `node scripts/build-episode.cjs`입니다. 새 낭독 적용 시 원본과 빌더도 함께 갱신해야 이전 음성으로 되돌아가지 않습니다.

## 모바일에서 PC 없이 이어서 작업

웹 또는 데스크톱 Codex에서 **Work in → Cloud → Select environment → Create environment**로 이 저장소를 연결합니다. 설정을 검토하고 Publish가 완료되면 모바일 Codex에서 해당 환경을 선택할 수 있습니다. 현재 로컬 PC의 대화·플러그인 로그인·예약 작업은 저장소 업로드만으로 자동 이전되지 않습니다.

공식 안내: https://learn.chatgpt.com/docs/cloud

새 클라우드 작업에서는 `CLOUD-HANDOFF.md`와 `AGENTS.md`를 먼저 읽도록 요청하세요. 준비된 저장소와 실제 생성 모델은 별개입니다. 모델 설치·다운로드·유료 생성·웹사이트 배포는 하지 않았습니다. GitHub 업로드는 사용자가 명시한 저장소에 작업을 저장하는 범위입니다.

## 현재 상태

그림 8장과 게임 미션·오답 복습 검증 완료. 독립 엔진 19개·기존 앱 20개 검사 통과. **새 할머니 낭독은 미완료**입니다. 남은 작업과 무료 한도 재시도 조건은 `CLOUD-HANDOFF.md`에 있습니다.

루트 및 엔진 코드는 별도 오픈소스 라이선스를 임의 부여하지 않았습니다. 포함된 OCR/TTS 구성요소의 기존 LICENSE/NOTICE는 해당 폴더에 보존했습니다. 외부 모델과 서비스의 이용 조건은 별도로 확인해야 합니다.
