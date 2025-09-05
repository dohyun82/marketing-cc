/**
 * 메인 게임 초기화 스크립트
 * 애플리케이션 진입점 및 글로벌 설정을 담당합니다.
 */
(function() {
  'use strict';
  
  // 전역 게임 인스턴스
  let gameInstance = null;
  
  /**
   * DOM 로드 완료 후 실행
   */
  document.addEventListener('DOMContentLoaded', function() {
    initializeApplication();
  });
  
  /**
   * 애플리케이션 초기화
   */
  async function initializeApplication() {
    try {
      Logger.info('Application initializing...');
      
      // 설정 유효성 검사
      validateConfiguration();
      
      // 전역 에러 핸들러 설정
      setupGlobalErrorHandlers();
      
      // 성능 모니터링 시작
      startPerformanceMonitoring();
      
      // 게임 시작
      await startGame();
      
    } catch (error) {
      Logger.error('Application initialization failed:', error);
      showCriticalError('애플리케이션 초기화에 실패했습니다.', error.message);
    }
  }
  
  /**
   * 설정 유효성 검사
   * @private
   */
  function validateConfiguration() {
    if (!window.CONFIG) {
      throw new Error('CONFIG not found');
    }
    
    // 필수 설정 확인
    const requiredConfigs = [
      'EVENT.ID',
      'GAME.SCRATCH_THRESHOLD',
      'GAME.TOUCH_RADIUS',
      'CANVAS.MAX_WIDTH',
      'CANVAS.MAX_HEIGHT'
    ];
    
    for (const configPath of requiredConfigs) {
      const keys = configPath.split('.');
      let current = window.CONFIG;
      
      for (const key of keys) {
        if (current[key] === undefined) {
          throw new Error(`Required config missing: ${configPath}`);
        }
        current = current[key];
      }
    }
    
    Logger.debug('Configuration validation passed');
  }
  
  /**
   * 전역 에러 핸들러 설정
   * @private
   */
  function setupGlobalErrorHandlers() {
    // JavaScript 에러 처리
    window.addEventListener('error', function(event) {
      Logger.error('Global JavaScript error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
      
      reportError('JAVASCRIPT_ERROR', event.message, {
        filename: event.filename,
        lineno: event.lineno,
        stack: event.error?.stack
      });
    });
    
    // 미처리 Promise 거부 처리
    window.addEventListener('unhandledrejection', function(event) {
      Logger.error('Unhandled promise rejection:', event.reason);
      
      reportError('UNHANDLED_PROMISE', event.reason?.message || 'Unknown promise rejection', {
        reason: event.reason
      });
      
      // 기본 처리 방지 (콘솔 로그 방지)
      event.preventDefault();
    });
    
    // 리소스 로딩 에러 처리
    window.addEventListener('error', function(event) {
      if (event.target !== window && event.target.tagName) {
        Logger.error('Resource loading error:', {
          tagName: event.target.tagName,
          source: event.target.src || event.target.href,
          message: event.message
        });
      }
    }, true);
    
    Logger.debug('Global error handlers setup complete');
  }
  
  /**
   * 성능 모니터링 시작
   * @private
   */
  function startPerformanceMonitoring() {
    // 메모리 사용량 모니터링 (Chrome에서만 지원)
    if (performance.memory) {
      const checkMemory = () => {
        const memory = performance.memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        const maxMB = CONFIG.PERFORMANCE.MAX_MEMORY_MB;
        
        if (usedMB > maxMB) {
          Logger.warn('Memory usage high:', {
            used: `${usedMB.toFixed(2)}MB`,
            limit: `${maxMB}MB`
          });
        }
        
        Logger.logIf(
          window.CONFIG?.DEBUG?.SHOW_PERFORMANCE,
          'debug',
          `Memory: ${usedMB.toFixed(2)}MB / ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`
        );
      };
      
      // 주기적 메모리 체크
      setInterval(checkMemory, 30000); // 30초마다
    }
    
    // FPS 모니터링
    let frameCount = 0;
    let lastTime = performance.now();
    
    function trackFPS() {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 5000) { // 5초마다 체크
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        Logger.logIf(
          window.CONFIG?.DEBUG?.SHOW_PERFORMANCE,
          'debug',
          `FPS: ${fps}`
        );
        
        if (fps < 30) {
          Logger.warn('Low FPS detected:', fps);
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(trackFPS);
    }
    
    requestAnimationFrame(trackFPS);
    
    Logger.debug('Performance monitoring started');
  }
  
  /**
   * 게임 시작
   * @private
   */
  async function startGame() {
    try {
      Logger.gameEvent('app_start', {
        eventId: CONFIG.EVENT.ID,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });
      
      // DeviceDetector 로그 출력 (디버그 모드에서)
      if (CONFIG.DEBUG.ENABLED) {
        DeviceDetector.logInfo();
      }
      
      // 게임 인스턴스 생성 및 시작
      gameInstance = ScratchGame.start('game-container');
      
      // 게임 인스턴스를 전역에서 접근 가능하게 설정 (디버그용)
      if (CONFIG.DEBUG.ENABLED) {
        window.game = gameInstance;
      }
      
      Logger.info('Game started successfully');
      
    } catch (error) {
      Logger.error('Game start failed:', error);
      throw error;
    }
  }
  
  /**
   * 에러 보고
   * @private
   */
  async function reportError(errorType, errorMessage, errorData = {}) {
    try {
      // EventBridge가 준비되어 있으면 앱으로 에러 보고
      if (window.EventBridge && EventBridge.isInitialized()) {
        const bridge = EventBridge.getInstance();
        await bridge.reportError(errorType, errorMessage, {
          ...errorData,
          gameState: gameInstance?.getState(),
          url: window.location.href,
          timestamp: Date.now()
        });
      }
    } catch (reportError) {
      Logger.error('Failed to report error:', reportError);
    }
  }
  
  /**
   * 치명적 에러 표시
   * @private
   */
  function showCriticalError(title, message) {
    // 에러 화면이 있으면 표시
    const errorScreen = document.getElementById('error-screen');
    if (errorScreen) {
      const errorTitle = errorScreen.querySelector('.error-title');
      const errorMessage = errorScreen.querySelector('.error-message');
      
      if (errorTitle) errorTitle.textContent = title;
      if (errorMessage) errorMessage.textContent = message;
      
      // 모든 화면 숨기고 에러 화면만 표시
      document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
      });
      errorScreen.classList.remove('hidden');
    } else {
      // 대체 에러 표시
      alert(`${title}\n\n${message}`);
    }
  }
  
  // ========================================
  // 개발자 유틸리티 (디버그 모드에서만)
  // ========================================
  
  if (window.CONFIG?.DEBUG?.ENABLED) {
    // 개발자 콘솔 유틸리티
    window.devUtils = {
      // 게임 상태 확인
      getGameState: () => gameInstance?.getState(),
      getGamePerformance: () => gameInstance?.getPerformance(),
      getGameResult: () => gameInstance?.getResult(),
      
      // 브릿지 테스트
      testBridge: async (method, data) => {
        const bridge = EventBridge.getInstance();
        return await bridge.callNative(method, data);
      },
      
      // 터치 시뮬레이션
      simulateTouch: async (pattern = 'circle') => {
        if (!gameInstance) return;
        
        const canvas = document.getElementById('scratch-canvas');
        const rect = canvas.getBoundingClientRect();
        
        let points;
        if (pattern === 'circle') {
          points = TouchHandler.generateTestPattern(rect.width, rect.height);
        } else if (Array.isArray(pattern)) {
          points = pattern;
        } else {
          points = [
            { x: rect.width * 0.2, y: rect.height * 0.2, delay: 100 },
            { x: rect.width * 0.8, y: rect.height * 0.2, delay: 100 },
            { x: rect.width * 0.8, y: rect.height * 0.8, delay: 100 },
            { x: rect.width * 0.2, y: rect.height * 0.8, delay: 100 }
          ];
        }
        
        const touchHandler = gameInstance.touchHandler;
        if (touchHandler) {
          await touchHandler.simulateTouch(points);
        }
      },
      
      // 로그 관리
      exportLogs: () => Logger.exportLogs(),
      clearLogs: () => Logger.clearHistory(),
      setLogLevel: (level) => Logger.setLevel(level),
      
      // 강제 게임 재시작
      restartGame: () => {
        if (gameInstance) {
          gameInstance.retry();
        }
      },
      
      // 메모리 정리
      cleanup: () => {
        if (gameInstance) {
          gameInstance.cleanup();
        }
        
        // 강제 가비지 컬렉션 (Chrome에서만)
        if (window.gc) {
          window.gc();
        }
      }
    };
    
    // 개발자 도구 안내
    console.log(`
🎮 스크래치 게임 개발자 도구

사용 가능한 유틸리티:
- devUtils.getGameState() : 게임 상태 확인
- devUtils.simulateTouch() : 터치 시뮬레이션
- devUtils.exportLogs() : 로그 내보내기
- devUtils.restartGame() : 게임 재시작
- mockUtils.* : Mock 브릿지 테스트 도구

설정 정보: window.CONFIG
게임 인스턴스: window.game
브릿지 인스턴스: window.EventBridge
Mock 브릿지: window.mockBridge
    `);
  }
  
})();