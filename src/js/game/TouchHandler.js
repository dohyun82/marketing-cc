/**
 * 터치 및 마우스 입력 처리 클래스
 * 스크래치 인터랙션을 위한 터치/마우스 이벤트를 관리합니다.
 */
class TouchHandler {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.renderer = null;
    
    // 터치 상태 관리
    this.isEnabled = true;
    this.isDrawing = false;
    this.lastTouch = { x: 0, y: 0 };
    this.touchPath = [];
    this.touchStartTime = 0;
    
    // 성능 최적화
    this.lastTouchTime = 0;
    this.touchThrottle = CONFIG.PERFORMANCE.TOUCH_THROTTLE;
    this.rafId = null;
    
    // 통계 수집
    this.stats = {
      totalTouches: 0,
      totalDistance: 0,
      totalDuration: 0,
      maxVelocity: 0,
      touchSessions: 0
    };
    
    // 콜백 함수들
    this.onScratch = null;
    this.onComplete = null;
    
    this.bindEvents();
  }

  /**
   * 이벤트 리스너 바인딩
   * @private
   */
  bindEvents() {
    // 터치 이벤트 (모바일)
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });
    
    // 마우스 이벤트 (데스크탑)
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    
    // 컨텍스트 메뉴 비활성화 (우클릭 방지)
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // 드래그 방지
    this.canvas.addEventListener('dragstart', (e) => e.preventDefault());
    
    Logger.debug('TouchHandler events bound');
  }

  /**
   * 렌더러 설정
   * @param {CanvasRenderer} renderer - Canvas 렌더러 인스턴스
   */
  setRenderer(renderer) {
    this.renderer = renderer;
    Logger.debug('TouchHandler renderer set');
  }

  /**
   * 터치 시작 처리
   * @private
   */
  handleTouchStart(event) {
    if (!this.isEnabled) return;
    
    event.preventDefault();
    
    const touch = event.touches[0];
    const coords = this.getTouchCoordinates(touch);
    
    this.startDrawing(coords.x, coords.y);
    
    Logger.touch('touchstart', coords.x, coords.y, {
      touches: event.touches.length
    });
  }

  /**
   * 터치 이동 처리
   * @private
   */
  handleTouchMove(event) {
    if (!this.isEnabled || !this.isDrawing) return;
    
    event.preventDefault();
    
    const touch = event.touches[0];
    const coords = this.getTouchCoordinates(touch);
    
    this.continueDrawing(coords.x, coords.y);
    
    Logger.logIf(
      window.CONFIG?.DEBUG?.SHOW_TOUCH_DEBUG,
      'touch',
      'touchmove', coords.x, coords.y
    );
  }

  /**
   * 터치 종료 처리
   * @private
   */
  handleTouchEnd(event) {
    if (!this.isEnabled) return;
    
    event.preventDefault();
    
    this.endDrawing();
    
    Logger.touch('touchend', this.lastTouch.x, this.lastTouch.y, {
      duration: performance.now() - this.touchStartTime,
      pathLength: this.touchPath.length
    });
  }

  /**
   * 마우스 다운 처리
   * @private
   */
  handleMouseDown(event) {
    if (!this.isEnabled) return;
    
    const coords = this.getMouseCoordinates(event);
    this.startDrawing(coords.x, coords.y);
    
    Logger.touch('mousedown', coords.x, coords.y);
  }

  /**
   * 마우스 이동 처리
   * @private
   */
  handleMouseMove(event) {
    if (!this.isEnabled || !this.isDrawing) return;
    
    const coords = this.getMouseCoordinates(event);
    this.continueDrawing(coords.x, coords.y);
  }

  /**
   * 마우스 업 처리
   * @private
   */
  handleMouseUp(event) {
    if (!this.isEnabled) return;
    
    this.endDrawing();
    
    Logger.touch('mouseup', this.lastTouch.x, this.lastTouch.y, {
      duration: performance.now() - this.touchStartTime,
      pathLength: this.touchPath.length
    });
  }

  /**
   * 그리기 시작
   * @private
   */
  startDrawing(x, y) {
    this.isDrawing = true;
    this.touchStartTime = performance.now();
    this.lastTouch = { x, y };
    this.lastTouchTime = this.touchStartTime;
    this.touchPath = [{ x, y, timestamp: this.touchStartTime }];
    
    // 가이드 텍스트 숨김 처리
    this.hideGuideText();
    
    // 첫 터치 지점 스크래치
    this.scratch(x, y);
    
    // 통계 업데이트
    this.stats.totalTouches++;
    this.stats.touchSessions++;
    
    Logger.gameEvent('scratch_start', { x, y });
  }

  /**
   * 그리기 계속
   * @private
   */
  continueDrawing(x, y) {
    const now = performance.now();
    
    // 스로틀링 적용
    if (now - this.lastTouchTime < this.touchThrottle) {
      return;
    }
    
    // 이동 거리 계산
    const dx = x - this.lastTouch.x;
    const dy = y - this.lastTouch.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 최소 이동 거리 확인 (더 민감하게)
    if (distance < 1) { // 1px 이상만 이동해도 반응
      return;
    }
    
    // 속도 계산
    const timeDelta = now - this.lastTouchTime;
    const velocity = distance / timeDelta;
    
    // 통계 업데이트
    this.stats.totalDistance += distance;
    this.stats.maxVelocity = Math.max(this.stats.maxVelocity, velocity);
    
    // 터치 경로 기록
    this.touchPath.push({ x, y, timestamp: now, velocity });
    
    // 중간 지점들도 스크래치 (선을 이어주기 위해)
    this.interpolateAndScratch(this.lastTouch.x, this.lastTouch.y, x, y);
    
    this.lastTouch = { x, y };
    this.lastTouchTime = now;
  }

  /**
   * 그리기 종료
   * @private
   */
  endDrawing() {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    
    const duration = performance.now() - this.touchStartTime;
    this.stats.totalDuration += duration;
    
    // 터치 세션 완료 로그
    Logger.gameEvent('scratch_session_complete', {
      duration,
      pathLength: this.touchPath.length,
      totalDistance: this.stats.totalDistance,
      averageVelocity: this.stats.totalDistance / duration
    });
    
    // 진행률 체크 및 콜백 호출
    this.checkProgress();
  }

  /**
   * 중간 지점 보간하여 스크래치
   * @private
   */
  interpolateAndScratch(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 거리에 따라 보간 점 개수 결정
    const steps = Math.max(1, Math.floor(distance / 5));
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      this.scratch(x, y);
    }
  }

  /**
   * 스크래치 실행
   * @private
   */
  scratch(x, y) {
    if (!this.renderer) return;
    
    // RAF를 사용한 성능 최적화
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.renderer.scratch(x, y, CONFIG.GAME.TOUCH_RADIUS);
        this.rafId = null;
      });
    }
  }

  /**
   * 진행률 확인 및 콜백 호출
   * @private
   */
  checkProgress() {
    if (!this.renderer) return;
    
    const progress = this.renderer.getScratchProgress();
    
    // onScratch 콜백 호출
    if (this.onScratch && typeof this.onScratch === 'function') {
      this.onScratch(progress);
    }
    
    // 완료 임계점 체크
    if (progress >= CONFIG.GAME.SCRATCH_THRESHOLD && this.onComplete && typeof this.onComplete === 'function') {
      this.onComplete(this.stats.totalDistance);
    }
  }

  /**
   * 터치 좌표 계산 (Canvas 좌표계로 변환)
   * @private
   */
  getTouchCoordinates(touch) {
    const rect = this.canvas.getBoundingClientRect();
    
    // 웹뷰 환경에서는 Canvas 실제 좌표계에 맞춰 계산
    if (document.body.classList.contains('webview-mode')) {
      // 클라이언트 좌표를 Canvas 좌표계로 직접 변환
      const x = (touch.clientX - rect.left) * (this.canvas.width / rect.width) / window.devicePixelRatio;
      const y = (touch.clientY - rect.top) * (this.canvas.height / rect.height) / window.devicePixelRatio;
      
      Logger.logIf(CONFIG?.DEBUG?.SHOW_TOUCH_DEBUG, 'debug', 'WebView touch coordinates:', {
        client: { x: touch.clientX, y: touch.clientY },
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        canvas: { 
          actualWidth: this.canvas.width, 
          actualHeight: this.canvas.height,
          displayWidth: rect.width,
          displayHeight: rect.height,
          pixelRatio: window.devicePixelRatio
        },
        result: { x, y }
      });
      
      return { x, y };
    }
    
    // 일반 브라우저에서는 devicePixelRatio 고려
    const x = (touch.clientX - rect.left) * (this.canvas.width / window.devicePixelRatio) / rect.width;
    const y = (touch.clientY - rect.top) * (this.canvas.height / window.devicePixelRatio) / rect.height;
    
    return { x, y };
  }

  /**
   * 마우스 좌표 계산 (Canvas 좌표계로 변환)
   * @private
   */
  getMouseCoordinates(event) {
    const rect = this.canvas.getBoundingClientRect();
    
    // 웹뷰 환경에서는 Canvas 실제 좌표계에 맞춰 계산
    if (document.body.classList.contains('webview-mode')) {
      // 클라이언트 좌표를 Canvas 좌표계로 직접 변환
      const x = (event.clientX - rect.left) * (this.canvas.width / rect.width) / window.devicePixelRatio;
      const y = (event.clientY - rect.top) * (this.canvas.height / rect.height) / window.devicePixelRatio;
      
      return { x, y };
    }
    
    // 일반 브라우저에서는 devicePixelRatio 고려
    const x = (event.clientX - rect.left) * (this.canvas.width / window.devicePixelRatio) / rect.width;
    const y = (event.clientY - rect.top) * (this.canvas.height / window.devicePixelRatio) / rect.height;
    
    return { x, y };
  }

  /**
   * 터치 핸들러 활성화
   */
  enable() {
    this.isEnabled = true;
    this.canvas.style.pointerEvents = 'auto';
    Logger.debug('TouchHandler enabled');
  }

  /**
   * 터치 핸들러 비활성화
   */
  disable() {
    this.isEnabled = false;
    this.isDrawing = false;
    this.canvas.style.pointerEvents = 'none';
    
    // 진행중인 RAF 취소
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    Logger.debug('TouchHandler disabled');
  }

  /**
   * 터치 감도 조정
   * @param {number} sensitivity - 감도 (1-10, 기본값: 5)
   */
  setSensitivity(sensitivity) {
    const clampedSensitivity = Math.max(1, Math.min(10, sensitivity));
    CONFIG.GAME.TOUCH_RADIUS = 15 + (clampedSensitivity * 2);
    this.touchThrottle = Math.max(5, 20 - (clampedSensitivity * 2));
    
    Logger.info('Touch sensitivity updated:', {
      sensitivity: clampedSensitivity,
      radius: CONFIG.GAME.TOUCH_RADIUS,
      throttle: this.touchThrottle
    });
  }

  /**
   * 터치 통계 반환
   * @returns {Object} 터치 통계 정보
   */
  getStats() {
    const averageSessionDuration = this.stats.touchSessions > 0 ? 
      this.stats.totalDuration / this.stats.touchSessions : 0;
    
    return {
      ...this.stats,
      averageSessionDuration,
      averageVelocity: this.stats.totalDuration > 0 ? 
        this.stats.totalDistance / this.stats.totalDuration : 0,
      isActive: this.isDrawing,
      isEnabled: this.isEnabled
    };
  }

  /**
   * 현재 터치 경로 반환
   * @returns {Array} 터치 경로 배열
   */
  getCurrentPath() {
    return [...this.touchPath];
  }

  /**
   * 통계 초기화
   */
  resetStats() {
    this.stats = {
      totalTouches: 0,
      totalDistance: 0,
      totalDuration: 0,
      maxVelocity: 0,
      touchSessions: 0
    };
    
    Logger.debug('TouchHandler stats reset');
  }

  /**
   * 터치 시뮬레이션 (테스트용)
   * @param {Array} points - 시뮬레이션할 포인트 배열 [{x, y, delay}]
   */
  async simulateTouch(points) {
    if (!Array.isArray(points) || points.length === 0) {
      return;
    }
    
    Logger.info('Starting touch simulation with', points.length, 'points');
    
    // 첫 번째 포인트에서 터치 시작
    const firstPoint = points[0];
    this.startDrawing(firstPoint.x, firstPoint.y);
    
    // 나머지 포인트들 순차 처리
    for (let i = 1; i < points.length; i++) {
      const point = points[i];
      
      if (point.delay) {
        await new Promise(resolve => setTimeout(resolve, point.delay));
      }
      
      this.continueDrawing(point.x, point.y);
    }
    
    // 터치 종료
    this.endDrawing();
    
    Logger.info('Touch simulation completed');
  }

  /**
   * 가이드 텍스트 숨김 처리
   * @private
   */
  hideGuideText() {
    const guideElement = document.querySelector('.scratch-guide');
    if (guideElement) {
      guideElement.style.opacity = '0';
      guideElement.style.visibility = 'hidden';
      Logger.debug('Guide text hidden');
    }
  }

  /**
   * 리소스 정리
   */
  cleanup() {
    // RAF 취소
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    // 상태 초기화
    this.isEnabled = false;
    this.isDrawing = false;
    this.touchPath = [];
    
    // 콜백 제거
    this.onScratch = null;
    this.onComplete = null;
    
    Logger.debug('TouchHandler cleaned up');
  }

  // ========================================
  // 정적 유틸리티 메서드들
  // ========================================

  /**
   * 터치 지원 여부 확인
   * @returns {boolean} 터치 지원 여부
   */
  static isTouchSupported() {
    return 'ontouchstart' in window || 
           navigator.maxTouchPoints > 0 || 
           navigator.msMaxTouchPoints > 0;
  }

  /**
   * 최적 터치 설정 반환
   * @returns {Object} 최적 설정 객체
   */
  static getOptimalSettings() {
    const deviceDetector = DeviceDetector.getInstance();
    const isHighPerformance = deviceDetector.estimatePerformance() > 70;
    
    return {
      touchRadius: deviceDetector.deviceInfo.isMobile ? 
        (deviceDetector.isIOS() ? 18 : 22) : 20,
      touchThrottle: isHighPerformance ? 8 : 12,
      sensitivity: deviceDetector.deviceInfo.isMobile ? 6 : 5
    };
  }

  /**
   * 터치 테스트 패턴 생성
   * @param {number} width - Canvas 너비
   * @param {number} height - Canvas 높이
   * @returns {Array} 테스트 포인트 배열
   */
  static generateTestPattern(width, height) {
    const points = [];
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 4;
    
    // 원형 패턴 생성
    for (let i = 0; i < 360; i += 10) {
      const angle = (i * Math.PI) / 180;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      points.push({ x, y, delay: 50 });
    }
    
    return points;
  }
}

// 전역 접근을 위한 할당
window.TouchHandler = TouchHandler;