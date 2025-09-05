# 프론트엔드 구현 가이드

**프로젝트**: 복권 긁기 게임  
**담당자**: 김도현  
**문서 버전**: v1.0  
**작성일**: 2025-09-05

---

## 📋 목차

1. [개발 환경 세팅](#개발-환경-세팅)
2. [프로젝트 구조](#프로젝트-구조)
3. [핵심 컴포넌트](#핵심-컴포넌트)
4. [Canvas 게임 구현](#canvas-게임-구현)
5. [터치 이벤트 처리](#터치-이벤트-처리)
6. [상태 관리](#상태-관리)
7. [UI 컴포넌트](#ui-컴포넌트)
8. [성능 최적화](#성능-최적화)
9. [디버깅 가이드](#디버깅-가이드)
10. [베스트 프랙티스](#베스트-프랙티스)

---

## 개발 환경 세팅

### 🛠️ 필수 도구

```bash
# Node.js 환경 (선택사항)
node --version  # v16+ 권장

# 개발 서버 - VS Code Live Server 확장
code --install-extension ritwickdey.liveserver

# 또는 Python 내장 서버
python -m http.server 3000
```

### 📁 프로젝트 초기화

```bash
# 프로젝트 폴더 생성
mkdir scratch-game
cd scratch-game

# 기본 구조 생성
mkdir -p src/{js/{core,game,ui,utils},css,assets/{images,icons}}
mkdir -p dist test docs

# 기본 파일 생성
touch src/index.html
touch src/js/app.js
touch src/css/styles.css
```

### ⚙️ 개발 도구 설정

#### VS Code 설정 (.vscode/settings.json)
```json
{
  "liveServer.settings.port": 3000,
  "liveServer.settings.root": "/src",
  "liveServer.settings.CustomBrowser": "chrome",
  "html.format.indentInnerHtml": true,
  "css.lint.unknownAtRules": "ignore"
}
```

#### Chrome DevTools 설정
1. **Device Emulation** 활성화
2. **Performance** 패널 모니터링
3. **Console** 에러 추적

---

## 프로젝트 구조

### 📂 완전한 디렉터리 구조

```
scratch-game/
├── src/                          # 개발 소스
│   ├── index.html               # 개발용 메인 HTML
│   ├── js/
│   │   ├── app.js               # 앱 진입점
│   │   ├── config.js            # 설정 상수
│   │   ├── core/                # 핵심 모듈
│   │   │   ├── EventBridge.js   # 앱 통신 인터페이스
│   │   │   ├── EventManager.js  # 이벤트 관리자
│   │   │   └── ErrorHandler.js  # 에러 처리
│   │   ├── game/                # 게임 로직
│   │   │   ├── ScratchGame.js   # 메인 게임 클래스
│   │   │   ├── CanvasRenderer.js # 캔버스 렌더링
│   │   │   ├── TouchHandler.js  # 터치 이벤트
│   │   │   └── GameState.js     # 상태 관리
│   │   ├── ui/                  # UI 컴포넌트
│   │   │   ├── LoadingScreen.js # 로딩 화면
│   │   │   ├── ResultModal.js   # 결과 모달
│   │   │   └── ErrorDisplay.js  # 에러 표시
│   │   └── utils/               # 유틸리티
│   │       ├── DeviceDetector.js # 디바이스 감지
│   │       ├── Logger.js        # 로깅
│   │       └── Utils.js         # 공통 유틸
│   ├── css/
│   │   ├── reset.css            # CSS 리셋
│   │   ├── layout.css           # 레이아웃
│   │   ├── components.css       # 컴포넌트 스타일
│   │   ├── animations.css       # 애니메이션
│   │   └── responsive.css       # 반응형
│   └── assets/
│       ├── images/
│       │   ├── scratch-bg.png   # 복권 배경
│       │   ├── scratch-overlay.png # 스크래치 질감
│       │   └── win-celebrate.gif # 당첨 애니메이션
│       └── icons/
│           ├── loading.svg      # 로딩 아이콘
│           └── error.svg        # 에러 아이콘
├── dist/                        # 배포용 파일
│   └── scratch-game-bundle.html
├── test/                        # 테스트 파일
│   ├── manual-test.html
│   └── device-test-results.md
└── docs/                        # 문서
    └── implementation-notes.md
```

---

## 핵심 컴포넌트

### 🎯 app.js - 진입점

```javascript
// src/js/app.js
class App {
  constructor() {
    this.eventManager = null;
    this.scratchGame = null;
    this.initialized = false;
  }

  async init() {
    try {
      // 디바이스 환경 검사
      if (!DeviceDetector.isSupported()) {
        throw new Error('UNSUPPORTED_DEVICE');
      }

      // 핵심 모듈 초기화
      this.eventManager = new EventManager();
      this.scratchGame = new ScratchGame('#scratch-canvas');
      
      // 이벤트 리스너 등록
      this.setupEventListeners();
      
      // 앱 브릿지 연결
      await this.eventManager.initialize();
      
      this.initialized = true;
      Logger.info('App initialized successfully');
      
    } catch (error) {
      ErrorHandler.handle(error);
    }
  }

  setupEventListeners() {
    // 페이지 언로드 시 정리
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // 백그라운드/포그라운드 전환
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleBackgroundTransition();
      } else {
        this.handleForegroundTransition();
      }
    });
  }

  cleanup() {
    if (this.scratchGame) {
      this.scratchGame.destroy();
    }
    if (this.eventManager) {
      this.eventManager.cleanup();
    }
  }
}

// 앱 시작
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
```

### ⚙️ config.js - 설정 관리

```javascript
// src/js/config.js
const CONFIG = {
  // 게임 설정
  GAME: {
    SCRATCH_THRESHOLD: 50, // 50% 임계점
    TOUCH_RADIUS: 20,      // 터치 반경 (px)
    MIN_SCRATCH_AREA: 100, // 최소 스크래치 영역
    ANIMATION_DURATION: 500 // 애니메이션 시간 (ms)
  },

  // Canvas 설정
  CANVAS: {
    MAX_WIDTH: 375,        // 최대 폭
    MAX_HEIGHT: 667,       // 최대 높이
    BACKGROUND_COLOR: '#f5f5f5'
  },

  // 성능 설정
  PERFORMANCE: {
    RAF_THROTTLE: 16,      // ~60fps
    TOUCH_THROTTLE: 10,    // 터치 이벤트 간격
    MAX_MEMORY_MB: 50      // 최대 메모리 사용량
  },

  // 에러 처리
  ERROR: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,     // 재시도 간격 (ms)
    TIMEOUT: 10000         // 타임아웃 (ms)
  },

  // 개발 설정
  DEBUG: {
    ENABLED: location.hostname === 'localhost',
    LOG_LEVEL: 'INFO',     // DEBUG, INFO, WARN, ERROR
    SHOW_PERFORMANCE: true
  }
};

// 전역 접근
window.CONFIG = CONFIG;
```

---

## Canvas 게임 구현

### 🎮 ScratchGame.js - 메인 게임 클래스

```javascript
// src/js/game/ScratchGame.js
class ScratchGame {
  constructor(canvasSelector) {
    this.canvas = document.querySelector(canvasSelector);
    this.ctx = this.canvas.getContext('2d');
    this.renderer = new CanvasRenderer(this.canvas);
    this.touchHandler = new TouchHandler(this.canvas);
    this.gameState = new GameState();
    
    this.scratchedPixels = 0;
    this.totalPixels = 0;
    this.isActive = false;
    
    this.init();
  }

  init() {
    // 캔버스 초기화
    this.renderer.setupCanvas();
    
    // 터치 이벤트 바인딩
    this.touchHandler.on('touchstart', this.handleTouchStart.bind(this));
    this.touchHandler.on('touchmove', this.handleTouchMove.bind(this));
    this.touchHandler.on('touchend', this.handleTouchEnd.bind(this));
    
    // 초기 이미지 로드
    this.loadAssets();
  }

  async loadAssets() {
    try {
      this.gameState.setState('LOADING');
      
      this.backgroundImage = await this.renderer.loadImage('assets/images/scratch-bg.png');
      this.overlayImage = await this.renderer.loadImage('assets/images/scratch-overlay.png');
      
      this.renderer.drawBackground(this.backgroundImage);
      this.renderer.drawOverlay(this.overlayImage);
      
      this.totalPixels = this.calculateTotalPixels();
      this.gameState.setState('READY');
      
    } catch (error) {
      ErrorHandler.handle(error);
      this.gameState.setState('ERROR');
    }
  }

  handleTouchStart(event) {
    if (this.gameState.current !== 'READY') return;
    
    this.isActive = true;
    this.gameState.setState('PLAYING');
    
    const { x, y } = this.touchHandler.getLocalCoordinates(event);
    this.performScratch(x, y);
  }

  handleTouchMove(event) {
    if (!this.isActive || this.gameState.current !== 'PLAYING') return;
    
    event.preventDefault(); // 스크롤 방지
    
    const { x, y } = this.touchHandler.getLocalCoordinates(event);
    this.performScratch(x, y);
    
    // 진행률 체크 (throttle 적용)
    if (this.shouldCheckProgress()) {
      this.checkProgress();
    }
  }

  handleTouchEnd(event) {
    this.isActive = false;
    this.checkProgress();
  }

  performScratch(x, y) {
    this.renderer.eraseAtPoint(x, y, CONFIG.GAME.TOUCH_RADIUS);
    this.scratchedPixels += this.calculateErasedPixels(x, y);
  }

  shouldCheckProgress() {
    // 성능을 위해 매 프레임마다 체크하지 않음
    return Date.now() - this.lastProgressCheck > 100;
  }

  checkProgress() {
    this.lastProgressCheck = Date.now();
    
    const progress = this.scratchedPixels / this.totalPixels * 100;
    
    if (progress >= CONFIG.GAME.SCRATCH_THRESHOLD) {
      this.complete();
    }
    
    // 진행률 이벤트 발송
    this.onProgress?.(progress);
  }

  complete() {
    if (this.gameState.current === 'COMPLETED') return;
    
    this.gameState.setState('CHECKING');
    this.isActive = false;
    
    // 나머지 영역 자동 제거 애니메이션
    this.renderer.animateComplete(() => {
      // 결과 요청
      EventManager.requestResult();
      this.gameState.setState('COMPLETED');
    });
  }

  // 결과 표시
  showResult(result) {
    this.gameState.setState('RESULT_DISPLAY');
    this.renderer.showResult(result);
  }

  // 리소스 정리
  destroy() {
    this.touchHandler.destroy();
    this.renderer.destroy();
    this.gameState.reset();
  }
}
```

### 🖌️ CanvasRenderer.js - 렌더링 엔진

```javascript
// src/js/game/CanvasRenderer.js
class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.devicePixelRatio = window.devicePixelRatio || 1;
    
    // 렌더링 레이어
    this.layers = {
      background: null,
      overlay: null,
      scratch: null
    };
  }

  setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    
    // 레티나 디스플레이 대응
    this.canvas.width = rect.width * this.devicePixelRatio;
    this.canvas.height = rect.height * this.devicePixelRatio;
    
    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    // GPU 가속 활성화
    this.canvas.style.willChange = 'transform';
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  drawBackground(image) {
    this.ctx.drawImage(
      image, 
      0, 0, 
      this.canvas.width / this.devicePixelRatio, 
      this.canvas.height / this.devicePixelRatio
    );
  }

  drawOverlay(image) {
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(
      image, 
      0, 0, 
      this.canvas.width / this.devicePixelRatio, 
      this.canvas.height / this.devicePixelRatio
    );
  }

  eraseAtPoint(x, y, radius) {
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  animateComplete(callback) {
    let opacity = 1;
    const fadeStep = 0.05;
    
    const fade = () => {
      this.ctx.globalAlpha = opacity;
      opacity -= fadeStep;
      
      if (opacity <= 0) {
        this.ctx.globalAlpha = 1;
        callback?.();
      } else {
        requestAnimationFrame(fade);
      }
    };
    
    fade();
  }

  showResult(result) {
    // 결과 표시 로직
    const text = result.isWinner ? '축하합니다!' : '아쉽지만 다음 기회에!';
    const color = result.isWinner ? '#4CAF50' : '#FF5722';
    
    this.ctx.fillStyle = color;
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      text, 
      this.canvas.width / 2 / this.devicePixelRatio, 
      this.canvas.height / 2 / this.devicePixelRatio
    );
  }

  destroy() {
    // 메모리 정리
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
```

---

## 터치 이벤트 처리

### 👆 TouchHandler.js - 터치 관리

```javascript
// src/js/game/TouchHandler.js
class TouchHandler extends EventEmitter {
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.isTouch = 'ontouchstart' in window;
    this.lastTouchTime = 0;
    this.touchThrottle = CONFIG.PERFORMANCE.TOUCH_THROTTLE;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (this.isTouch) {
      // 터치 이벤트
      this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
      this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
      this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    } else {
      // 마우스 이벤트 (개발용)
      this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
      this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
      this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  onTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    this.emit('touchstart', this.createEventData(touch));
  }

  onTouchMove(event) {
    event.preventDefault();
    
    // 터치 이벤트 쓰로틀링
    const now = Date.now();
    if (now - this.lastTouchTime < this.touchThrottle) return;
    this.lastTouchTime = now;
    
    const touch = event.touches[0];
    this.emit('touchmove', this.createEventData(touch));
  }

  onTouchEnd(event) {
    event.preventDefault();
    this.emit('touchend', this.createEventData(event.changedTouches[0]));
  }

  // 마우스 이벤트 (개발용)
  onMouseDown(event) {
    this.isMouseDown = true;
    this.emit('touchstart', this.createEventData(event));
  }

  onMouseMove(event) {
    if (!this.isMouseDown) return;
    this.emit('touchmove', this.createEventData(event));
  }

  onMouseUp(event) {
    this.isMouseDown = false;
    this.emit('touchend', this.createEventData(event));
  }

  createEventData(event) {
    return {
      clientX: event.clientX,
      clientY: event.clientY,
      timestamp: Date.now()
    };
  }

  getLocalCoordinates(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  destroy() {
    // 모든 이벤트 리스너 제거
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
  }
}

// EventEmitter 구현
class EventEmitter {
  constructor() {
    this.events = {};
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event, data) {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(data));
  }

  off(event, callback) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }
}
```

---

## 상태 관리

### 🔄 GameState.js - 상태 관리자

```javascript
// src/js/game/GameState.js
class GameState {
  constructor() {
    this.current = 'INIT';
    this.previous = null;
    this.listeners = [];
    this.history = [];
    
    // 유효한 상태 전이 정의
    this.validTransitions = {
      'INIT': ['LOADING', 'ERROR'],
      'LOADING': ['READY', 'ERROR'],
      'READY': ['PLAYING', 'ERROR'],
      'PLAYING': ['CHECKING', 'ERROR', 'READY'],
      'CHECKING': ['COMPLETED', 'ERROR'],
      'COMPLETED': ['RESULT_DISPLAY'],
      'RESULT_DISPLAY': ['READY'],
      'ERROR': ['READY', 'INIT']
    };
  }

  setState(newState, data = null) {
    // 상태 전이 유효성 검사
    if (!this.canTransitionTo(newState)) {
      Logger.warn(`Invalid state transition: ${this.current} -> ${newState}`);
      return false;
    }

    const oldState = this.current;
    this.previous = this.current;
    this.current = newState;

    // 히스토리 기록
    this.history.push({
      from: oldState,
      to: newState,
      timestamp: Date.now(),
      data
    });

    // 상태 변경 알림
    this.notifyListeners(oldState, newState, data);
    
    Logger.info(`State transition: ${oldState} -> ${newState}`);
    return true;
  }

  canTransitionTo(newState) {
    const allowedStates = this.validTransitions[this.current];
    return allowedStates && allowedStates.includes(newState);
  }

  onStateChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners(oldState, newState, data) {
    this.listeners.forEach(callback => {
      try {
        callback(oldState, newState, data);
      } catch (error) {
        Logger.error('State listener error:', error);
      }
    });
  }

  reset() {
    this.setState('INIT');
    this.history = [];
  }

  // 상태 기반 UI 업데이트
  getUIState() {
    switch(this.current) {
      case 'LOADING':
        return { showLoading: true, enableTouch: false };
      case 'READY':
        return { showLoading: false, enableTouch: true };
      case 'PLAYING':
        return { showLoading: false, enableTouch: true };
      case 'CHECKING':
        return { showLoading: true, enableTouch: false };
      case 'RESULT_DISPLAY':
        return { showLoading: false, enableTouch: false, showResult: true };
      case 'ERROR':
        return { showLoading: false, enableTouch: false, showError: true };
      default:
        return { showLoading: true, enableTouch: false };
    }
  }
}
```

---

## UI 컴포넌트

### 📺 LoadingScreen.js - 로딩 화면

```javascript
// src/js/ui/LoadingScreen.js
class LoadingScreen {
  constructor() {
    this.element = null;
    this.isVisible = false;
    this.create();
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'loading-screen';
    this.element.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-text">이벤트를 준비하고 있어요...</p>
      </div>
    `;
    
    document.body.appendChild(this.element);
  }

  show(message = '이벤트를 준비하고 있어요...') {
    if (this.isVisible) return;
    
    this.element.querySelector('.loading-text').textContent = message;
    this.element.classList.add('visible');
    this.isVisible = true;
  }

  hide() {
    if (!this.isVisible) return;
    
    this.element.classList.remove('visible');
    this.isVisible = false;
  }

  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
```

### 🏆 ResultModal.js - 결과 모달

```javascript
// src/js/ui/ResultModal.js
class ResultModal {
  constructor() {
    this.element = null;
    this.isVisible = false;
    this.create();
  }

  create() {
    this.element = document.createElement('div');
    this.element.className = 'result-modal';
    this.element.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <div class="result-icon"></div>
        <h2 class="result-title"></h2>
        <p class="result-message"></p>
        <div class="result-reward"></div>
        <button class="result-button">확인</button>
      </div>
    `;
    
    document.body.appendChild(this.element);
    this.setupEventListeners();
  }

  setupEventListeners() {
    const button = this.element.querySelector('.result-button');
    const backdrop = this.element.querySelector('.modal-backdrop');
    
    button.addEventListener('click', () => this.hide());
    backdrop.addEventListener('click', () => this.hide());
  }

  show(result) {
    const content = this.element.querySelector('.modal-content');
    const icon = this.element.querySelector('.result-icon');
    const title = this.element.querySelector('.result-title');
    const message = this.element.querySelector('.result-message');
    const reward = this.element.querySelector('.result-reward');

    if (result.isWinner) {
      // 당첨 UI
      content.className = 'modal-content winner';
      icon.innerHTML = '🎉';
      title.textContent = '축하합니다!';
      message.textContent = '이벤트에 당첨되셨습니다!';
      reward.innerHTML = `
        <div class="reward-info">
          <h3>${result.rewardName}</h3>
          <p>상품 수령 방법은 별도 안내드릴게요!</p>
        </div>
      `;
    } else {
      // 꽝 UI  
      content.className = 'modal-content lose';
      icon.innerHTML = '😢';
      title.textContent = '아쉽지만...';
      message.textContent = '다음 기회에 다시 도전해보세요!';
      reward.innerHTML = `
        <div class="consolation-info">
          <p>더 많은 이벤트가 준비되어 있어요!</p>
        </div>
      `;
    }

    this.element.classList.add('visible');
    this.isVisible = true;
    
    // 애니메이션 효과
    setTimeout(() => {
      content.classList.add('animate');
    }, 100);
  }

  hide() {
    if (!this.isVisible) return;
    
    const content = this.element.querySelector('.modal-content');
    content.classList.remove('animate');
    
    setTimeout(() => {
      this.element.classList.remove('visible');
      this.isVisible = false;
    }, 200);
  }

  destroy() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }
}
```

---

## 성능 최적화

### ⚡ 성능 최적화 체크리스트

#### 1. 렌더링 최적화
```javascript
// 프레임 레이트 모니터링
class PerformanceMonitor {
  constructor() {
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.fps = 0;
  }

  update() {
    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      if (CONFIG.DEBUG.SHOW_PERFORMANCE) {
        console.log(`FPS: ${this.fps}`);
      }
    }
    
    requestAnimationFrame(() => this.update());
  }
}
```

#### 2. 메모리 관리
```javascript
class MemoryManager {
  static checkMemoryUsage() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize / 1024 / 1024;
      const limit = CONFIG.PERFORMANCE.MAX_MEMORY_MB;
      
      if (used > limit) {
        Logger.warn(`Memory usage high: ${used.toFixed(2)}MB`);
        this.cleanup();
      }
    }
  }

  static cleanup() {
    // 가비지 컬렉션 유도
    if (window.gc) {
      window.gc();
    }
    
    // Canvas 메모리 정리
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }
}
```

#### 3. 이미지 최적화
```javascript
class ImageOptimizer {
  static async loadOptimizedImage(src) {
    // WebP 지원 확인
    const supportsWebP = await this.supportsWebP();
    
    if (supportsWebP && src.includes('.png')) {
      const webpSrc = src.replace('.png', '.webp');
      try {
        return await this.loadImage(webpSrc);
      } catch {
        // WebP 로드 실패시 원본 사용
        return await this.loadImage(src);
      }
    }
    
    return await this.loadImage(src);
  }

  static supportsWebP() {
    return new Promise(resolve => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }
}
```

---

## 디버깅 가이드

### 🔍 Logger.js - 로깅 시스템

```javascript
// src/js/utils/Logger.js
class Logger {
  static LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  static currentLevel = this.LOG_LEVELS[CONFIG.DEBUG.LOG_LEVEL] || this.LOG_LEVELS.INFO;

  static debug(...args) {
    if (this.currentLevel <= this.LOG_LEVELS.DEBUG) {
      console.debug('🔧 [DEBUG]', ...args);
    }
  }

  static info(...args) {
    if (this.currentLevel <= this.LOG_LEVELS.INFO) {
      console.log('ℹ️ [INFO]', ...args);
    }
  }

  static warn(...args) {
    if (this.currentLevel <= this.LOG_LEVELS.WARN) {
      console.warn('⚠️ [WARN]', ...args);
    }
  }

  static error(...args) {
    if (this.currentLevel <= this.LOG_LEVELS.ERROR) {
      console.error('❌ [ERROR]', ...args);
    }
  }

  static gameEvent(event, data) {
    if (CONFIG.DEBUG.ENABLED) {
      console.group(`🎮 Game Event: ${event}`);
      console.log('Data:', data);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  }
}
```

### 🛠️ 디버깅 도구

```javascript
// 개발자 도구 확장
if (CONFIG.DEBUG.ENABLED) {
  // 전역 디버깅 객체
  window.GameDebugger = {
    // 상태 확인
    getState() {
      return window.app?.scratchGame?.gameState?.current;
    },
    
    // 강제 완료
    forceComplete() {
      window.app?.scratchGame?.complete();
    },
    
    // 성능 통계
    getPerformanceStats() {
      return {
        fps: window.performanceMonitor?.fps,
        memory: performance.memory?.usedJSHeapSize / 1024 / 1024
      };
    },
    
    // 에러 시뮬레이션
    simulateError(type) {
      const errors = {
        network: new Error('NETWORK_ERROR'),
        bridge: new Error('BRIDGE_ERROR'),
        canvas: new Error('CANVAS_ERROR')
      };
      ErrorHandler.handle(errors[type]);
    }
  };
}
```

---

## 베스트 프랙티스

### ✅ 코딩 컨벤션

#### 1. 파일 구조
- **단일 책임 원칙**: 각 클래스는 하나의 역할만
- **명확한 네이밍**: 파일명과 클래스명 일치
- **의존성 최소화**: 불필요한 import 금지

#### 2. 에러 처리
```javascript
// ❌ 잘못된 예
function riskyFunction() {
  // 에러 처리 없음
  canvas.getContext('2d').drawImage(image, 0, 0);
}

// ✅ 올바른 예  
function safeFunction() {
  try {
    if (!canvas || !image) {
      throw new Error('Missing required resources');
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    
    ctx.drawImage(image, 0, 0);
  } catch (error) {
    ErrorHandler.handle(error);
  }
}
```

#### 3. 성능 고려
```javascript
// ❌ 비효율적
function inefficientScratch(x, y) {
  for (let i = 0; i < 100; i++) {
    ctx.arc(x + i, y + i, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 매번 진행률 체크
  checkProgress();
}

// ✅ 효율적
function efficientScratch(x, y) {
  ctx.beginPath();
  ctx.arc(x, y, CONFIG.GAME.TOUCH_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  
  // 쓰로틀링 적용
  if (Date.now() - lastProgressCheck > 100) {
    checkProgress();
  }
}
```

### 🧪 테스트 가이드

#### 1. 디바이스 테스트
```javascript
// 테스트 체크리스트
const DEVICE_TESTS = [
  'iPhone 12 (iOS 15+) - Safari',
  'iPhone 12 (iOS 15+) - Chrome App WebView', 
  'Galaxy S21 (Android 11+) - Chrome',
  'Galaxy S21 (Android 11+) - Samsung Internet',
  'iPad (iOS 14+) - Safari (선택사항)'
];

// 터치 정확도 테스트
function testTouchAccuracy() {
  const testPoints = [
    {x: 50, y: 50},   // 좌상단
    {x: 325, y: 50},  // 우상단  
    {x: 187, y: 333}, // 중앙
    {x: 50, y: 617},  // 좌하단
    {x: 325, y: 617}  // 우하단
  ];
  
  testPoints.forEach(point => {
    // 실제 터치 좌표와 캔버스 좌표 비교
    console.log(`Test point: ${point.x}, ${point.y}`);
  });
}
```

#### 2. 성능 테스트
```javascript
// 성능 벤치마크
class PerformanceTest {
  static async runScratchTest() {
    const start = performance.now();
    
    // 100번 스크래치 시뮬레이션
    for (let i = 0; i < 100; i++) {
      scratchGame.performScratch(
        Math.random() * 375, 
        Math.random() * 667
      );
    }
    
    const end = performance.now();
    const avg = (end - start) / 100;
    
    console.log(`Average scratch time: ${avg.toFixed(2)}ms`);
    
    // 목표: < 10ms per scratch
    return avg < 10;
  }
}
```

### 📱 배포 전 체크리스트

- [ ] **기능 테스트**
  - [ ] 복권 긁기 동작 확인
  - [ ] 50% 임계점 정확성
  - [ ] 결과 표시 정상 작동
  - [ ] 에러 케이스 처리

- [ ] **성능 테스트**  
  - [ ] 페이지 로드 < 3초
  - [ ] 터치 반응 < 100ms
  - [ ] 메모리 사용량 < 50MB
  - [ ] 60fps 유지

- [ ] **호환성 테스트**
  - [ ] iOS Safari 정상 동작
  - [ ] Android Chrome 정상 동작
  - [ ] 다양한 화면 크기 대응

- [ ] **배포 준비**
  - [ ] 번들 크기 < 200KB
  - [ ] 이미지 최적화 완료
  - [ ] 디버그 모드 비활성화

---

## 📚 관련 문서

- [메인 아키텍처](../architecture/scratch-game-architecture.md)
- [앱-웹 브릿지 API](../api/bridge-interface.md)
- [S3 배포 가이드](../deployment/s3-deployment-guide.md)

---

**문서 히스토리**

| 버전 | 날짜 | 변경사항 | 작성자 |
|------|------|----------|--------|
| v1.0 | 2025-09-05 | 초기 구현 가이드 작성 | 김도현 |