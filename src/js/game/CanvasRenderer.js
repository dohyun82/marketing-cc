/**
 * Canvas 렌더링 클래스
 * HTML5 Canvas를 사용한 스크래치 카드 그래픽 렌더링을 담당합니다.
 */
class CanvasRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    
    // Canvas 설정
    this.width = 0;
    this.height = 0;
    this.pixelRatio = window.devicePixelRatio || 1;
    
    // 렌더링 상태
    this.initialized = false;
    this.backgroundImage = null;
    this.scratchSurface = null;
    this.scratchedPixels = new Set();
    this.totalPixels = 0;
    this.scratchProgress = 0;
    
    // 애니메이션 상태
    this.animationFrame = null;
    this.fadeAnimation = null;
    
    // 성능 최적화
    this.lastProgressCheck = 0;
    this.progressCheckInterval = CONFIG.PERFORMANCE.PROGRESS_CHECK_INTERVAL;
  }

  /**
   * Canvas 초기화
   */
  async initialize() {
    try {
      Logger.debug('CanvasRenderer initializing...');
      
      // Canvas 크기 설정
      this.setupCanvas();
      
      // 배경 이미지 생성
      await this.createBackground();
      
      // 스크래치 표면 생성
      await this.createScratchSurface();
      
      // 초기 렌더링
      this.render();
      
      this.initialized = true;
      Logger.info('CanvasRenderer initialized successfully');
      
    } catch (error) {
      Logger.error('CanvasRenderer initialization failed:', error);
      throw error;
    }
  }

  /**
   * Canvas 크기 및 해상도 설정
   * @private
   */
  setupCanvas() {
    // 컨테이너 크기 가져오기
    const rect = this.canvas.getBoundingClientRect();
    const containerWidth = rect.width || CONFIG.CANVAS.MAX_WIDTH;
    const containerHeight = rect.height || CONFIG.CANVAS.MAX_HEIGHT;
    
    // 실제 크기 계산 (최대 크기 제한)
    this.width = Math.min(containerWidth, CONFIG.CANVAS.MAX_WIDTH);
    this.height = Math.min(containerHeight, CONFIG.CANVAS.MAX_HEIGHT);
    
    // Canvas 디스플레이 크기 설정
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    // 실제 Canvas 크기 설정 (Retina 대응)
    this.canvas.width = this.width * this.pixelRatio;
    this.canvas.height = this.height * this.pixelRatio;
    
    // Context 스케일 조정
    this.ctx.scale(this.pixelRatio, this.pixelRatio);
    
    // 전체 픽셀 수 계산
    this.totalPixels = this.canvas.width * this.canvas.height;
    
    Logger.debug('Canvas setup complete:', {
      displaySize: `${this.width}x${this.height}`,
      actualSize: `${this.canvas.width}x${this.canvas.height}`,
      pixelRatio: this.pixelRatio,
      totalPixels: this.totalPixels
    });
  }

  /**
   * 배경 이미지 생성
   * @private
   */
  async createBackground() {
    // 배경 이미지 캔버스 생성
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = this.canvas.width;
    bgCanvas.height = this.canvas.height;
    const bgCtx = bgCanvas.getContext('2d');
    
    // 배경 그래디언트 생성
    const gradient = bgCtx.createLinearGradient(0, 0, bgCanvas.width, bgCanvas.height);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    
    // 배경 채우기
    bgCtx.fillStyle = gradient;
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    
    // 전체 배경을 녹색으로 변경 (카드 형태 제거)
    bgCtx.fillStyle = '#30B843';
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    
    // 경품 텍스트 - 더 큰 폰트와 명확한 텍스트
    bgCtx.fillStyle = '#ffffff';
    bgCtx.font = `bold ${36 * this.pixelRatio}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'middle';
    
    // 메인 텍스트
    bgCtx.fillText('축하합니다!', bgCanvas.width / 2, bgCanvas.height / 2 - 30 * this.pixelRatio);
    
    // 부제목
    bgCtx.font = `${24 * this.pixelRatio}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    bgCtx.fillText('1만원 상품권', bgCanvas.width / 2, bgCanvas.height / 2 + 30 * this.pixelRatio);
    
    this.backgroundImage = bgCanvas;
    
    Logger.debug('Background created');
  }

  /**
   * 스크래치 표면 생성
   * @private
   */
  async createScratchSurface() {
    // 스크래치 표면 캔버스 생성
    const scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = this.canvas.width;
    scratchCanvas.height = this.canvas.height;
    const scratchCtx = scratchCanvas.getContext('2d');
    
    // 흰색 바탕에 검은색 테두리 스크래치 표면 생성
    scratchCtx.fillStyle = '#ffffff';
    scratchCtx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);
    
    // 검은색 테두리 추가
    scratchCtx.strokeStyle = '#000000';
    scratchCtx.lineWidth = 2 * this.pixelRatio;
    scratchCtx.strokeRect(0, 0, scratchCanvas.width, scratchCanvas.height);
    
    this.scratchSurface = scratchCanvas;
    
    Logger.debug('Scratch surface created');
  }

  /**
   * 스크래치 효과 적용
   * @param {number} x - X 좌표 (Canvas 좌표계)
   * @param {number} y - Y 좌표 (Canvas 좌표계)
   * @param {number} radius - 스크래치 반경
   */
  scratch(x, y, radius = CONFIG.GAME.TOUCH_RADIUS) {
    if (!this.initialized || !this.scratchSurface) {
      return;
    }
    
    const scratchCtx = this.scratchSurface.getContext('2d');
    
    // 픽셀 비율 조정 및 감도 개선을 위한 반경 확대
    const scaledX = x * this.pixelRatio;
    const scaledY = y * this.pixelRatio;
    const scaledRadius = radius * this.pixelRatio * 1.5; // 1.5배 확대로 더 민감하게
    
    // 스크래치 영역을 투명하게 만들기
    scratchCtx.globalCompositeOperation = 'destination-out';
    scratchCtx.beginPath();
    scratchCtx.arc(scaledX, scaledY, scaledRadius, 0, Math.PI * 2);
    scratchCtx.fill();
    
    // 스크래치된 픽셀 추적 (성능 최적화를 위해 간헐적으로 체크)
    const now = performance.now();
    if (now - this.lastProgressCheck > this.progressCheckInterval) {
      this.updateScratchProgress(scaledX, scaledY, scaledRadius);
      this.lastProgressCheck = now;
    }
    
    // 다음 프레임에 렌더링 예약
    this.scheduleRender();
  }

  /**
   * 스크래치 진행률 업데이트
   * @private
   */
  updateScratchProgress(centerX, centerY, radius) {
    try {
      // 스크래치된 영역의 이미지 데이터 가져오기
      const scratchCtx = this.scratchSurface.getContext('2d');
      const imageData = scratchCtx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const data = imageData.data;
      
      // 투명한 픽셀 수 계산
      let transparentPixels = 0;
      for (let i = 3; i < data.length; i += 4) { // 알파 채널만 확인
        if (data[i] === 0) {
          transparentPixels++;
        }
      }
      
      // 진행률 계산
      const newProgress = (transparentPixels / this.totalPixels) * 100;
      
      // 진행률이 증가한 경우에만 업데이트
      if (newProgress > this.scratchProgress) {
        this.scratchProgress = newProgress;
        
        Logger.logIf(
          window.CONFIG?.DEBUG?.SHOW_PROGRESS_DEBUG,
          'debug',
          `Scratch progress: ${this.scratchProgress.toFixed(1)}%`
        );
      }
      
    } catch (error) {
      Logger.warn('Failed to update scratch progress:', error);
    }
  }

  /**
   * 렌더링 예약 (RAF 사용)
   * @private
   */
  scheduleRender() {
    if (this.animationFrame) {
      return; // 이미 예약됨
    }
    
    this.animationFrame = requestAnimationFrame(() => {
      this.render();
      this.animationFrame = null;
    });
  }

  /**
   * Canvas 렌더링
   * @private
   */
  render() {
    if (!this.initialized) {
      return;
    }
    
    // Canvas 클리어
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 배경 이미지 렌더링
    if (this.backgroundImage) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.width, this.height);
    }
    
    // 스크래치 표면 렌더링 (마스크로 작동)
    if (this.scratchSurface) {
      this.ctx.drawImage(this.scratchSurface, 0, 0, this.width, this.height);
    }
  }

  /**
   * 스크래치 표면 페이드 아웃 애니메이션
   * @returns {Promise} 애니메이션 완료 Promise
   */
  async fadeOutScratchSurface() {
    return new Promise((resolve) => {
      if (!this.scratchSurface) {
        resolve();
        return;
      }
      
      const duration = CONFIG.ANIMATION.SCRATCH_FADE_DURATION;
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 이징 함수 적용 (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        // 스크래치 표면의 불투명도 조절
        const scratchCtx = this.scratchSurface.getContext('2d');
        scratchCtx.globalAlpha = 1 - easedProgress;
        
        // 렌더링
        this.render();
        
        if (progress < 1) {
          this.fadeAnimation = requestAnimationFrame(animate);
        } else {
          this.fadeAnimation = null;
          this.scratchSurface = null; // 메모리 정리
          resolve();
        }
      };
      
      this.fadeAnimation = requestAnimationFrame(animate);
    });
  }

  /**
   * 배경에 경품 정보 업데이트
   * @param {Object} reward - 경품 정보
   */
  updateReward(reward) {
    if (!this.backgroundImage || !reward) {
      return;
    }
    
    const bgCtx = this.backgroundImage.getContext('2d');
    
    // 기존 텍스트 영역 클리어
    const cardWidth = this.backgroundImage.width * 0.8;
    const cardHeight = this.backgroundImage.height * 0.6;
    const cardX = (this.backgroundImage.width - cardWidth) / 2;
    const cardY = (this.backgroundImage.height - cardHeight) / 2;
    
    bgCtx.fillStyle = '#ffffff';
    bgCtx.fillRect(cardX, cardY, cardWidth, cardHeight);
    
    // 경품 정보 렌더링
    bgCtx.fillStyle = reward.isWinning ? '#4CAF50' : '#757575';
    bgCtx.font = `bold ${20 * this.pixelRatio}px Arial`;
    bgCtx.textAlign = 'center';
    bgCtx.textBaseline = 'middle';
    
    const centerX = this.backgroundImage.width / 2;
    const centerY = this.backgroundImage.height / 2;
    
    // 경품명
    bgCtx.fillText(reward.name, centerX, centerY - 20 * this.pixelRatio);
    
    // 경품 가치 (당첨인 경우)
    if (reward.isWinning && reward.value > 0) {
      bgCtx.font = `${16 * this.pixelRatio}px Arial`;
      bgCtx.fillText(`${reward.value.toLocaleString()}원`, centerX, centerY + 20 * this.pixelRatio);
    }
    
    // 렌더링 업데이트
    this.render();
    
    Logger.info('Reward updated in background:', reward);
  }

  /**
   * Canvas 리사이즈
   * @param {number} width - 새 너비
   * @param {number} height - 새 높이
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    
    this.setupCanvas();
    
    // 배경과 스크래치 표면 재생성
    this.createBackground().then(() => {
      this.createScratchSurface().then(() => {
        this.render();
      });
    });
    
    Logger.debug('Canvas resized:', { width, height });
  }

  /**
   * 현재 스크래치 진행률 반환
   * @returns {number} 진행률 (0-100)
   */
  getScratchProgress() {
    return this.scratchProgress;
  }

  /**
   * Canvas 상태 확인
   * @returns {boolean} 초기화 완료 여부
   */
  isInitialized() {
    return this.initialized;
  }

  /**
   * Canvas 이미지 데이터 반환 (디버깅용)
   * @returns {string} Data URL
   */
  getImageData() {
    if (!this.initialized) {
      return null;
    }
    
    return this.canvas.toDataURL('image/png');
  }

  /**
   * 리소스 정리
   */
  cleanup() {
    // 애니메이션 프레임 취소
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    if (this.fadeAnimation) {
      cancelAnimationFrame(this.fadeAnimation);
      this.fadeAnimation = null;
    }
    
    // Canvas 클리어
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
    
    // 메모리 정리
    this.backgroundImage = null;
    this.scratchSurface = null;
    this.scratchedPixels.clear();
    
    this.initialized = false;
    
    Logger.debug('CanvasRenderer cleaned up');
  }

  // ========================================
  // 정적 유틸리티 메서드들
  // ========================================

  /**
   * Canvas 지원 여부 확인
   * @returns {boolean} Canvas 지원 여부
   */
  static isSupported() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    } catch (error) {
      return false;
    }
  }

  /**
   * 최적 Canvas 크기 계산
   * @param {HTMLElement} container - 컨테이너 엘리먼트
   * @returns {Object} 최적 크기 { width, height }
   */
  static calculateOptimalSize(container) {
    const rect = container.getBoundingClientRect();
    const aspectRatio = 3 / 4; // 세로가 더 긴 카드 형태
    
    let width = Math.min(rect.width, CONFIG.CANVAS.MAX_WIDTH);
    let height = width / aspectRatio;
    
    if (height > CONFIG.CANVAS.MAX_HEIGHT) {
      height = CONFIG.CANVAS.MAX_HEIGHT;
      width = height * aspectRatio;
    }
    
    return { width: Math.floor(width), height: Math.floor(height) };
  }
}

// 전역 접근을 위한 할당
window.CanvasRenderer = CanvasRenderer;