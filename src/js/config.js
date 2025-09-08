// 복권 긁기 게임 설정 파일
// Event ID는 배포 시 동적으로 치환됩니다: {{EVENT_ID}}

const CONFIG = {
  // 현재 이벤트 설정
  EVENT: {
    ID: '{{EVENT_ID}}', // 배포시 실제 이벤트 ID로 치환
    NAME: '복권 긁기 이벤트',
    TYPE: 'scratch'
  },

  // 게임 설정 (민감도 개선)
  GAME: {
    SCRATCH_THRESHOLD: 30,     // 30% 임계점 (더 쉽게)
    TOUCH_RADIUS: 35,          // 터치 반경 (px) - 더 넓게
    MIN_SCRATCH_AREA: 50,      // 최소 스크래치 영역 - 더 작게
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

  // 성능 설정 (반응성 개선)
  PERFORMANCE: {
    RAF_THROTTLE: 8,           // ~120fps (8ms) - 더 부드럽게
    TOUCH_THROTTLE: 5,         // 터치 이벤트 간격 (ms) - 더 민감하게
    MAX_MEMORY_MB: 50,         // 최대 메모리 사용량 (MB)
    PROGRESS_CHECK_INTERVAL: 50 // 진행률 체크 간격 (ms) - 더 빠르게
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
    SHOW_TOUCH_DEBUG: location.hostname === 'localhost',   // 터치 포인트 시각화 (로컬에서 활성화)
    SHOW_PROGRESS_DEBUG: false // 진행률 디버그 정보
  },

  // 브릿지 설정
  BRIDGE: {
    MOCK_ENABLED: location.hostname === 'localhost',
    MOCK_SCENARIOS: {
      success: 0.8,            // 80% 정상 시나리오 (웹 테스트 최적화)
      alreadyParticipated: 0.1, // 10% 재참여 시나리오
      networkError: 0.0,       // 0% 네트워크 에러 (웹 테스트용)
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

// 환경별 설정 오버라이드 (안전하게 처리)
try {
  if (CONFIG.DEBUG && CONFIG.DEBUG.ENABLED) {
    // 개발 환경 설정
    CONFIG.ERROR.TIMEOUT = 30000;        // 디버깅을 위한 긴 타임아웃
    CONFIG.BRIDGE.MOCK_DELAYS.min = 100; // 빠른 테스트를 위한 짧은 지연
    CONFIG.BRIDGE.MOCK_DELAYS.max = 800;
    CONFIG.UI.LOADING_MIN_TIME = 500;    // 빠른 테스트
  }

  // 웹뷰 환경 감지 및 최적화 설정
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    // 웹뷰 환경 확인
    const isWebView = /wv.*\).+chrome|Android.*version.*safari|iPhone.*applewebkit.*version.*safari/i.test(navigator.userAgent) ||
                     (window.ReactNativeWebView !== undefined) ||
                     (window.webkit && window.webkit.messageHandlers);
    
    if (isWebView) {
      // 웹뷰 전용 최적화 설정
      CONFIG.PERFORMANCE.TOUCH_THROTTLE = 2; // 더 민감한 터치 반응
      CONFIG.GAME.TOUCH_RADIUS = 50; // 웹뷰에서 더 큰 터치 영역
      CONFIG.GAME.MIN_SCRATCH_AREA = 40; // 최소 스크래치 영역 축소
      CONFIG.PERFORMANCE.PROGRESS_CHECK_INTERVAL = 30; // 더 빈번한 진행률 체크
    } else if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
      // iOS 최적화 (더 민감하게)
      CONFIG.PERFORMANCE.TOUCH_THROTTLE = 3;
      CONFIG.GAME.TOUCH_RADIUS = 40; // iOS에서 더 큰 터치 영역
    } else if (navigator.userAgent.includes('Android')) {
      // Android 최적화 (더 민감하게)
      CONFIG.PERFORMANCE.TOUCH_THROTTLE = 4;
      CONFIG.GAME.TOUCH_RADIUS = 45; // Android에서 더 큰 터치 영역
    } else {
      // 데스크톱 브라우저 최적화
      CONFIG.PERFORMANCE.TOUCH_THROTTLE = 2;
      CONFIG.GAME.TOUCH_RADIUS = 50; // 마우스 사용시 더 큰 영역
    }
  }
} catch (error) {
  console.warn('Config customization failed:', error);
}

// 전역 접근을 위한 window 객체에 할당
window.CONFIG = CONFIG;

// 설정 검증 (안전하게 처리)
try {
  if (CONFIG.DEBUG && CONFIG.DEBUG.ENABLED) {
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
} catch (error) {
  console.warn('Config validation failed:', error);
}