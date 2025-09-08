/**
 * 로깅 시스템
 * 레벨별 로그 출력과 성능 모니터링을 지원합니다.
 */
class Logger {
  static LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  static currentLevel = this.LOG_LEVELS[window.CONFIG?.DEBUG?.LOG_LEVEL] || this.LOG_LEVELS.INFO;
  static isEnabled = window.CONFIG?.DEBUG?.ENABLED || false;
  static logs = []; // 로그 히스토리 저장
  static maxLogs = 100; // 최대 로그 개수

  static debug(...args) {
    if (this.currentLevel <= this.LOG_LEVELS.DEBUG && this.isEnabled) {
      console.debug('🔧 [DEBUG]', ...args);
      this.addToHistory('DEBUG', args);
    }
  }

  static info(...args) {
    if (this.currentLevel <= this.LOG_LEVELS.INFO && this.isEnabled) {
      console.log('ℹ️ [INFO]', ...args);
      this.addToHistory('INFO', args);
    }
  }

  static warn(...args) {
    if (this.currentLevel <= this.LOG_LEVELS.WARN) {
      console.warn('⚠️ [WARN]', ...args);
      this.addToHistory('WARN', args);
    }
  }

  static error(...args) {
    if (this.currentLevel <= this.LOG_LEVELS.ERROR) {
      console.error('❌ [ERROR]', ...args);
      this.addToHistory('ERROR', args);
      
      // 에러는 항상 스택 트레이스 포함
      if (args[0] instanceof Error) {
        console.error('Stack trace:', args[0].stack);
      }
    }
  }

  /**
   * 게임 이벤트 전용 로그
   * @param {string} event - 이벤트명
   * @param {*} data - 이벤트 데이터
   */
  static gameEvent(event, data = null) {
    if (this.isEnabled) {
      console.group(`🎮 Game Event: ${event}`);
      if (data) {
        console.log('Data:', data);
      }
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
      
      this.addToHistory('GAME', { event, data });
    }
  }

  /**
   * 성능 측정 로그
   * @param {string} operation - 작업명
   * @param {number} duration - 소요시간 (ms)
   * @param {*} metadata - 추가 메타데이터
   */
  static performance(operation, duration, metadata = null) {
    if (this.isEnabled && window.CONFIG?.DEBUG?.SHOW_PERFORMANCE) {
      const level = duration > 100 ? 'warn' : 'info';
      const icon = duration > 100 ? '🐌' : '⚡';
      
      console[level](`${icon} Performance: ${operation} took ${duration.toFixed(2)}ms`);
      
      if (metadata) {
        console.log('Metadata:', metadata);
      }
      
      this.addToHistory('PERF', { operation, duration, metadata });
    }
  }

  /**
   * 브릿지 통신 로그
   * @param {string} direction - 'to-app' 또는 'from-app'
   * @param {string} method - 메서드명
   * @param {*} data - 전송 데이터
   */
  static bridge(direction, method, data = null) {
    if (this.isEnabled) {
      const icon = direction === 'to-app' ? '📤' : '📥';
      console.log(`${icon} Bridge ${direction}: ${method}`, data || '');
      
      this.addToHistory('BRIDGE', { direction, method, data });
    }
  }

  /**
   * 터치 이벤트 로그 (디버그 모드에서만)
   * @param {string} type - 터치 타입
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   * @param {*} extra - 추가 정보
   */
  static touch(type, x, y, extra = null) {
    if (this.isEnabled && window.CONFIG?.DEBUG?.SHOW_TOUCH_DEBUG) {
      console.log(`👆 Touch ${type}: (${x.toFixed(0)}, ${y.toFixed(0)})`, extra || '');
    }
  }

  /**
   * 로그 히스토리에 추가
   * @private
   */
  static addToHistory(level, args) {
    this.logs.push({
      timestamp: Date.now(),
      level,
      message: args,
      userAgent: navigator.userAgent
    });
    
    // 최대 로그 개수 유지
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * 로그 히스토리 반환
   * @param {string} level - 필터링할 레벨 (옵션)
   * @returns {Array} 로그 배열
   */
  static getHistory(level = null) {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return this.logs;
  }

  /**
   * 로그를 문자열로 내보내기 (디버깅용)
   * @returns {string} 포맷된 로그 문자열
   */
  static exportLogs() {
    const header = `=== Game Logs Export ===\nTimestamp: ${new Date().toISOString()}\nUser Agent: ${navigator.userAgent}\nEvent ID: ${window.CONFIG?.EVENT?.ID}\n\n`;
    
    const logs = this.logs.map(log => {
      const time = new Date(log.timestamp).toISOString();
      const args = Array.isArray(log.message) ? log.message.join(' ') : JSON.stringify(log.message);
      return `[${time}] ${log.level}: ${args}`;
    }).join('\n');
    
    return header + logs;
  }

  /**
   * 로그 히스토리 초기화
   */
  static clearHistory() {
    this.logs = [];
    this.info('Log history cleared');
  }

  /**
   * 로그 레벨 동적 변경
   * @param {string} level - 새 로그 레벨
   */
  static setLevel(level) {
    if (this.LOG_LEVELS[level] !== undefined) {
      this.currentLevel = this.LOG_LEVELS[level];
      this.info(`Log level changed to: ${level}`);
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  /**
   * 조건부 로그 - 조건이 참일 때만 로그
   * @param {boolean} condition - 조건
   * @param {string} level - 로그 레벨
   * @param {...*} args - 로그 인수
   */
  static logIf(condition, level, ...args) {
    if (condition && this[level]) {
      this[level](...args);
    }
  }
}

// 개발 환경에서 전역 접근 가능하도록 설정
if (window.CONFIG?.DEBUG?.ENABLED) {
  window.Logger = Logger;
  
  // 페이지 언로드시 로그 내보내기 (앱에서 처리)
  // window.addEventListener('beforeunload', () => {
  //   if (Logger.logs.length > 0) {
  //     localStorage.setItem('scratch-game-logs', Logger.exportLogs());
  //   }
  // });
  
  Logger.info('Logger initialized in debug mode');
}

// ES5 호환성을 위한 전역 할당
window.Logger = Logger;