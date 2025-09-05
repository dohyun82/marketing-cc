/**
 * 앱-웹 브릿지 통신 인터페이스
 * 모바일 앱의 WebView와 웹 게임 간의 양방향 통신을 담당합니다.
 */
class EventBridge {
  constructor() {
    this.initialized = false;
    this.pendingCalls = [];
    this.eventListeners = new Map();
    this.callbackId = 0;
    this.callbacks = new Map();
    
    this.initializeBridge();
  }

  /**
   * 브릿지 초기화
   * @private
   */
  initializeBridge() {
    try {
      // iOS WebKit 브릿지 감지
      if (window.webkit?.messageHandlers?.gameInterface) {
        this.bridgeType = 'ios';
        this.bridge = window.webkit.messageHandlers.gameInterface;
        this.initialized = true;
        Logger.info('iOS WebKit bridge detected');
      }
      // Android WebView 브릿지 감지
      else if (window.AndroidInterface) {
        this.bridgeType = 'android';
        this.bridge = window.AndroidInterface;
        this.initialized = true;
        Logger.info('Android WebView bridge detected');
      }
      // 브릿지가 없는 경우 (웹 브라우저 또는 개발 환경)
      else {
        this.bridgeType = 'mock';
        this.initializeMockBridge();
        Logger.warn('No native bridge found, using mock bridge');
      }

      // 메시지 리스너 등록
      this.setupMessageListeners();
      
      // 대기 중인 호출 처리
      this.processPendingCalls();
      
    } catch (error) {
      Logger.error('Failed to initialize bridge:', error);
      this.bridgeType = 'mock';
      this.initializeMockBridge();
    }
  }

  /**
   * Mock 브릿지 초기화 (개발 환경용)
   * @private
   */
  initializeMockBridge() {
    // MockBridge는 별도 파일에서 구현
    if (window.MockBridge) {
      this.bridge = new window.MockBridge();
      this.initialized = true;
    } else {
      Logger.error('MockBridge not available');
    }
  }

  /**
   * 메시지 리스너 설정
   * @private
   */
  setupMessageListeners() {
    // 앱에서 오는 메시지 처리
    window.addEventListener('message', (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        this.handleIncomingMessage(data);
      } catch (error) {
        Logger.error('Failed to parse incoming message:', error);
      }
    });

    // 앱의 브릿지 콜백 처리 (전역 함수로 노출)
    window.handleBridgeCallback = (callbackId, result, error) => {
      this.handleCallback(callbackId, result, error);
    };
  }

  /**
   * 들어오는 메시지 처리
   * @private
   */
  handleIncomingMessage(data) {
    const { type, payload, callbackId } = data;
    
    Logger.bridge('from-app', type, payload);
    
    // 등록된 리스너들에게 이벤트 전파
    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(listener => {
      try {
        listener(payload, callbackId);
      } catch (error) {
        Logger.error(`Error in event listener for ${type}:`, error);
      }
    });
  }

  /**
   * 콜백 처리
   * @private
   */
  handleCallback(callbackId, result, error) {
    const callback = this.callbacks.get(callbackId);
    if (callback) {
      this.callbacks.delete(callbackId);
      
      if (error) {
        callback.reject(new Error(error));
      } else {
        callback.resolve(result);
      }
    }
  }

  /**
   * 대기 중인 호출들을 처리
   * @private
   */
  processPendingCalls() {
    const calls = [...this.pendingCalls];
    this.pendingCalls = [];
    
    calls.forEach(({ method, data, resolve, reject }) => {
      this.callNative(method, data).then(resolve).catch(reject);
    });
  }

  /**
   * 네이티브 앱으로 메서드 호출
   * @param {string} method - 호출할 메서드명
   * @param {Object} data - 전송할 데이터
   * @returns {Promise} 결과 Promise
   */
  async callNative(method, data = {}) {
    return new Promise((resolve, reject) => {
      // 브릿지가 초기화되지 않은 경우 대기열에 추가
      if (!this.initialized) {
        this.pendingCalls.push({ method, data, resolve, reject });
        return;
      }

      try {
        const callbackId = ++this.callbackId;
        const message = {
          method,
          data,
          callbackId,
          timestamp: Date.now()
        };

        // 콜백 등록
        this.callbacks.set(callbackId, { resolve, reject });
        
        // 타임아웃 설정
        setTimeout(() => {
          if (this.callbacks.has(callbackId)) {
            this.callbacks.delete(callbackId);
            reject(new Error(`Bridge call timeout: ${method}`));
          }
        }, CONFIG.ERROR.BRIDGE_TIMEOUT);

        Logger.bridge('to-app', method, data);

        // 플랫폼별 메시지 전송
        if (this.bridgeType === 'ios') {
          this.bridge.postMessage(message);
        } else if (this.bridgeType === 'android') {
          this.bridge.postMessage(JSON.stringify(message));
        } else if (this.bridgeType === 'mock') {
          this.bridge.handleMessage(message);
        }

      } catch (error) {
        Logger.error(`Bridge call failed: ${method}`, error);
        reject(error);
      }
    });
  }

  /**
   * 앱에서 오는 이벤트 리스너 등록
   * @param {string} eventType - 이벤트 타입
   * @param {Function} listener - 리스너 함수
   */
  addEventListener(eventType, listener) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType).push(listener);
  }

  /**
   * 이벤트 리스너 제거
   * @param {string} eventType - 이벤트 타입
   * @param {Function} listener - 제거할 리스너 함수
   */
  removeEventListener(eventType, listener) {
    if (this.eventListeners.has(eventType)) {
      const listeners = this.eventListeners.get(eventType);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 브릿지 상태 확인
   * @returns {boolean} 브릿지 초기화 상태
   */
  isReady() {
    return this.initialized;
  }

  /**
   * 브릿지 타입 반환
   * @returns {string} 브릿지 타입 ('ios', 'android', 'mock')
   */
  getBridgeType() {
    return this.bridgeType;
  }

  // ========================================
  // 게임 관련 API 메서드들
  // ========================================

  /**
   * 이벤트 정보 요청
   * @param {string} eventId - 이벤트 ID
   * @returns {Promise<Object>} 이벤트 정보
   */
  async getEventInfo(eventId) {
    return this.callNative('getEventInfo', { eventId });
  }

  /**
   * 사용자 참여 자격 확인
   * @param {string} eventId - 이벤트 ID
   * @returns {Promise<Object>} 참여 자격 정보
   */
  async checkParticipation(eventId) {
    return this.callNative('checkParticipation', { eventId });
  }

  /**
   * 게임 참여 처리
   * @param {string} eventId - 이벤트 ID
   * @param {Object} gameData - 게임 결과 데이터
   * @returns {Promise<Object>} 참여 결과
   */
  async submitParticipation(eventId, gameData) {
    return this.callNative('submitParticipation', { 
      eventId, 
      gameData,
      timestamp: Date.now() 
    });
  }

  /**
   * 결과 확인 완료 알림
   * @param {string} eventId - 이벤트 ID
   * @param {Object} result - 게임 결과
   * @returns {Promise<void>}
   */
  async confirmResult(eventId, result) {
    return this.callNative('confirmResult', { eventId, result });
  }

  /**
   * 화면 닫기 요청
   * @returns {Promise<void>}
   */
  async closeGame() {
    return this.callNative('closeGame');
  }

  /**
   * 에러 보고
   * @param {string} errorType - 에러 타입
   * @param {string} errorMessage - 에러 메시지
   * @param {Object} errorData - 추가 에러 데이터
   * @returns {Promise<void>}
   */
  async reportError(errorType, errorMessage, errorData = {}) {
    return this.callNative('reportError', { 
      errorType, 
      errorMessage, 
      errorData,
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    });
  }

  /**
   * 로그 전송
   * @param {Array} logs - 로그 배열
   * @returns {Promise<void>}
   */
  async sendLogs(logs) {
    return this.callNative('sendLogs', { logs });
  }

  /**
   * 디바이스 정보 전송
   * @param {Object} deviceInfo - 디바이스 정보
   * @returns {Promise<void>}
   */
  async sendDeviceInfo(deviceInfo) {
    return this.callNative('sendDeviceInfo', deviceInfo);
  }

  // ========================================
  // 정적 메서드들
  // ========================================

  /**
   * 싱글톤 인스턴스 반환
   * @returns {EventBridge} EventBridge 인스턴스
   */
  static getInstance() {
    if (!this.instance) {
      this.instance = new EventBridge();
    }
    return this.instance;
  }

  /**
   * 브릿지 초기화 완료 여부 확인
   * @returns {boolean} 초기화 완료 여부
   */
  static isInitialized() {
    return this.instance?.isReady() || false;
  }

  /**
   * 전역 EventBridge 인스턴스 생성
   * @returns {EventBridge} EventBridge 인스턴스
   */
  static initialize() {
    const bridge = this.getInstance();
    window.EventBridge = bridge;
    return bridge;
  }
}

// 전역 접근을 위한 할당
window.EventBridge = EventBridge;

// 디버그 모드에서 브릿지 정보 로그
if (window.CONFIG?.DEBUG?.ENABLED) {
  document.addEventListener('DOMContentLoaded', () => {
    const bridge = EventBridge.getInstance();
    Logger.info('EventBridge initialized:', {
      type: bridge.getBridgeType(),
      ready: bridge.isReady()
    });
  });
}