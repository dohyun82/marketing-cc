// 복권 긁기 게임 설정 파일
// Event ID는 배포 시 동적으로 치환됩니다: {{EVENT_ID}}

const CONFIG = {
  // 현재 이벤트 설정
  EVENT: {
    ID: '{{EVENT_ID}}', // 배포시 실제 이벤트 ID로 치환
    NAME: '복권 긁기 이벤트',
    TYPE: 'scratch'
  },

  // 게임 설정
  GAME: {
    SCRATCH_THRESHOLD: 50,     // 50% 임계점
    TOUCH_RADIUS: 20,          // 터치 반경 (px)
    MIN_SCRATCH_AREA: 100,     // 최소 스크래치 영역
    ANIMATION_DURATION: 500,   // 애니메이션 시간 (ms)
    AUTO_COMPLETE_DELAY: 800   // 자동 완료 지연시간 (ms)
  },

  // Canvas 설정
  CANVAS: {
    MAX_WIDTH: 375,            // 최대 폭
    MAX_HEIGHT: 667,           // 최대 높이
    BACKGROUND_COLOR: '#f5f5f5',
    DEVICE_PIXEL_RATIO: window.devicePixelRatio || 1
  },

  // 성능 설정
  PERFORMANCE: {
    RAF_THROTTLE: 16,          // ~60fps (16.67ms)
    TOUCH_THROTTLE: 10,        // 터치 이벤트 간격 (ms)
    MAX_MEMORY_MB: 50,         // 최대 메모리 사용량 (MB)
    PROGRESS_CHECK_INTERVAL: 100 // 진행률 체크 간격 (ms)
  },

  // 에러 처리
  ERROR: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,         // 재시도 간격 (ms)
    TIMEOUT: 10000,            // 타임아웃 (ms)
    BRIDGE_TIMEOUT: 15000      // 브릿지 타임아웃 (ms)
  },

  // UI 설정
  UI: {
    LOADING_MIN_TIME: 1000,    // 최소 로딩 시간 (ms)
    MODAL_ANIMATION_DURATION: 300,
    TOAST_DURATION: 3000       // 토스트 메시지 표시 시간
  },

  // 개발 설정
  DEBUG: {
    ENABLED: location.hostname === 'localhost' || location.hostname === '127.0.0.1',
    LOG_LEVEL: 'INFO',         // DEBUG, INFO, WARN, ERROR
    SHOW_PERFORMANCE: true,
    SHOW_TOUCH_DEBUG: false,   // 터치 포인트 시각화
    SHOW_PROGRESS_DEBUG: false // 진행률 디버그 정보
  },

  // 브릿지 설정
  BRIDGE: {
    MOCK_ENABLED: location.hostname === 'localhost',
    MOCK_SCENARIOS: {
      success: 0.6,            // 60% 정상 시나리오
      alreadyParticipated: 0.2, // 20% 재참여 시나리오
      networkError: 0.1,       // 10% 네트워크 에러
      eventEnded: 0.1          // 10% 이벤트 종료
    },
    MOCK_DELAYS: {
      min: 300,                // 최소 지연시간 (ms)
      max: 1500                // 최대 지연시간 (ms)
    }
  },

  // 애니메이션 설정
  ANIMATION: {
    EASING: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material Design easing
    SCRATCH_FADE_DURATION: 400,
    RESULT_REVEAL_DURATION: 600,
    MODAL_SLIDE_DURATION: 300
  }
};

// 환경별 설정 오버라이드
if (CONFIG.DEBUG.ENABLED) {
  // 개발 환경 설정
  CONFIG.ERROR.TIMEOUT = 30000;        // 디버깅을 위한 긴 타임아웃
  CONFIG.BRIDGE.MOCK_DELAYS.min = 100; // 빠른 테스트를 위한 짧은 지연
  CONFIG.BRIDGE.MOCK_DELAYS.max = 800;
  CONFIG.UI.LOADING_MIN_TIME = 500;    // 빠른 테스트
}

// 디바이스별 설정 조정
if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
  // iOS 최적화
  CONFIG.PERFORMANCE.TOUCH_THROTTLE = 8;
  CONFIG.GAME.TOUCH_RADIUS = 18; // iOS에서 더 정확한 터치
} else if (navigator.userAgent.includes('Android')) {
  // Android 최적화
  CONFIG.PERFORMANCE.TOUCH_THROTTLE = 12;
  CONFIG.GAME.TOUCH_RADIUS = 22; // Android에서 약간 큰 터치 영역
}

// 전역 접근을 위한 window 객체에 할당
window.CONFIG = CONFIG;

// 설정 검증
if (CONFIG.DEBUG.ENABLED) {
  console.log('🔧 Game Configuration:', CONFIG);
  
  // 설정 유효성 검사
  if (CONFIG.GAME.SCRATCH_THRESHOLD < 1 || CONFIG.GAME.SCRATCH_THRESHOLD > 100) {
    console.warn('⚠️ Invalid SCRATCH_THRESHOLD, using default 50%');
    CONFIG.GAME.SCRATCH_THRESHOLD = 50;
  }
  
  if (CONFIG.GAME.TOUCH_RADIUS < 5 || CONFIG.GAME.TOUCH_RADIUS > 50) {
    console.warn('⚠️ Invalid TOUCH_RADIUS, using default 20px');
    CONFIG.GAME.TOUCH_RADIUS = 20;
  }
}