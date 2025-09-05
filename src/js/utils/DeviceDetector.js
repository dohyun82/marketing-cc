/**
 * 디바이스 감지 및 호환성 검사 유틸리티
 */
class DeviceDetector {
  constructor() {
    this.userAgent = navigator.userAgent;
    this.platform = navigator.platform;
    this.deviceInfo = this.analyzeDevice();
  }

  /**
   * 디바이스 정보 분석
   * @private
   */
  analyzeDevice() {
    const info = {
      // 기본 정보
      userAgent: this.userAgent,
      platform: this.platform,
      language: navigator.language,
      
      // 디바이스 타입
      isMobile: this.isMobile(),
      isTablet: this.isTablet(),
      isDesktop: this.isDesktop(),
      
      // 운영체제
      isIOS: this.isIOS(),
      isAndroid: this.isAndroid(),
      
      // 브라우저
      browser: this.getBrowser(),
      browserVersion: this.getBrowserVersion(),
      
      // 화면 정보
      screen: {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        pixelRatio: window.devicePixelRatio || 1
      },
      
      // 뷰포트 정보
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      
      // 기능 지원 여부
      features: {
        touch: this.supportsTouch(),
        canvas: this.supportsCanvas(),
        webGL: this.supportsWebGL(),
        deviceMotion: this.supportsDeviceMotion(),
        localStorage: this.supportsLocalStorage(),
        serviceWorker: this.supportsServiceWorker()
      },
      
      // 네트워크 정보
      connection: this.getConnectionInfo()
    };

    return info;
  }

  /**
   * 모바일 디바이스 여부 확인
   */
  isMobile() {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(this.userAgent) ||
           (window.orientation !== undefined);
  }

  /**
   * 태블릿 디바이스 여부 확인
   */
  isTablet() {
    return /iPad|Android(?!.*Mobile)|Kindle|Silk/i.test(this.userAgent) ||
           (this.isMobile() && Math.min(screen.width, screen.height) > 768);
  }

  /**
   * 데스크톱 디바이스 여부 확인
   */
  isDesktop() {
    return !this.isMobile() && !this.isTablet();
  }

  /**
   * iOS 디바이스 여부 확인
   */
  isIOS() {
    return /iPad|iPhone|iPod/.test(this.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /**
   * Android 디바이스 여부 확인
   */
  isAndroid() {
    return /Android/i.test(this.userAgent);
  }

  /**
   * 브라우저 정보 반환
   */
  getBrowser() {
    if (this.userAgent.includes('Chrome') && !this.userAgent.includes('Edg')) return 'Chrome';
    if (this.userAgent.includes('Safari') && !this.userAgent.includes('Chrome')) return 'Safari';
    if (this.userAgent.includes('Firefox')) return 'Firefox';
    if (this.userAgent.includes('Edge') || this.userAgent.includes('Edg')) return 'Edge';
    if (this.userAgent.includes('Opera')) return 'Opera';
    if (this.userAgent.includes('Samsung')) return 'Samsung Internet';
    return 'Unknown';
  }

  /**
   * 브라우저 버전 반환
   */
  getBrowserVersion() {
    const browser = this.getBrowser();
    let version = 'Unknown';
    
    try {
      switch (browser) {
        case 'Chrome':
          version = this.userAgent.match(/Chrome\/(\d+\.\d+)/)?.[1];
          break;
        case 'Safari':
          version = this.userAgent.match(/Version\/(\d+\.\d+)/)?.[1];
          break;
        case 'Firefox':
          version = this.userAgent.match(/Firefox\/(\d+\.\d+)/)?.[1];
          break;
        case 'Edge':
          version = this.userAgent.match(/Edg\/(\d+\.\d+)/)?.[1];
          break;
      }
    } catch (error) {
      Logger.warn('Failed to parse browser version:', error);
    }
    
    return version || 'Unknown';
  }

  /**
   * 터치 지원 여부 확인
   */
  supportsTouch() {
    return 'ontouchstart' in window || 
           navigator.maxTouchPoints > 0 || 
           navigator.msMaxTouchPoints > 0;
  }

  /**
   * Canvas 지원 여부 확인
   */
  supportsCanvas() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    } catch (error) {
      return false;
    }
  }

  /**
   * WebGL 지원 여부 확인
   */
  supportsWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch (error) {
      return false;
    }
  }

  /**
   * Device Motion API 지원 여부 확인
   */
  supportsDeviceMotion() {
    return 'DeviceMotionEvent' in window;
  }

  /**
   * Local Storage 지원 여부 확인
   */
  supportsLocalStorage() {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Service Worker 지원 여부 확인
   */
  supportsServiceWorker() {
    return 'serviceWorker' in navigator;
  }

  /**
   * 네트워크 연결 정보 반환
   */
  getConnectionInfo() {
    const connection = navigator.connection || 
                      navigator.mozConnection || 
                      navigator.webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    
    return null;
  }

  /**
   * 디바이스 성능 추정
   */
  estimatePerformance() {
    let score = 100; // 기본 점수
    
    // CPU 코어 수
    const cores = navigator.hardwareConcurrency || 4;
    score += (cores - 4) * 10;
    
    // 메모리 정보 (Chrome에서만 지원)
    if (navigator.deviceMemory) {
      score += (navigator.deviceMemory - 4) * 15;
    }
    
    // 화면 해상도
    const pixels = screen.width * screen.height * (window.devicePixelRatio || 1);
    if (pixels > 2000000) score -= 20; // 고해상도는 성능 부담
    
    // 브라우저별 보정
    const browser = this.getBrowser();
    if (browser === 'Chrome') score += 10;
    else if (browser === 'Safari') score += 5;
    else if (browser === 'Firefox') score += 0;
    else score -= 10;
    
    // 모바일 디바이스 보정
    if (this.isMobile()) score -= 30;
    if (this.isIOS()) score += 10; // iOS는 일반적으로 최적화가 좋음
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * 게임 호환성 검사
   */
  checkCompatibility() {
    const issues = [];
    const recommendations = [];
    
    // 필수 기능 검사
    if (!this.deviceInfo.features.canvas) {
      issues.push('Canvas API not supported');
    }
    
    if (!this.deviceInfo.features.touch && this.isMobile()) {
      issues.push('Touch events not supported on mobile device');
    }
    
    // 권장 사항 검사
    if (this.deviceInfo.screen.width < 320) {
      recommendations.push('Screen width is very small, consider larger viewport');
    }
    
    if (this.estimatePerformance() < 50) {
      recommendations.push('Device performance may be insufficient for smooth gameplay');
    }
    
    if (this.deviceInfo.connection?.effectiveType === 'slow-2g' || 
        this.deviceInfo.connection?.effectiveType === '2g') {
      recommendations.push('Slow network detected, consider reducing asset sizes');
    }
    
    // iOS 버전 체크
    if (this.isIOS()) {
      const version = this.userAgent.match(/OS (\d+)_/)?.[1];
      if (version && parseInt(version) < 14) {
        issues.push('iOS version is too old (requires iOS 14+)');
      }
    }
    
    // Android 버전 체크
    if (this.isAndroid()) {
      const version = this.userAgent.match(/Android (\d+)/)?.[1];
      if (version && parseInt(version) < 5) {
        issues.push('Android version is too old (requires Android 5.0+)');
      }
    }
    
    return {
      compatible: issues.length === 0,
      issues,
      recommendations,
      performanceScore: this.estimatePerformance()
    };
  }

  /**
   * 디바이스 정보를 로그로 출력
   */
  logDeviceInfo() {
    Logger.info('Device Information:', {
      device: `${this.deviceInfo.platform} (${this.deviceInfo.isMobile ? 'Mobile' : 'Desktop'})`,
      browser: `${this.deviceInfo.browser} ${this.deviceInfo.browserVersion}`,
      screen: `${this.deviceInfo.screen.width}x${this.deviceInfo.screen.height} @${this.deviceInfo.screen.pixelRatio}x`,
      viewport: `${this.deviceInfo.viewport.width}x${this.deviceInfo.viewport.height}`,
      features: Object.entries(this.deviceInfo.features)
        .filter(([, supported]) => supported)
        .map(([feature]) => feature)
        .join(', '),
      performance: `${this.estimatePerformance()}/100`
    });
  }

  /**
   * 정적 메서드들
   */
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new DeviceDetector();
    }
    return this.instance;
  }

  static isSupported() {
    const detector = this.getInstance();
    const compatibility = detector.checkCompatibility();
    return compatibility.compatible;
  }

  static getDeviceInfo() {
    return this.getInstance().deviceInfo;
  }

  static logInfo() {
    this.getInstance().logDeviceInfo();
  }
}

// 전역 접근을 위한 할당
window.DeviceDetector = DeviceDetector;

// 디버그 모드에서 자동으로 디바이스 정보 로그
if (window.CONFIG?.DEBUG?.ENABLED) {
  document.addEventListener('DOMContentLoaded', () => {
    DeviceDetector.logInfo();
  });
}