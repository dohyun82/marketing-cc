# 📱 프론트엔드 요구사항 정의서 - 마케팅 이벤트 페이지

**개발자**: 김도현  
**작성일**: 2025-09-05  
**기간**: 1.5주 (9월 넷째 주 ~ 10월 첫째 주)  
**Jira 티켓**: [PROD-19278](https://vendysdev.atlassian.net/browse/PROD-19278)

---

## 🎯 **개발 목표**

**"사용자가 재미있게 참여할 수 있는 복권 긁기 스타일의 모바일 웹 이벤트 페이지 구현"**

### 핵심 성과 지표

- ⏱️ **터치 반응성**: 100ms 이내 즉시 반응
- 🚀 **페이지 로딩**: 3초 이내 완료
- 🎯 **정확성**: 50% 스크래치 임계점 정확히 감지
- 📱 **호환성**: iOS 14+ Safari, Android 5.0+ Chrome 지원

---

## 📋 **기능 요구사항**

### 1. **페이지 진입 및 초기화**

#### 1.1 URL 및 진입점

```
- URL 패턴: https://s3-bucket/events/event-{eventId}.html
- 진입 방식: 식권대장 앱 내 배너 클릭 → 인앱 웹뷰
- 파라미터: eventId는 HTML 내 하드코딩 (S3 업로드시 치환)
```

#### 1.2 초기화 프로세스

1. **페이지 로드 완료** → `startEventInit(eventId)` 앱 호출
2. **앱 응답 수신** → `onEventInit(data)` 콜백 실행
3. **이벤트 상태 분기**:
   - `isValid && !isCompleted` → 게임 시작
   - `isCompleted` → 기존 결과 표시
   - `!isValid` → 종료/오류 안내

#### 1.3 초기화 데이터 구조

```javascript
// onEventInit 수신 데이터
{
  isValid: boolean,          // 이벤트 유효 여부
  eventType: 'scratch',      // 이벤트 타입 (Phase 1에서는 'scratch' 고정)
  eventName: string,         // 이벤트 제목 (최대 20자)
  eventDesc: string,         // 이벤트 설명
  eventTerms: string,        // 유의사항 (HTML 형태, 선택적)
  isCompleted: boolean,      // 사용자 참여 완료 여부
  isEventResult: object|null // 기존 참여 결과 (완료시에만)
}
```

### 2. **복권 긁기 게임 구현**

#### 2.1 Canvas 기반 스크래치 게임

```javascript
class ScratchGame {
  constructor(canvas, eventId) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.eventId = eventId;
    this.scratchedArea = 0;
    this.threshold = 50; // 50% 임계점
    this.isCompleted = false;
    this.touchRadius = 20; // 터치 영역 반경 (finger-friendly)
  }

  // 필수 구현 메서드들
  handleTouchStart(x, y) {
    /* 터치 시작 처리 */
  }
  handleTouchMove(x, y) {
    /* 스크래치 처리 */
  }
  handleTouchEnd() {
    /* 터치 종료 처리 */
  }
  calculateScratchedArea() {
    /* 진행률 계산 */
  }
  completeGame() {
    /* 50% 달성시 결과 요청 */
  }
}
```

#### 2.2 터치 인터랙션 요구사항

- **터치 방식**: firm swipe만 인식 (가벼운 터치 무시)
- **진행률 계산**: 실시간으로 스크래치된 픽셀 비율 계산
- **임계점 감지**: 50% 도달시 즉시 `requestEventResult()` 호출
- **결과 표시**: 50% 도달 → 나머지 영역 자동 투명화 (즉시 피드백)
- **터치 영역**: 손가락 두께를 고려한 최소 20px 반경

#### 2.3 애니메이션 및 시각적 피드백

- **스크래치 효과**: 터치 포인트 중심으로 원형 투명화
- **진행률 표시**: 하단에 0-50% 진행률 바 (선택적)
- **완료 애니메이션**: 50% 도달시 남은 영역 0.5초간 페이드아웃
- **당첨 연출**: 당첨시 축하 애니메이션 (CSS 기반)

### 3. **앱-웹 브릿지 통신**

#### 3.1 웹 → 앱 호출 (JavaScript)

```javascript
// 이벤트 초기화 요청
window.Android?.startEventInit(eventId);
window.webkit?.messageHandlers.startEventInit.postMessage({ eventId });

// 당첨 결과 요청 (50% 스크래치 완료시)
window.Android?.requestEventResult(eventId);
window.webkit?.messageHandlers.requestEventResult.postMessage({ eventId });
```

#### 3.2 앱 → 웹 콜백 (JavaScript 함수)

```javascript
// 이벤트 초기화 완료
function onEventInit(result) {
  // result: 위의 초기화 데이터 구조 참조
  initializePage(result);
}

// 당첨 결과 수신
function onEventResultReceived(result) {
  // result: { isWinner, rewardName, participationId, timestamp }
  showGameResult(result.isWinner, result.rewardName);
}

// 에러 처리 (앱에서 팝업 표시 전 웹 정리)
function onEventError(errorCode, message) {
  resetGameState();
}
```

#### 3.3 에러 처리 및 예외 상황

- **네트워크 오류**: 앱에서 팝업 처리, 웹은 상태만 리셋
- **중복 참여**: 앱에서 차단, 웹은 기존 결과 표시
- **이벤트 종료**: 앱에서 안내, 웹은 참여 불가 UI
- **시스템 오류**: 앱에서 "잠시 후 다시 시도" 안내

### 4. **화면 구성 및 레이아웃**

#### 4.1 반응형 디자인 요구사항

```css
/* 기본 모바일 뷰포트 */
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">

/* 최소/최대 해상도 대응 */
- 최소: 320px (iPhone SE)
- 최대: 430px (iPhone 14 Pro Max)
- 세로 모드 최적화 (가로 모드 미지원)
```

#### 4.2 화면 영역 구성

```
┌─────────────────────────┐
│      이벤트 제목        │ ← 최대 20자, 2줄 처리
├─────────────────────────┤
│                         │
│   복권 스크래치 영역    │ ← Canvas 게임 구역
│    (정사각형 비율)      │
│                         │
├─────────────────────────┤
│    유의사항 (선택적)    │ ← HTML 렌더링, 접기/펼치기
└─────────────────────────┘
```

#### 4.3 스타일링 가이드라인

- **브랜드 컬러**: 식권대장 기본 컬러 팔레트 사용
- **폰트**: 시스템 기본 폰트 (Apple SD Gothic Neo / Noto Sans KR)
- **터치 타겟**: 최소 44px×44px (Apple 가이드라인)
- **접근성**: WCAG 2.1 AA 수준 준수

### 5. **성능 및 최적화 요구사항**

#### 5.1 성능 기준

- **초기 로딩**: 3초 이내 (DOMContentLoaded 기준)
- **터치 반응성**: 100ms 이내 시각적 피드백
- **애니메이션**: 60fps 유지 (requestAnimationFrame 사용)
- **메모리 사용량**: 50MB 이하 유지

#### 5.2 최적화 방법

```javascript
// Canvas 최적화
const ratio = window.devicePixelRatio || 1;
canvas.width = containerWidth * ratio;
canvas.height = containerHeight * ratio;
canvas.style.width = containerWidth + "px";
canvas.style.height = containerHeight + "px";
ctx.scale(ratio, ratio);

// 터치 이벤트 최적화
canvas.addEventListener("touchmove", handleTouch, { passive: false });
```

#### 5.3 호환성 대응

- **Canvas 지원 체크**: 미지원시 "브라우저 업데이트 필요" 안내
- **Touch Events**: 터치 우선, 마우스 이벤트는 데스크톱 테스트용
- **Polyfill**: iOS 구버전 대응용 Canvas API 폴리필 포함

---

## 🛠️ **개발 환경 및 도구**

### 1. **로컬 개발 환경**

```bash
# 개발 서버
Live Server (VSCode Extension)
# 또는
python -m http.server 8000

# 브릿지 통신 테스트
localhost 환경에서 Mock 브릿지 함수 활용
```

### 2. **Mock 브릿지 구현**

```javascript
// dev-mock.js
if (window.location.hostname === "localhost") {
  window.DevMock = {
    startEventInit: (eventId) => {
      setTimeout(
        () =>
          onEventInit({
            isValid: true,
            eventType: "scratch",
            eventName: "테스트 이벤트",
            eventDesc: "복권을 긁어서 선물을 받아보세요!",
            eventTerms: "<p>유의사항 테스트</p>",
            isCompleted: false,
            isEventResult: null,
          }),
        300
      );
    },

    requestEventResult: (eventId) => {
      setTimeout(
        () =>
          onEventResultReceived({
            isWinner: Math.random() > 0.7,
            rewardName: "스타벅스 아메리카노",
            participationId: "PART-DEV-" + Date.now(),
            timestamp: new Date().toISOString(),
          }),
        1000
      );
    },
  };

  // 실제 브릿지 오버라이드
  window.Android = window.DevMock;
  window.webkit = {
    messageHandlers: {
      startEventInit: {
        postMessage: (data) => window.DevMock.startEventInit(data.eventId),
      },
      requestEventResult: {
        postMessage: (data) => window.DevMock.requestEventResult(data.eventId),
      },
    },
  };
}
```

### 3. **테스트 전략**

```javascript
// 테스트 시나리오
1. 정상 플로우: 초기화 → 스크래치 → 결과 표시
2. 재방문: 이미 참여한 사용자의 결과 확인
3. 에러 케이스: 네트워크 오류, 잘못된 이벤트 ID
4. 성능: 50회 연속 터치시 반응성 유지
5. 호환성: iPhone 8, Galaxy S8 등 구형 기기 테스트
```

### 4. **빌드 및 배포**

```bash
# 번들링 도구 (선택사항)
Parcel / Webpack / Vite 중 선택

# S3 배포용 파일 구조
event-{eventId}.html     # 메인 페이지 (eventId 치환)
assets/
  ├── script.js         # 게임 로직
  ├── styles.css        # 스타일시트
  └── dev-mock.js       # 개발용 (배포시 제외)

# 수동 배포 프로세스
1. eventId 치환 (빌드 스크립트 또는 수동)
2. S3 버킷 업로드
3. CloudFront 캐시 무효화 (필요시)
```

---

## ✅ **구현 체크리스트**

### Phase 1: 기본 구조 (3일)

- [ ] HTML 기본 레이아웃 및 반응형 CSS
- [ ] Canvas 초기화 및 터치 이벤트 바인딩
- [ ] 브릿지 통신 인터페이스 구현
- [ ] Mock 데이터로 전체 플로우 테스트

### Phase 2: 게임 로직 (4일)

- [ ] 스크래치 게임 핵심 로직 구현
- [ ] 50% 임계점 감지 및 결과 요청
- [ ] 당첨 결과 UI 및 애니메이션
- [ ] 성능 최적화 (60fps, 100ms 반응성)

### Phase 3: 통합 및 테스트 (3일)

- [ ] 실제 앱 환경에서 브릿지 통신 테스트
- [ ] iOS/Android 디바이스별 호환성 테스트
- [ ] 성능 및 메모리 사용량 검증
- [ ] S3 배포 및 최종 확인

### 최종 검증 기준

- [ ] 터치 반응성 100ms 이내 달성
- [ ] 페이지 로딩 3초 이내 달성
- [ ] 50% 스크래치 임계점 정확도 100%
- [ ] iOS 14+ Safari, Android 5.0+ Chrome 정상 동작
- [ ] 앱-웹 브릿지 통신 오류율 0%

---

## 📞 **협업 및 소통**

### 연관 업무 담당자

- **백엔드 API**: 소재철님/최은교님 (이벤트 조회, 참여 처리 API)
- **앱 브릿지**: 기존 앱팀 (브릿지 통신 패턴 활용)
- **기획 확인**: 지예인님 (UI/UX 최종 승인)

### 개발 중 확인 필요사항

1. **브릿지 함수명**: 기존 앱의 브릿지 네이밍 컨벤션 확인
2. **에러 처리**: 앱에서 표시할 에러 메시지 문구 확정
3. **성과 측정**: 구글 애널리틱스 등 트래킹 코드 추가 여부
4. **접근성**: 시각 장애인 대응 필요 수준 확인

---

**문서 상태**: 구현 준비 완료 ✅  
**개발 시작**: 9월 넷째 주  
**완료 목표**: 10월 첫째 주
