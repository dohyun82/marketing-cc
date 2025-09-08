/**
 * 스크래치 게임 메인 클래스
 * 게임 상태 관리, 라이프사이클, 이벤트 처리를 담당합니다.
 */
class ScratchGame {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.eventId = window.CONFIG?.EVENT?.ID || 'default-event';
    
    // 상태 관리
    this.gameState = 'initializing'; // initializing, loading, ready, playing, completed, error
    this.eventBridge = null;
    this.canvasRenderer = null;
    this.touchHandler = null;
    this.gameData = null;
    this.participationResult = null;
    
    // UI 엘리먼트 참조
    this.elements = {};
    
    // 성능 모니터링
    this.performance = {
      startTime: performance.now(),
      loadTime: 0,
      firstInteraction: 0,
      completionTime: 0
    };
    
    this.initialize();
  }

  /**
   * 안전한 로깅 (Logger가 없을 경우 대비)
   * @private
   */
  safeLog(level, ...args) {
    try {
      if (window.Logger && typeof window.Logger[level] === 'function') {
        window.Logger[level](...args);
      } else {
        console[level === 'info' ? 'log' : level]('[ScratchGame]', ...args);
      }
    } catch (error) {
      console.error('[ScratchGame] Logging failed:', error);
    }
  }

  /**
   * 게임 초기화
   * @private
   */
  async initialize() {
    try {
      this.safeLog('info', 'Game initialization starting...', { eventId: this.eventId });
      
      // UI 엘리먼트 바인딩
      this.bindElements();
      
      // EventBridge 초기화
      await this.initializeEventBridge();
      
      // 디바이스 호환성 검사
      await this.checkCompatibility();
      
      // 이벤트 정보 로드
      await this.loadEventData();
      
      // Canvas 초기화
      await this.initializeCanvas();
      
      // 게임 준비 완료
      this.gameState = 'ready';
      this.showGameScreen();
      
      this.safeLog('info', 'Game initialization completed successfully', {
        loadTime: performance.now() - this.performance.startTime
      });
      
    } catch (error) {
      this.safeLog('error', 'Game initialization failed:', error);
      this.handleError('INIT_ERROR', error.message);
    }
  }

  /**
   * UI 엘리먼트 바인딩
   * @private
   */
  bindElements() {
    this.elements = {
      // 화면들
      gameScreen: document.getElementById('game-screen'),
      errorScreen: document.getElementById('error-screen'),
      
      // 게임 UI
      canvas: document.getElementById('scratch-canvas'),
      canvasContainer: document.querySelector('.canvas-container'),
      eventTitle: document.querySelector('.event-title'),
      eventDescription: document.querySelector('.event-description'),
      progressBar: document.querySelector('.progress-fill'),
      progressText: document.querySelector('.progress-text'),
      
      // 모달
      resultModal: document.getElementById('result-modal'),
      resultContent: document.querySelector('.result-content'),
      confirmButton: document.getElementById('confirm-button'),
      
      // 에러 화면
      retryButton: document.querySelector('.retry-button')
    };
    
    // 이벤트 리스너 바인딩
    this.bindEventListeners();
  }

  /**
   * 이벤트 리스너 바인딩
   * @private
   */
  bindEventListeners() {
    // 재시도 버튼
    if (this.elements.retryButton) {
      this.elements.retryButton.addEventListener('click', () => {
        this.retry();
      });
    }
    
    // 결과 확인 버튼
    if (this.elements.confirmButton) {
      this.elements.confirmButton.addEventListener('click', () => {
        this.confirmResult();
      });
    }
    
    // 페이지 언로드 시 정리는 앱에서 처리
    // window.addEventListener('beforeunload', () => {
    //   this.cleanup();
    // });
    
    // 가시성 변경 감지 (백그라운드/포그라운드)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.onGamePause();
      } else {
        this.onGameResume();
      }
    });
  }

  /**
   * EventBridge 초기화
   * @private
   */
  async initializeEventBridge() {
    try {
      this.eventBridge = EventBridge.getInstance();
      
      // 브릿지 준비 대기
      let retries = 0;
      const maxRetries = 50; // 5초 대기
      
      while (!this.eventBridge.isReady() && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      if (!this.eventBridge.isReady()) {
        throw new Error('EventBridge initialization timeout');
      }
      
      Logger.info('EventBridge ready:', this.eventBridge.getBridgeType());
      
    } catch (error) {
      Logger.error('EventBridge initialization failed:', error);
      throw error;
    }
  }

  /**
   * 디바이스 호환성 검사
   * @private
   */
  async checkCompatibility() {
    // Canvas 지원 여부 확인 (가장 중요)
    if (!CanvasRenderer.isSupported()) {
      throw new Error('Canvas not supported in this browser');
    }

    // 필수 DOM 엘리먼트 확인
    if (!this.elements.canvas) {
      throw new Error('Canvas element not found');
    }

    const deviceDetector = DeviceDetector.getInstance();
    const compatibility = deviceDetector.checkCompatibility();
    
    // 호환성 정보를 앱으로 전송
    try {
      if (this.eventBridge) {
        await this.eventBridge.sendDeviceInfo(deviceDetector.deviceInfo);
      }
    } catch (error) {
      // 브릿지 에러는 치명적이지 않으므로 경고만 출력
      this.safeLog('warn', 'Failed to send device info:', error);
    }
    
    // 치명적 호환성 문제 확인
    if (!compatibility.compatible) {
      const criticalIssues = compatibility.issues.filter(issue => 
        issue.includes('not supported') || issue.includes('too old')
      );
      
      if (criticalIssues.length > 0) {
        throw new Error(`Compatibility issues: ${criticalIssues.join(', ')}`);
      }
    }
    
    // 권장 사항 로그
    if (compatibility.recommendations.length > 0) {
      Logger.warn('Device recommendations:', compatibility.recommendations);
    }
  }

  /**
   * 이벤트 데이터 로드
   * @private
   */
  async loadEventData() {
    try {
      // 이벤트 정보 요청
      const eventResponse = await this.eventBridge.getEventInfo(this.eventId);
      this.gameData = eventResponse.event;
      
      // 참여 자격 확인
      const participationResponse = await this.eventBridge.checkParticipation(this.eventId);
      
      if (!participationResponse.canParticipate) {
        throw new Error(`Cannot participate: ${participationResponse.reason}`);
      }
      
      // UI 업데이트
      this.updateGameUI();
      
      Logger.gameEvent('event_data_loaded', {
        eventId: this.eventId,
        title: this.gameData.title
      });
      
    } catch (error) {
      Logger.error('Failed to load event data:', error);
      throw error;
    }
  }

  /**
   * Canvas 초기화
   * @private
   */
  async initializeCanvas() {
    try {
      // CanvasRenderer 생성
      this.canvasRenderer = new CanvasRenderer(this.elements.canvas);
      await this.canvasRenderer.initialize();
      
      // TouchHandler 생성
      this.touchHandler = new TouchHandler(this.elements.canvas);
      this.touchHandler.onScratch = (progress) => this.onScratchProgress(progress);
      this.touchHandler.onComplete = (scratchedArea) => this.onScratchComplete(scratchedArea);
      
      // Canvas와 TouchHandler 연결
      this.touchHandler.setRenderer(this.canvasRenderer);
      
      Logger.info('Canvas system initialized');
      
    } catch (error) {
      Logger.error('Canvas initialization failed:', error);
      throw error;
    }
  }

  /**
   * 게임 UI 업데이트
   * @private
   */
  updateGameUI() {
    if (this.gameData) {
      if (this.elements.eventTitle) {
        this.elements.eventTitle.textContent = this.gameData.title;
      }
      
      if (this.elements.eventDescription) {
        this.elements.eventDescription.textContent = this.gameData.description;
      }
    }
  }

  /**
   * 로딩 화면에서 게임 화면으로 전환
   * @private
   */
  showGameScreen() {
    this.switchScreen('game');
    
    // 첫 상호작용 시간 기록을 위한 준비
    this.setupFirstInteractionTracking();
    
    this.performance.loadTime = performance.now() - this.performance.startTime;
    Logger.performance('game_load', this.performance.loadTime, {
      eventId: this.eventId
    });
  }

  /**
   * 첫 상호작용 추적 설정
   * @private
   */
  setupFirstInteractionTracking() {
    const trackFirstInteraction = () => {
      if (this.performance.firstInteraction === 0) {
        this.performance.firstInteraction = performance.now() - this.performance.startTime;
        Logger.performance('first_interaction', this.performance.firstInteraction);
      }
    };
    
    this.elements.canvas.addEventListener('touchstart', trackFirstInteraction, { once: true });
    this.elements.canvas.addEventListener('mousedown', trackFirstInteraction, { once: true });
  }

  /**
   * 화면 전환
   * @private
   */
  switchScreen(screenName) {
    const screens = ['loading', 'game', 'error'];
    
    screens.forEach(name => {
      const screen = document.getElementById(`${name}-screen`);
      if (screen) {
        if (name === screenName) {
          screen.classList.remove('hidden');
        } else {
          screen.classList.add('hidden');
        }
      }
    });
  }

  /**
   * 스크래치 진행률 콜백
   * @private
   */
  onScratchProgress(progress) {
    if (this.gameState !== 'playing' && this.gameState !== 'ready') {
      return;
    }
    
    // 첫 터치 시 게임 시작
    if (this.gameState === 'ready') {
      this.gameState = 'playing';
      Logger.gameEvent('game_start', { eventId: this.eventId });
    }
    
    // 진행률 UI 업데이트
    this.updateProgressUI(progress);
    
    // 임계점 도달 시 자동 완성 준비
    if (progress >= CONFIG.GAME.SCRATCH_THRESHOLD && this.gameState === 'playing') {
      setTimeout(() => {
        if (this.gameState === 'playing') {
          this.completeScratch();
        }
      }, CONFIG.GAME.AUTO_COMPLETE_DELAY);
    }
  }

  /**
   * 스크래치 완료 콜백
   * @private
   */
  onScratchComplete(scratchedArea) {
    if (this.gameState !== 'playing') {
      return;
    }
    
    this.completeScratch();
  }

  /**
   * 진행률 UI 업데이트
   * @private
   */
  updateProgressUI(progress) {
    const percentage = Math.round(progress);
    
    // 기존 진행률 바 업데이트 (현재 숨김 상태)
    if (this.elements.progressBar) {
      this.elements.progressBar.style.width = `${percentage}%`;
    }
    
    if (this.elements.progressText) {
      this.elements.progressText.textContent = `${percentage}% 완료`;
    }
    
    // Canvas 컨테이너에 점진적 클래스 적용
    this.updateCanvasProgressClasses(percentage);
  }

  /**
   * 진행률에 따른 Canvas 스타일 클래스 업데이트
   * @private
   */
  updateCanvasProgressClasses(percentage) {
    const container = this.elements.canvasContainer;
    if (!container) return;
    
    // 기존 진행률 클래스 제거
    const progressClasses = ['scratch-progress-10', 'scratch-progress-25', 'scratch-progress-50', 'scratch-progress-75', 'scratch-completed'];
    progressClasses.forEach(cls => container.classList.remove(cls));
    
    // 진행률에 따른 클래스 적용 (자연스러운 단계별 전환)
    if (percentage >= 75) {
      container.classList.add('scratch-progress-75');
    } else if (percentage >= 50) {
      container.classList.add('scratch-progress-50');
    } else if (percentage >= 25) {
      container.classList.add('scratch-progress-25');
    } else if (percentage >= 10) {
      container.classList.add('scratch-progress-10');
    }
  }

  /**
   * 스크래치 완성 처리
   * @private
   */
  async completeScratch() {
    try {
      this.gameState = 'completing';
      
      // 게임 완료 시점 기록
      this.performance.completionTime = performance.now() - this.performance.startTime;
      
      Logger.gameEvent('scratch_complete', {
        completionTime: this.performance.completionTime
      });
      
      // 터치 비활성화
      this.touchHandler.disable();
      
      // 완료 상태 클래스 적용 (자연스러운 페이드아웃)
      if (this.elements.canvasContainer) {
        // 기존 진행률 클래스 제거
        const progressClasses = ['scratch-progress-10', 'scratch-progress-25', 'scratch-progress-50', 'scratch-progress-75'];
        progressClasses.forEach(cls => this.elements.canvasContainer.classList.remove(cls));
        
        // 완료 클래스 적용
        this.elements.canvasContainer.classList.add('scratch-completed');
      }
      
      // 스크래치 표면 페이드아웃
      await this.canvasRenderer.fadeOutScratchSurface();
      
      // 참여 결과 처리
      await this.processParticipation();
      
    } catch (error) {
      Logger.error('Failed to complete scratch:', error);
      this.handleError('COMPLETION_ERROR', error.message);
    }
  }

  /**
   * 참여 결과 처리
   * @private
   */
  async processParticipation() {
    try {
      // 게임 데이터 준비
      const gameData = {
        scratchProgress: this.canvasRenderer.getScratchProgress(),
        completionTime: this.performance.completionTime,
        deviceInfo: DeviceDetector.getDeviceInfo()
      };
      
      // 참여 제출
      const response = await this.eventBridge.submitParticipation(this.eventId, gameData);
      this.participationResult = response.result;
      
      this.gameState = 'completed';
      
      // 결과 표시
      this.showResult();
      
      Logger.gameEvent('participation_complete', {
        result: this.participationResult
      });
      
    } catch (error) {
      Logger.error('Failed to process participation:', error);
      this.handleError('PARTICIPATION_ERROR', error.message);
    }
  }

  /**
   * 결과 모달 표시
   * @private
   */
  showResult() {
    if (!this.participationResult) {
      return;
    }
    
    const { reward } = this.participationResult;
    
    // 결과 내용 업데이트
    if (this.elements.resultContent) {
      this.elements.resultContent.innerHTML = `
        <div class="result-icon">
          ${reward.isWinning ? '🎉' : '😅'}
        </div>
        <div class="result-title">
          ${reward.isWinning ? '축하합니다!' : '아쉽네요!'}
        </div>
        <div class="result-reward">
          ${reward.name}
        </div>
        ${reward.isWinning && reward.value > 0 ? 
          `<div class="result-value">${reward.value.toLocaleString()}원</div>` : ''
        }
      `;
    }
    
    // 모달 표시
    if (this.elements.resultModal) {
      this.elements.resultModal.classList.remove('hidden');
    }
  }

  /**
   * 결과 모달 닫기
   * @private
   */
  hideResultModal() {
    if (this.elements.resultModal) {
      this.elements.resultModal.classList.add('hidden');
      Logger.debug('Result modal hidden');
    }
  }

  /**
   * 결과 확인 처리
   * @private
   */
  async confirmResult() {
    try {
      // 모달 닫기
      this.hideResultModal();
      
      await this.eventBridge.confirmResult(this.eventId, this.participationResult);
      
      Logger.gameEvent('result_confirmed', {
        result: this.participationResult
      });
      
      // 게임 종료
      this.closeGame();
      
    } catch (error) {
      Logger.error('Failed to confirm result:', error);
      // 모달 닫기
      this.hideResultModal();
      // 확인 실패해도 게임은 종료
      this.closeGame();
    }
  }

  /**
   * 게임 종료
   * @private
   */
  async closeGame() {
    try {
      await this.eventBridge.closeGame();
    } catch (error) {
      Logger.warn('Failed to close game through bridge:', error);
    }
    
    // 정리 작업
    this.cleanup();
  }

  /**
   * 에러 처리
   * @private
   */
  handleError(errorType, errorMessage) {
    this.gameState = 'error';
    
    Logger.error(`Game error [${errorType}]:`, errorMessage);
    
    // 에러를 앱으로 보고
    if (this.eventBridge) {
      this.eventBridge.reportError(errorType, errorMessage, {
        gameState: this.gameState,
        eventId: this.eventId,
        performance: this.performance
      }).catch(err => {
        Logger.error('Failed to report error:', err);
      });
    }
    
    // 에러 화면 표시
    this.switchScreen('error');
  }

  /**
   * 게임 재시도
   * @private
   */
  retry() {
    Logger.gameEvent('game_retry', { eventId: this.eventId });
    
    // 상태 초기화
    this.gameState = 'initializing';
    this.participationResult = null;
    this.performance.startTime = performance.now();
    
    // 화면 초기화
    this.switchScreen('loading');
    
    // 다시 초기화
    this.initialize();
  }

  /**
   * 게임 일시정지
   * @private
   */
  onGamePause() {
    if (this.touchHandler) {
      this.touchHandler.disable();
    }
    
    Logger.gameEvent('game_pause');
  }

  /**
   * 게임 재개
   * @private
   */
  onGameResume() {
    if (this.touchHandler && this.gameState === 'playing') {
      this.touchHandler.enable();
    }
    
    Logger.gameEvent('game_resume');
  }

  /**
   * 리소스 정리
   * @private
   */
  cleanup() {
    if (this.touchHandler) {
      this.touchHandler.cleanup();
    }
    
    if (this.canvasRenderer) {
      this.canvasRenderer.cleanup();
    }
    
    // 로그 전송
    if (this.eventBridge && Logger.logs.length > 0) {
      this.eventBridge.sendLogs(Logger.logs).catch(err => {
        console.error('Failed to send logs:', err);
      });
    }
    
    Logger.gameEvent('game_cleanup');
  }

  // ========================================
  // 공개 API 메서드들
  // ========================================

  /**
   * 현재 게임 상태 반환
   * @returns {string} 게임 상태
   */
  getState() {
    return this.gameState;
  }

  /**
   * 게임 성능 정보 반환
   * @returns {Object} 성능 정보
   */
  getPerformance() {
    return { ...this.performance };
  }

  /**
   * 참여 결과 반환
   * @returns {Object} 참여 결과
   */
  getResult() {
    return this.participationResult;
  }

  // ========================================
  // 정적 메서드들
  // ========================================

  /**
   * 게임 인스턴스 생성 및 시작
   * @param {string} containerId - 게임 컨테이너 ID
   * @returns {ScratchGame} 게임 인스턴스
   */
  static start(containerId = 'game-container') {
    const game = new ScratchGame(containerId);
    return game;
  }
}

// 전역 접근을 위한 할당
window.ScratchGame = ScratchGame;