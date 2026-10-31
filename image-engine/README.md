# 이야기 게임 이미지 엔진

이야기의 등장인물·배경·단어별 장면을 일정한 형식으로 정리하고, 생성 제공자가 만든 그림을 게임에서 가져올 수 있는 JSON 묶음으로 만듭니다. 이 폴더만 다른 저장소로 옮겨 실행할 수 있습니다. Node.js 22 이상이 필요하며 외부 패키지 설치는 필요하지 않습니다.

현재 그림 방향은 옅은 수채·과슈, 종이 질감, 회청색 안개, 석재와 올리브 색조입니다. 예제는 ‘용과 기사’의 기존 7단어를 보존합니다. 그림 생성 모델 자체나 Codex의 내장 이미지 생성 기능을 포함한 패키지는 아닙니다. 로컬 ComfyUI 연결과 교체 가능한 제공자 인터페이스를 제공합니다.

## 먼저 생성 없이 확인하기

이 README가 있는 폴더에서 실행합니다.

```sh
npm test
npm run demo:plan
```

테스트는 내장 Node 테스트 도구와 작은 고정 그림만 사용합니다. `artifacts/dragon.dry-run.json`에는 7개 프롬프트와 ComfyUI 작업 명세가 저장됩니다. 모델·서버·API 키·네트워크·이미지 생성 없이 실행합니다. `demo:plan`은 해당 확인용 결과 파일을 덮어씁니다.

## 구조와 게임 연결

| 파일 | 역할 |
| --- | --- |
| `core.js` | 브라우저와 Node가 공유하는 설계서·결과 검증, 프롬프트, 식별 값 |
| `pipeline.cjs` | 제공자 실행 순서, 취소, 캐시, 재개, 결과 묶음 |
| `comfy.cjs` | 로컬 ComfyUI 모델 점검·요청·완료 확인 |
| `generate.cjs` | 설계서를 읽고 결과를 저장하는 실행기 |
| `index.cjs` | 다른 프로그램에서 가져오는 공개 함수 |
| `examples/` | 용과 기사 설계서와 비용 없는 대체 제공자 예제 |

게임은 설계서를 내보내고 완성된 그림 묶음을 가져옵니다. 엔진은 화면·정답 채점·학습 기록·브라우저 저장소를 다루지 않습니다. 원래 단어 게임의 연결 코드는 앱 쪽에 유지되며, 엔진 복사본에는 포함하지 않습니다. [게임 어댑터 안내](docs/ADAPTER.md)와 [데이터 계약](docs/CONTRACT.md)을 참고하세요.

## 로컬 생성 연결

사용자가 별도로 준비한 ComfyUI와 호환 모델이 있을 때 실행합니다. 이 패키지는 모델을 설치하거나 내려받지 않습니다. 설정 예제를 그대로 사용하면 먼저 해당 모델 파일명이 로컬 서버에 있는지 검사합니다.

```sh
node generate.cjs examples/dragon-mist.voca-plan.json --config config.example.json --out artifacts/dragon.voca-art.json
```

`--comfy`, `--unet`, `--clip`, `--t5`, `--vae`, `--weight-dtype`, `--timeout`, `--request-timeout`으로 설정 파일의 값을 덮어쓸 수 있습니다. 시간 단위는 초입니다. `--help`에서 전체 옵션을 확인하세요. 주소는 localhost 또는 루프백 IP만 허용합니다. 인증 정보와 외부 주소는 받지 않습니다.

현재 ComfyUI 작업 명세는 FLUX.1 schnell 계열의 4단계, CFG 1 설정입니다. 별도로 기록된 negative prompt는 이 작업 명세에서는 적용되지 않습니다. 모델·장비에 따라 결과가 달라지며, 실제 모델 추론의 품질·속도·등장인물 일관성은 아직 검증하지 않았습니다. 승인된 기존 삽화와 같은 결과를 보장하지 않습니다.

## 중단과 이어 만들기

완료된 그림은 기본 `.cache/`에 저장됩니다. 같은 설계서·프롬프트·제공자 버전·작업 명세로 다시 실행하면 완료분을 재사용합니다. 모델이나 프롬프트가 달라지면 새 항목을 만듭니다. `--cache-dir`로 위치를 바꾸거나 `--no-cache`로 사용하지 않을 수 있습니다. 자동 재시도는 하지 않습니다.

취소 시 다음 장면을 시작하지 않습니다. ComfyUI 대기열에서는 이 실행이 만든 작업 ID만 제거하며, 서버 전체를 중단하지 않습니다. 이미 실행 중인 서버 작업은 계속될 수 있으므로 서버 화면에서 확인하세요. 기존 결과 파일은 보호하며, 덮어쓰려면 `--overwrite`를 명시해야 합니다.

## 다른 생성 제공자 연결

```js
const { generateWithProvider } = require('./index.cjs');
const plan = require('./examples/dragon-mist.voca-plan.json');
const provider = require('./examples/custom-provider.cjs');
const result = await generateWithProvider(plan, provider, { cacheDir: '.cache' });
```

위 코드는 `async` 함수 안에서 사용합니다. 제공자는 `metadata`, 동기 함수 `plan(prompt)`, 비동기 함수 `render(job, signal)`, 선택적 `prepare(job, signal)`을 구현합니다. 작업과 metadata는 JSON으로 표현 가능해야 합니다. `plan`은 순수하게 작업 명세만 만들고 네트워크·생성·파일 쓰기를 하지 않아야 dry-run의 의미가 유지됩니다. `prepare`는 캐시가 없는 첫 작업 직전에 한 번 호출합니다. `render`는 `{ mime, dataUrl }`을 반환합니다. 렌더러 변경 시 metadata의 버전도 변경하세요. metadata에는 비밀키를 넣지 마세요. 결과 파일에 저장됩니다.

`examples/custom-provider.cjs`는 교체 구조를 확인하는 **1픽셀 고정 그림 예제**이며 완성 삽화가 아닙니다. 외부 유료 서비스를 연결한 구현은 포함하지 않습니다. 추후 제공자 연결 시 인증·과금 확인·사용자 동의는 그 제공자의 책임입니다.

## 기존 승인 그림 묶기

`scene-2.jpg`부터 `scene-8.jpg`까지 있는 폴더를 명시합니다. 새 그림을 생성하지 않고 기존 JPEG를 포장합니다.

```sh
node create-demo-package.cjs --source "승인 삽화 폴더" --out artifacts/approved
```

기본 예제에서 순서는 approach, protest, recommend, weakness, aim, announce, passenger입니다. 첫 장면은 별도 게임의 표지이므로 7단어 묶음에 넣지 않습니다. 게임에서 받은 최신 설계서는 `--plan`으로 지정할 수 있습니다. 학습 내용이 달라졌다면 그림과 단어의 대응을 검토하세요. 큰 이미지·그림 묶음은 기본 Git 제외 대상입니다.

## GitHub로 옮기기

```sh
npm run export -- --out "새 폴더 경로"
```

`export-manifest.json`에 명시된 코드·문서·작은 예제·테스트만 복사합니다. 기존 폴더는 덮어쓰지 않습니다. 브라우저 학습 기록, 실제 삽화, 캐시, 비밀키, 개인 작업 이력은 포함하지 않습니다. 복사본 폴더에서 `npm test`와 `npm run demo:plan`을 다시 실행할 수 있습니다. Git 저장소 생성·원격 등록·업로드는 이 명령에 포함되지 않습니다.

복사본의 `.github/workflows/engine-check.yml`은 Windows/Linux 및 Node 22/24에서 테스트와 dry-run을 수행하도록 준비되어 있습니다. 모델 실행·API 호출 단계는 없습니다. 실제 GitHub 실행은 업로드 이후이며 아직 실행 결과가 아닙니다. GitHub Actions의 실행 요금은 해당 저장소 계정 정책에 따릅니다.

`private: true`, `UNLICENSED` 상태로 배포를 막아 두었습니다. 공개 또는 배포 전에 코드와 이미지·사용할 모델 각각의 이용 조건을 검토하고 저장소 소유자가 라이선스를 정해야 합니다. 낭독 음성은 이 엔진의 범위에 포함되지 않습니다.
