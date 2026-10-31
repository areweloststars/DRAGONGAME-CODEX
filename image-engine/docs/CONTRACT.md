# 데이터 계약 v1

실행 가능한 기준은 `core.js`의 `normalizePlan`과 `validateArtPackage`입니다. 알 수 없는 부가 필드는 반환값에서 제외합니다. 스키마를 변경할 때 기존 v1 게임과의 호환성을 검토하세요.

## 입력: voca-story-plan/v1

| 필드 | 형식과 의미 |
| --- | --- |
| format | `voca-story-plan/v1` |
| deckId, sceneId | 각각 1~160자, 게임의 단어장·에피소드 식별자 |
| title, story | 제목 1~300자, 본문 1~12000자 |
| style | 현재 `watercolor-fantasy-v1`만 지원, 생략 시 기본값 |
| characters | 최대 12명, `{ id, description }`, id 1~80자·중복 불가, 설명 1~1600자 |
| setting | 배경·시대·빛의 연속성을 설명하는 문자열, 최대 2400자 |
| seed | 0~4294967283 정수, 기본 1729 |
| words | 1~12개, 아래 장면 정보를 배열 순서대로 처리 |

단어 장면은 `{ id, word, meaning, visual, characterIds }`입니다. id와 word는 1~160자, meaning은 1~500자, visual은 1~3000자입니다. 단어 id는 중복할 수 없습니다. characterIds는 등록된 인물 id의 배열이며, 비워 두면 전체 인물을 프롬프트의 연속성 정보에 넣습니다. 문자는 NFC 정규화하고 앞뒤 공백을 제거합니다.

`words`의 순서가 서사의 진행 순서입니다. `visual`에 해당 장면의 행동·거리·대결 또는 항복 상태를 구체적으로 씁니다. 결과 그림에는 글자를 넣지 않고 게임이 단어를 표시합니다. 각 장면 프롬프트는 같은 story와 setting, 선택된 인물 설명을 포함하며 seed는 기본값 + 장면 인덱스입니다. 현재 기본 생성 크기는 768×512입니다. 이것은 프롬프트를 통한 일관성 지시이며 얼굴·장면 일관성을 보장하는 학습 모델은 아닙니다.

## 출력: voca-story-art/v1

| 필드 | 의미 |
| --- | --- |
| format | `voca-story-art/v1` |
| deckId, sceneId, style | 입력과 동일 |
| sourceFingerprint | 현재 이야기·학습 단어와의 일치 확인용 값 |
| images | `{ wordId, dataUrl, mime, prompt?, seed? }` 배열 |

그림은 PNG/JPEG/WebP base64 data URL입니다. 외부 URL과 SVG는 받지 않습니다. wordId는 설계서 단어에 속해야 하며 중복할 수 없습니다. 부분 묶음(1개 이상)도 가져올 수 있지만 생성 파이프라인은 모든 장면을 완료한 뒤 결과를 반환합니다. prompt는 최대 30000자, seed는 선택적 정수입니다.

각 파일 6 MiB, 직렬화된 생성 묶음 50 MiB 제한을 적용합니다. 픽셀 제한은 각 변 8192px, 총 16,777,216픽셀입니다. `validateArtPackage`는 계약과 파일 형식 식별을 검사합니다. Node 파이프라인의 `validateImage`는 base64·파일 서명·해상도 헤더를 추가 검사합니다. 이는 전체 비트맵 디코딩 검증이 아닙니다. 게임 어댑터는 저장하기 전에 실제 그림 디코딩을 추가로 확인해야 합니다.

파이프라인은 부가 기록 `engine`, `generatedAt`, `timings`도 반환합니다. 게임은 이를 필수 필드로 의존하면 안 됩니다. 생성 제공자 metadata에는 공개해도 되는 이름·버전·모델 설정만 넣습니다.

## 두 종류의 식별 값

- `sourceFingerprint(plan)`: deckId, sceneId, title, story, 단어 id·word·meaning의 순서를 반영합니다. 다른 학습 내용에 그림을 잘못 붙이는 일을 막습니다. 인물·배경·visual만 고친 그림은 같은 학습 내용에 다시 가져올 수 있습니다.
- `fingerprint(plan)`: 프롬프트 방향을 포함한 전체 설계서 변경 확인용입니다. 파이프라인 캐시는 별도로 전체 설계서·프롬프트·제공자 metadata·작업 명세에 SHA-256을 적용합니다.

두 공개 식별 함수의 결과는 인증·권한·원본 증명용이 아닙니다. 외부 사용자가 보낸 묶음은 항상 현재 설계서로 다시 검증하세요.

## 확인 전용 결과

`--dry-run` 결과 형식은 `voca-story-dry-run/v1`입니다. plan, sourceFingerprint, engine, jobs를 포함합니다. `jobs[i]`는 `{ prompt, workflow }`이며 렌더링이나 캐시 쓰기를 하지 않습니다. 이 결과는 그림 묶음이 아니므로 게임으로 가져올 수 없습니다.
