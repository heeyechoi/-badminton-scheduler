# 배드민턴 게임 스케줄러 — 진행 상황

React + Vite + Zustand 기반 배드민턴 클럽 코트/게임 스케줄러. 원래는 서버 없이 브라우저 localStorage에만 저장하는 구조였고(운영자 한 명이 한 기기에서 조작), 지금은 Firebase Realtime Database 연동으로 다른 사람들이 자기 기기에서 실시간으로 "미리보기"를 볼 수 있고, 관리자 화면도 같은 경로로 양방향 동기화되어 같은 관리자 링크를 여러 기기에서 동시에 열어 조작할 수 있다.

**배포 주소**: https://heeyechoi.github.io/-badminton-scheduler/ (GitHub Pages, `main` 브랜치 push 시 GitHub Actions로 자동 빌드·배포)

## 아키텍처 요약

- **상태 관리**: `src/store/useAppStore.js` (Zustand + `persist` 미들웨어, localStorage 키 `badminton-scheduler`), 파생 값은 `src/store/selectors.js`
- **매칭/급수 로직**: `src/lib/matching.js`(추천 후보 생성·스코어링), `src/lib/skill.js`(급수 궁합/밸런스), `src/lib/fairness.js`(공정성·타입 밸런스 등 보조 스코어), `src/lib/gameType.js`, `src/lib/courtAssignment.js`
- **드래그앤드롭**: `@dnd-kit`, `App.jsx` 최상단 단일 `DndContext` + `src/lib/dragIds.js`의 커스텀 id 스킴(`slot:gameId:teamKey:index`, `builder:index`, `roster:playerId`, 대기열은 정렬용 id)
- **선수 상태**: `'대기중' | '게임중' | '휴식중'` 세 가지뿐. "예약(대기열에 들어감)"은 별도 상태가 아니라 `reservedPlayerIds(queueOrder, gamesById)`로 매번 파생 계산됨 — 이 설계 원칙을 어기면(즉, 예약 여부를 status로 표현하려고 하면) 버그가 생기기 쉬움(아래 "최근 수정한 버그" 참고)
- **URL 쿼리로 구분되는 세 가지 진입점**: `?display=1`(참여자, 읽기 전용), `?admin=1`(관리자, 세션이 없으면 곧장 `SetupModal`), 둘 다 없는 순수 base URL(랜딩 — 세션이 없으면 `Landing.jsx`의 운동 생성/참여 선택 화면). **단, 세션이 이미 시작된 상태(`session.startedAt` 존재)라면 URL에 `admin` 파라미터가 있든 없든 무조건 바로 관리자 보드로 들어감** — 매일 쓰는 북마크(파라미터 없는 순수 주소)가 계속 그대로 동작하게 하기 위함. 즉 `admin=1`은 "세션이 아직 없을 때 랜딩을 건너뛰고 바로 새 세션을 만들겠다"는 의도만 표시하는 파라미터.
- **표시 화면(미리보기/참여자)**: `?display=1`로 분기되는 읽기 전용 화면(`src/components/display/*`). `onValue` 구독으로 Firebase Realtime Database(`liveState` 경로)를 실시간 반영만 함(쓰기 없음) — **다른 사람의 폰/PC에서도 참여자 링크로 그대로 보임**.
- **관리자/참여자 링크 분리 복사**: 헤더의 "🔗 관리자 링크 복사"는 `?admin=1`을, "🔗 참여자 링크 복사"는 `?display=1`을 붙인 URL을 클립보드에 복사함(`Header.jsx`의 `getAdminUrl`/`getDisplayUrl`) — 운영자는 관리자 링크를 공동 운영자에게, 참여자 링크를 참가자들에게 나눠서 공유하는 용도. 클립보드 API 실패 시 `window.prompt` 폴백. **처음엔 관리자 링크를 그냥 쿼리 없는 base URL로 만들었다가, 그러면 랜딩 페이지 주소와 구분이 안 된다는 지적을 받고 `?admin=1`을 붙이는 걸로 수정함** — 링크 자체의 정체성(이게 랜딩인지 관리자 입장용인지)이 URL에 드러나야 한다는 게 핵심.
- **입장 화면(랜딩)**: 세션이 없고 `admin` 파라미터도 없을 때 `App.jsx`가 `Landing.jsx`(운동 생성 / 운동 참여 두 버튼)를 보여줌. "운동 생성"은 로컬 상태가 아니라 **실제로 현재 URL에 `?admin=1`을 붙여 이동**함(`Landing.jsx`의 `handleCreate`) — 그래야 이 상태에서 새로고침해도 랜딩으로 안 돌아가고, 이 URL 자체가 "관리자 링크 복사"가 만드는 것과 동일한 모양이 됨. "운동 참여"는 텍스트 입력에 관리자/참여자 링크를 붙여넣게 한 뒤 `window.location.href`로 그 URL에 실제 이동시킴. 이미 진행 중인 세션이 Firebase에 있으면 로드 직후 `onValue`로 받아와서 `sessionStarted`가 곧 true가 되므로 랜딩은 아주 잠깐 보이고 자동으로 넘어감(=공유 관리자 링크로 들어온 공동 운영자는 랜딩에서 막히지 않음).
- **관리자 화면(다중 기기 동시 조작)**: 관리자(`?display=1` 없는 주소)도 이제 `liveState`를 양방향으로 씀 — 상태가 바뀔 때마다(디바운스 400ms) push하고, 동시에 `onValue`로 구독해서 다른 기기에서 온 변경도 반영함(`src/main.jsx`). 그래서 **같은 관리자 링크를 여러 기기에서 열어도 같은 게임판을 보며 조작**할 수 있음. 원격에서 받은 상태를 적용하는 동안(`applyingRemote` 플래그) 그 변경을 다시 Firebase로 되쏘지 않도록 막아서 무한 핑퐁을 방지함 — 이 플래그 없이 구현하면 반드시 재발하는 버그이니 이 패턴을 건드릴 땐 주의. 다만 **진짜 동시(같은 400ms 창 안) 편집에 대한 병합/락은 없음 — 마지막에 push한 쪽이 이김**(last-write-wins). Firebase에 아직 아무 데이터가 없을 때만(`hasReceivedSnapshot`이 false일 때) 이 기기의 localStorage 상태로 시딩(seed)함 — 그 외엔 기존 라이브 상태가 이 기기의 로컬 캐시를 덮어씀. 같은 브라우저 다른 탭용 `storage` 이벤트 기반 로컬 동기화는 그대로 유지(`src/main.jsx`) — 지금은 Firebase가 이미 다 커버하므로 사실상 중복이지만 제거하지는 않음.
- **반응형**: 900px 이하는 관리자 화면 전체가 1단 스택 레이아웃(코트 자동 가로 스크롤)으로, 640px 이하(모바일)는 참가자·수동매칭·대기가 하단 탭 3개로 전환(`src/hooks/useIsMobile.js`, `App.jsx`의 `isMobile` 분기). 미리보기 화면도 900px 이하에서 동일하게 스택.
- **배포**: `vite.config.js`의 `base: '/-badminton-scheduler/'` (GitHub Pages 프로젝트 사이트 경로), `.github/workflows/deploy.yml` (push → build → Pages 배포)

## 구현된 주요 기능

### 참가자 관리
- 개별 추가 / 엑셀 일괄 추가(`ImportParticipantsModal`) / 명단 관리·수정·삭제
- 동명+동급수 참가자 추가 시 확인 다이얼로그(차단은 아님)
- 급수 → 이름(가나다) 순 정렬, 성별 필터(전체/남자/여자), 급수 칩 필터, "매칭가능한 선수만"(구 "게임중인 사람 가리기"), "게임 수 적은 순"
- **"매칭가능한 선수만" 켜면 휴식중이거나 대기열에 이미 예약된(`reservedIds`) 선수를 흐리게(dim) 처리** — 게임중이어도 아직 대기열에 예약 안 됐다면 새 대기열 게임에 넣을 수 있으므로(즉시 시작은 안 되고 대기열로 감) 원래 색상 유지. 휴식중은 대기열에도 넣을 수 없는 상태라 예약자와 함께 흐리게 처리. DOM에서 제거하지 않고 dim만 하는 원칙은 유지(레이아웃 점프 방지)
- **휴식중인 선수는 어디서도 새 게임/대기열에 넣을 수 없음** (게임중은 여전히 사전예약 가능, 이 부분은 변경 없음) — 막힌 지점 5곳: `ParticipantCard.selectable`(수동매칭 카드 클릭/드래그), `UnplayedWithTargetList`의 칩 `selectable`("이 선수와 모두 게임하도록" 미매칭 목록), `QueueItemCard`의 빈 슬롯 `<select>` 옵션 필터, `matching.js`의 `eligiblePool`(추천매칭 후보군), `useAppStore.swapInRosterPlayer`(드래그/드롭다운으로 실제 슬롯에 넣는 스토어 액션 — UI 필터를 우회해도 막히도록 별도 가드). `isUnavailable()`(게임중 또는 휴식중)은 여전히 "이미 슬롯에 들어간 게임이 즉시 시작 가능한지"만 판단하는 용도로 남아있고 선택 가능 여부의 게이트가 아님
- **게임 수 표시/정렬은 항상 `effectiveGameCount()`(완료+진행중+예약 합산) 하나만 써야 함** — 예전엔 정렬이 원본 `totalGames`(완료분만)를 써서 "7게임 표시된 선수가 6게임 표시된 선수보다 먼저 뜨는" 버그가 있었음(수정 완료)
- 참가자 카드: 게임 수, 성별/급수 타입별(혼복·남복·여복) 누적 횟수, 혼복 대비 동성복식 횟수 차이가 2 이상이면 주황 강조. 모바일(≤640px)에서만 게임 수가 이름·급수 옆으로 이동, PC/태블릿은 기존 위치(하단) 유지
- **타입별(혼복·남복·여복) 카운트도 총 게임수와 동일하게 완료+진행중+대기열예약을 모두 합산** — `ParticipantCard`의 `byType`이 `player.gamesByType`(완료분)에서 시작해 `liveGame`(진행중, +1)과 `queuedGame`(대기열 예약, +1)을 각각 더함. 한 선수가 진행중 게임과 대기열 예약 게임을 동시에 갖고 있으면 둘 다 반영됨(예: 남복 진행중 + 혼복 대기 → 혼1·남1). `queuedGame`은 `queuedGameByPlayer(queueOrder, gamesById)`(`selectors.js`)로 조회
- 헤더 한 줄 구성: "참가자ⓘ | 전체·남자·여자 | 매칭가능한선수만·게임수적은순 토글 | 햄버거메뉴(☰: 참가자관리/엑셀추가/참가자추가)"
- 필터 줄에 "총 n명(남자n명/여자n명)" 표시, "총 n명" 부분만 검정색 강조

### 코트 / 대기열
- 코트별 진행 시간, 자동 종료 감지 없음(수동 "게임 종료"/"게임 취소"), 게임 취소는 통계에 미반영
- 빈 코트 자동 채움: 게임 종료·취소·휴식 해제·코트 재사용 시 `_fillAllEmptyCourts()`가 모든 빈 코트를 재검사(코트 하나만 보는 게 아님)
- **부분 등록(2~3명) 지원**: 4명을 다 못 채워도 대기열에 올릴 수 있고("n/4명 모집중" 배지), 빈 슬롯은 대기열에서 드래그 또는 드롭다운으로 채울 수 있음. 4명이 다 채워지면 즉시 빈 코트 자동 배정
- 대기열 빈 슬롯 드롭다운: 게임중인 선수는 선택 가능(사전예약), 휴식중이거나 이미 다른 대기열 게임에 예약된 선수는 제외
- 수동매칭(빌더) 4슬롯: 참가자 카드를 특정 슬롯으로 드래그해서 채우거나 슬롯끼리 드래그로 위치 교환 가능(드롭다운은 없음 — 대기열 전용 기능으로 한정)
- 코트/대기열/수동매칭/추천매칭 4곳 모두 카드 그리드에 위/아래 팀 구분 실선(좌우가 한 팀) + 여백
- "대기" 타이틀 옆에 **현재 대기 n게임 (준비완료 n게임 | 예약 n게임)** 표시 — `queueReadinessCounts()`가 `_tryFillCourt`와 동일한 기준(4명 다 채워졌고 전원 게임 가능)으로 계산

### 추천 매칭 스코어링 (`src/lib/matching.js`, `src/lib/fairness.js`, `src/lib/skill.js`)
가중합 스코어: `repeat(0.3) + fairness(0.2) + skill(0.2) + typeBalance(0.15) + ratio(0.15)`, 그 위에 아래 배율(penalty/boost)이 곱해짐. **repeat(같은 사람과 반복 매칭 피하기)이 최우선순위** — 예전엔 skill이 0.35로 제일 컸는데, "운동 진행 시 가장 중요한 건 같은 사람과 여러 번 게임하지 않는 것"이라는 요청으로 repeat을 0.3으로 올려 1순위로, skill은 0.2로 내림(그래도 완전히 무시되진 않음 — 자강이 하위 급수들뿐인 조합에 낀 것 같은 명백한 실력 미스매치는 여전히 걸러짐).
- **남은 시간 반영 fairness 가중치**: `sessionRemainingRatio(startedAt, durationMinutes, now)`가 세션 종료까지 남은 비율(1=시작 전/시간 넉넉, 0=거의 끝남)을 계산해서, 그 값이 작아질수록(=시간이 얼마 안 남을수록) `scoreCandidate`의 fairness 가중치를 최대 1.6배까지 부스트함(`FAIRNESS_TIME_BOOST_MAX = 0.6`). 세션 초반엔 시간이 많아 자연스럽게 게임 수가 맞춰지지만, 막판엔 아직 적게 뛴 사람을 강하게 우선시해야 "다들 골고루" 목표를 놓치지 않음. `RecommendationPanel`이 `session.startedAt`/`durationMinutes`를 그대로 넘기고, `Date.now()` 같은 순수하지 않은 호출은 컴포넌트가 아니라 `matching.js` 안에서만 함(리액트 렌더 중 비순수 호출 린트 경고 피하려고).
- **비동호인 페어링 제약**: 비동호인끼리는 한 팀이 될 수 없음(둘이서는 게임 진행이 안 되는 손님 급수라서) — 그룹에 비동호인이 3명 이상이면 짝을 나눌 방법이 없으므로 `generateSuggestions`가 아예 후보에서 제외(`MAX_NON_MEMBERS_PER_GAME = 2`)하고, 정확히 2명이면 `balancedTeamSplit`(skill.js)이 파티션 후보 중 "두 비동호인이 각각 다른 팀"인 것만 골라서 최선의 밸런스를 찾음 — 그 결과 추천 카드엔 항상 "동호인1+비동호인1 vs 동호인1+비동호인1" 형태로만 뜸. `buildGame`(courtAssignment.js)도 같은 `balancedTeamSplit`을 쓰므로 수동매칭으로 4명(비동호인 2명 포함)을 직접 골라도 팀 배정 시 자동으로 갈라짐(단, 수동매칭 자체는 3명 이상 선택을 막지는 않음 — 이건 추천 엔진에만 건 하드 필터).
- **수동매칭도 동일하게 반영됨(확인 완료)**: 추천을 수락해서 만든 게임이든 수동매칭(빌더)에서 "등록"한 게임이든 전부 `_createGameFromPlayerIds` → `buildGame`을 거쳐 같은 모양의 게임 객체가 되고, 게임이 끝나면(`endGame`) `pairHistory`/`gamesByType`/`totalGames`/`casualGames`/`intenseGames`가 게임 출처와 무관하게 동일한 코드 경로로 갱신됨. 그래서 추천 매칭의 repeat/fairness/typeBalance/ratio 스코어링은 수동매칭 결과까지 자동으로 반영하고, "게임로그 보기"(GameLogModal)도 이 값들을 그대로 실시간으로 읽으므로 별도 동기화가 필요 없음.
- **급수 목록**: `src/data/skillLevels.js`의 `SKILL_ORDER = ['자강','A','B','C','D','E','F','비동호인']`(강한 순). `비동호인`은 F보다 더 아래의 최하위 급수로 추가됨 — `src/lib/skill.js`의 `SKILL_POSITION`에 `F:7` 다음 `비동호인:8`로 이어붙여서 초심 밴드(`BAND_SPLIT`, idx≥5) 안에서 기존 E/F와 동일한 규칙(여성 +1 보정, 즐겜 extremity 페널티 등)을 그대로 적용받게 함 — 새 급수를 추가할 땐 이 두 파일(순서 배열 + 포지션 숫자)만 건드리면 됨, 나머지 화면(참가자 추가/필터/엑셀 등)은 전부 `SKILL_ORDER`를 순회하므로 자동 반영됨
- **비동호인은 관리자 화면에만 보임**: `src/data/skillLevels.js`의 `participantFacingSkill(skill)`이 비동호인일 때 `null`을 반환 — 미리보기/참여자 화면(`DisplayCourtCard`, `DisplayQueueItem`)은 이 함수를 거쳐서 급수 라벨 자체를 안 보여줌(게임 수만 표시), 카드 색상도 그 두 파일엔 `is-nonmember` CSS 규칙을 아예 안 넣어서 일반 성별 색상 그대로 보임. 관리자 쪽 컴포넌트(참가자 카드/코트/대기열/수동매칭/추천매칭/게임로그)는 급수를 그대로 넘기므로 "비동호인" 배지가 정상 표시됨.
- **비동호인 카드 색상**: 고정 팔레트(자강처럼)가 아니라 **현재 설정된 남/여 색상에서 한 톤 어둡게** — `tokens.css`에 `color-mix(in srgb, var(--color-male) 78%, black)` 같은 식으로 `--color-male-nonmember`/`--color-female-nonmember`(+`-bg` 변형)를 정의해서, 설정(`SettingsModal`)에서 남/여 색상을 커스텀해도 항상 그 색 기준으로 어둡게 유지됨. `genderColorClass()`가 비동호인이면 `is-nonmember` 클래스를 붙이고, 자강과 동일한 패턴으로 관리자 쪽 9개 컴포넌트 CSS에 다크 변형을 미러링함(미리보기 2개는 위 항목대로 의도적으로 제외). 참가자 카드의 "비동호인" 배지는 4글자라 다른 급수 배지보다 폰트 크기를 살짝 줄임(`ParticipantCard.css`).
- **급수 궁합**: 자강↔A 간격을 넓게 잡은 밴드 모델, 여성은 +1 포지션 보정(예: 남D ≈ 여C, 자강은 예외), "밸런스 상"은 skillScore ≥ 0.9일 때만
- **여자자강 예외**: 3남+1여(자강) 조합은 남복으로 인정(`deriveGameType`/`deriveManualGameType`)하고 성비 페널티도 면제 — 자강 여성은 스킬상 남자A보다 세다는 전제
- **팀 분배 불균형 페널티**: `balancedTeamSplit`이 반환하는 최선의 팀 갭(gap)이 크면 추가 페널티 — 그룹 전체 스킬점수만으론 "자강+약한 파트너 vs 애매한 페어" 같은 조합의 실제 불균형을 못 잡아서 추가함
- **성비 페널티**: 남/여 각 4명 이상 있을 때만 남1여3·남3여1 조합에 큰 페널티(모집단이 부족할 땐 페널티 없음, 자강 예외 적용)
- **초반 동일 급수 우선(novelty 페널티)**: 같은 급수끼리 아직 안 해본 조합이 남아있을 때만 급수 교차(즐겜) 조합에 페널티 부여, 한 번이라도 겹치면 그 페널티는 빠르게 사라짐
- **포화 트리오 페널티**: 4명이 전부 같은 급수인데 그중 3명이 서로 3번 이상 이미 같이 했으면 큰 페널티 — 그 3명 + 하위 급수 1명 조합(전부 같은 급수가 아니므로 페널티 없음)이 자연스럽게 우선 추천되게 함
- **타입 밸런스**: 혼복:동성복식 이력 비율을 50:50으로 당기는 스코어. **그룹 평균이 아니라 최소값(가장 안 좋은 케이스)으로 계산** — 평균을 쓰면 한 명이 극단적으로 치우쳐 있어도(혼복9:여복4) 나머지 3명이 중립이면 희석되어 버려서, 최소값 방식 + 가중치 0.2로 올림
- **진행중/예약된 조합의 pairHistory 반영**: `pairCount`, `repeatScore`, `sameSkillNoveltySupply`, `unplayedWithTargets` 전부 "완료된 게임"뿐 아니라 "지금 같은 코트에서 뛰고 있음" · "이미 같은 대기열 게임에 예약됨"도 "같이 게임함"으로 계산(`activeGameByPlayer`, `queuedGameByPlayer` 활용)
- **진행중인 조합 재추천 방지**: 지금 코트에서 뛰고 있는 정확한 4인 조합은 추천 목록에서 제외(`activeGameSignatures`)
- **타깃 모드**: "이 선수와 모두 게임하도록"을 여러 명 동시 선택 가능, 선택된 인원 중 한 명이라도 이미 같이 한 선수는 "아직 게임 안 한 선수" 목록에서 제외. 이 목록의 칩도 휴식중이거나 이미 대기열에 예약된 선수는 선택 불가 처리(`UnplayedWithTargetList`)
- 추천 카드도 실제 등록될 팀 분배(`balancedTeamSplit`)를 미리 계산해서 좌/우가 아니라 위/아래가 팀으로 정확히 보이도록 함
- 필터 칩(전체보기/혼복/남복/여복)이 "추천 매칭" 타이틀 옆 한 줄에 위치, 새로고침 버튼은 우측 유지

### 게임 로그
- 헤더에 "게임로그 보기" 버튼 → 이름 검색 + 참가자 리스트 + 선택한 사람의 게임 이력(팀 전체를 이름 카드 그리드로, 최신순, 진행중 배지, "총 n게임(혼x·남/여y)")

### 표시/기타
- 코트 배정 시 띵동 소리 + 이름 2회 TTS 안내(직접 배정/대기열 자동 채움 모두). 헤더의 🔊/🔇 버튼(설정 버튼 왼쪽)으로 켜고 끌 수 있음 — `soundEnabled`(persist 대상)를 두 호출 지점(`_createGameFromPlayerIds`, `_tryFillCourt`)에서 각각 체크. 미리보기(`?display=1`) 화면은 Firebase 구독만으로 상태를 받아오고 이 액션들을 직접 실행하지 않으므로 애초에 소리가 나지 않음 — 뮤트 컨트롤은 관리자 화면에만 있으면 충분
- 자강 성별별 강조색, 성별 필터 카드 색상 체계
- 미리보기(듀얼모니터) 화면에도 관리자 화면과 동일한 팀 구분선 반영, 반응형 적용
- 미리보기 모바일뷰(≤640px)는 코트 카드가 2열 그리드로 배치되고, 카드 내부 폰트/여백도 그 폭에 맞춰 축소됨(`DisplayView.css`/`DisplayCourtCard.css`)
- 관리자 헤더·미리보기 헤더 모두 "경과" 표시는 완전히 제거(종료 시각·남은 시간만 표시), 모바일·태블릿(≤900px)에서는 "현재" 시각도 숨김 — 실제로 조작에 쓰이는 종료/남은 시간만 좁은 화면에 남김
- **운동 시작/종료를 날짜까지 포함해 예약 가능**: 운동 시작(`SetupModal`)과 설정(`SettingsModal`) 모두 "시작 일시"·"종료 일시" 두 개의 `<input type="datetime-local">`로 입력받음(`src/lib/time.js`의 `toDatetimeLocalValue`/`fromDatetimeLocalValue`로 타임스탬프↔입력값 변환). `session.startedAt`은 이제 "지금"이 아니라 **이 입력값 그대로**(미래 시각 예약 가능) — `initSession({..., startAt})`이 `Date.now()` 대신 이 값을 씀. `SettingsModal`에서 시작 일시를 바꾸면 종료 시각은 고정한 채 `durationMinutes`만 재계산하고, 종료 일시를 바꾸면 시작 시각을 고정한 채 재계산함(둘 다 절대 시각 두 개를 유지하는 게 목표라, 어느 쪽을 바꿔도 반대쪽은 건드리지 않음). 기존 "운동 진행 시간" +/- 스테퍼는 종료 일시 입력과 기능이 겹쳐서 제거함.
- **시작 시각 전에는 "남은" 카운트다운이 멈춰있음**: `formatCountdownKorean(startedAt, durationMinutes, now)`(`src/lib/time.js`)이 `now < startedAt`이면 "end - now"를 계산하지 않고 전체 `durationMinutes`를 그대로 고정해서 보여줌(시작 전엔 아무것도 안 흘렀으니까) — 이 가드가 없으면 시작 전엔 "종료까지 남은 총 시간"이 duration보다 크게 나와서 시작 순간 숫자가 훅 줄어드는 것처럼 보임. 관리자 헤더·미리보기 헤더 둘 다 이 상태일 때 "(시작 전)" 라벨을 같이 보여줌(`Header.jsx`/`DisplayView.jsx`).
- 참여 급수는 설정(`SettingsModal`)에서도 운동 시작 후 언제든 칩으로 토글 수정 가능(최소 1개는 항상 남아있어야 함)

## 최근 수정한 버그 (중요)

**동일 인물이 두 코트에 동시에 배정되던 버그**: `swapPlayers`(슬롯끼리 드래그 교체)의 `resolveStatus`가 "플레이어의 현재 status가 게임중이면 원래 자리를 나가는 거니 대기중으로 풀어준다"는 식으로 추론했는데, 그 게임중 상태가 **완전히 다른, 실제로 뛰고 있는 코트 게임**에서 온 것일 수 있다는 점을 놓쳤음(대기열에 예약되어 있으면서 동시에 다른 코트에서 게임중인 정상적인 "사전예약" 상태). 대기열↔대기열 슬롯 이동만 했을 뿐인데 실제 코트에서 뛰고 있는 사람의 status가 잘못 "대기중"으로 리셋되어, 그 순간 다른 빈 코트에 또 배정되는 이중 배정이 발생했음.
**수정**: `resolveStatus`가 플레이어의 status 값이 아니라, **실제로 나가는 게임/들어가는 게임이 진짜 `active`인지**를 직접 인자로 받아 판단하도록 변경. 대기열↔대기열 이동은 이제 상태를 절대 건드리지 않음.

**게임 수 적은 순 정렬 불일치**: 위 "참가자 관리" 항목 참고 — `effectiveGameCount()`로 통일해서 수정.

## Firebase 연동 관련 주의사항

- `src/lib/firebase.js`에 `firebaseConfig`(apiKey 포함)가 커밋되어 있음 — Firebase apiKey는 비밀값이 아니고, 실제 접근 제어는 Realtime Database 규칙(Console → 데이터베이스 및 스토리지 → 규칙)으로 함. 현재 규칙은 `liveState` 경로만 read/write 모두 공개, 나머지는 차단.
- **초기 로드 시 반드시 즉시 push 필요**: Zustand `persist`가 모듈 임포트 시점에 동기적으로 localStorage를 복원하는데, 이는 `main.jsx`의 `useAppStore.subscribe(...)` 등록보다 먼저 끝나버림. 그래서 구독만 걸어두면 "이미 복원된 초기 상태"는 한 번도 Firebase에 안 올라가고, 이후 진짜 변경이 생겨야만 올라감 — 뷰어가 관리자의 첫 조작 전에 접속하면 빈 화면을 보게 되는 버그였음. `subscribe()` 등록 직후 `pushState(useAppStore.getState())`를 한 번 더 호출해서 해결(`src/main.jsx`).
- npm에 `firebase` 패키지를 새로 설치한 뒤에는 이미 떠 있던 dev 서버를 **재시작**해야 함(HMR만으로는 안 됨) — 안 하면 콘솔 에러 없이 Firebase 쓰기가 조용히 실패함.

## 설계 원칙 / 주의사항

- **"예약"은 파생 개념이지 status가 아니다.** 새 로직을 짤 때 플레이어의 `status` 필드만 보고 "지금 뭘 하고 있는지" 판단하면, 게임중이면서 동시에 다른 대기열에 예약되어 있는 정상 상태를 놓칠 수 있다. 반드시 `reservedPlayerIds`와 `isUnavailable`을 구분해서 써야 함.
- **부분 게임(빈 슬롯 있는 대기열 항목)은 `isGameComplete()`로 완전히 채워졌는지 항상 확인 후에만** 코트에 배정해야 함(`_tryFillCourt`, `_createGameFromPlayerIds` 참고).
- 활성(코트) 게임의 슬롯은 스왑으로도 빈 자리가 될 수 없도록 가드 존재(`swapPlayers`).
- **게임 수를 표시/정렬/비교할 땐 항상 `effectiveGameCount()`를 통해서** — 원본 `totalGames` 필드를 직접 쓰면 위 버그가 재발함.
- **새로운 선수 선택/매칭 진입점을 추가할 때마다 휴식중 제외를 빠뜨리지 말 것.** 선택 가능 여부의 게이트는 지금 5곳에 흩어져 있음(위 "휴식중인 선수는 어디서도..." 항목 참고) — 공용 `isSelectableForMatch(player, reservedIds)` 같은 헬퍼로 합칠 만한 후보지만 아직 안 함.
- 새 반응형 분기(모바일 탭 등)는 `useIsMobile` 훅으로 판단하고, 태블릿(900px 이하 ~ 641px)과 데스크톱 레이아웃은 건드리지 않는 것이 사용자의 명확한 요청 사항.
- lint(`npm run lint`, oxlint)/build(`npx vite build`) 항상 클린 상태 유지, 기능 변경 후 Playwright로 실제 시나리오 검증하는 것이 이 프로젝트의 검증 관례. 순수 로직(`src/lib/*.js`)은 스크래치패드에 상대경로를 절대경로로 바꾼 복사본을 만들어 Node로 직접 실행해 검증.
- git 커밋 시 `.github/workflows/*` 파일은 로컬 GitHub 토큰에 `workflow` 스코프가 없어서 push가 거부될 수 있음 — 이미 원격에 있는 워크플로 파일과 내용이 같으면 그냥 로컬 파일을 지우고 `git pull`로 받아오면 됨(수정해서 새로 push해야 할 땐 토큰에 `workflow` 스코프 추가 필요, 또는 GitHub 웹 UI에서 직접 수정).
