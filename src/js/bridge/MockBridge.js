/**
 * Mock 브릿지 구현체
 * 개발 환경에서 앱의 네이티브 브릿지를 시뮬레이션합니다.
 */
class MockBridge {
  constructor() {
    this.enabled = window.CONFIG?.BRIDGE?.MOCK_ENABLED || false;
    this.scenarios = window.CONFIG?.BRIDGE?.MOCK_SCENARIOS || {};
    this.delays = window.CONFIG?.BRIDGE?.MOCK_DELAYS || { min: 300, max: 1500 };
    
    // 모킹 데이터 초기화
    this.initializeMockData();
  }

  /**
   * 모킹 데이터 초기화
   * @private
   */
  initializeMockData() {
    // 기본 이벤트 데이터
    const baseEventData = {
      title: '복권 긁기 이벤트',
      description: '최대 10만원 상품권을 받아보세요!',
      status: 'active',
      startDate: '2025-09-01T00:00:00Z',
      endDate: '2025-09-30T23:59:59Z',
      participationLimit: 'ONCE_PER_DAY',
      rewards: [
        { id: 'reward-1', name: '10만원 상품권', value: 100000, probability: 1 },
        { id: 'reward-2', name: '5만원 상품권', value: 50000, probability: 2 },
        { id: 'reward-3', name: '1만원 상품권', value: 10000, probability: 10 },
        { id: 'reward-4', name: '5천원 상품권', value: 5000, probability: 20 },
        { id: 'reward-5', name: '꽝', value: 0, probability: 967 } // 96.7%
      ]
    };

    // 여러 이벤트 ID 패턴을 지원하도록 설정
    this.eventData = {};
    
    // 개발용 기본 이벤트들
    const eventIds = [
      'sample-event-001',
      '{{EVENT_ID}}', // 템플릿 ID
      'default-event', // 기본 이벤트 ID
      'dev-test-event' // 개발 테스트용
    ];
    
    eventIds.forEach(eventId => {
      this.eventData[eventId] = {
        ...baseEventData,
        eventId: eventId
      };
    });

    this.participationHistory = new Map();
    this.currentUser = {
      userId: 'mock-user-001',
      userName: '테스트 사용자',
      deviceId: 'mock-device-001'
    };
  }

  /**
   * 메시지 처리 (EventBridge에서 호출)
   * @param {Object} message - 브릿지 메시지
   */
  async handleMessage(message) {
    const { method, data, callbackId } = message;
    
    try {
      // 시나리오별 지연 시간 적용
      await this.simulateDelay();
      
      // 시나리오 기반 에러 처리
      const errorScenario = this.shouldReturnError(method);
      if (errorScenario) {
        this.sendError(callbackId, errorScenario);
        return;
      }

      // 메서드별 처리
      let result;
      switch (method) {
        case 'getEventInfo':
          result = this.handleGetEventInfo(data);
          break;
        case 'checkParticipation':
          result = this.handleCheckParticipation(data);
          break;
        case 'submitParticipation':
          result = this.handleSubmitParticipation(data);
          break;
        case 'confirmResult':
          result = this.handleConfirmResult(data);
          break;
        case 'closeGame':
          result = this.handleCloseGame(data);
          break;
        case 'reportError':
          result = this.handleReportError(data);
          break;
        case 'sendLogs':
          result = this.handleSendLogs(data);
          break;
        case 'sendDeviceInfo':
          result = this.handleSendDeviceInfo(data);
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      this.sendSuccess(callbackId, result);
      
    } catch (error) {
      Logger.error(`MockBridge error for ${method}:`, error);
      this.sendError(callbackId, error.message);
    }
  }

  /**
   * 시뮬레이션 지연 시간 적용
   * @private
   */
  async simulateDelay() {
    const delay = Math.random() * (this.delays.max - this.delays.min) + this.delays.min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 에러 시나리오 판단
   * @private
   */
  shouldReturnError(method) {
    if (!this.enabled) return false;
    
    const random = Math.random();
    
    if (random < this.scenarios.networkError) {
      return 'NETWORK_ERROR';
    }
    
    if (method === 'checkParticipation' && random < this.scenarios.alreadyParticipated) {
      return 'ALREADY_PARTICIPATED';
    }
    
    if (random < this.scenarios.eventEnded) {
      return 'EVENT_ENDED';
    }
    
    return false;
  }

  /**
   * 성공 응답 전송
   * @private
   */
  sendSuccess(callbackId, result) {
    setTimeout(() => {
      window.handleBridgeCallback(callbackId, result, null);
    }, 10);
  }

  /**
   * 에러 응답 전송
   * @private
   */
  sendError(callbackId, errorType) {
    const errorMessages = {
      'NETWORK_ERROR': '네트워크 연결을 확인해주세요.',
      'ALREADY_PARTICIPATED': '이미 참여하신 이벤트입니다.',
      'EVENT_ENDED': '종료된 이벤트입니다.',
      'INVALID_EVENT': '유효하지 않은 이벤트입니다.',
      'SYSTEM_ERROR': '시스템 오류가 발생했습니다.'
    };

    setTimeout(() => {
      window.handleBridgeCallback(callbackId, null, errorMessages[errorType] || errorType);
    }, 10);
  }

  // ========================================
  // API 메서드별 처리 핸들러들
  // ========================================

  /**
   * 이벤트 정보 조회
   * @private
   */
  handleGetEventInfo(data) {
    const { eventId } = data;
    const eventInfo = this.eventData[eventId];
    
    if (!eventInfo) {
      throw new Error('INVALID_EVENT');
    }

    return {
      success: true,
      event: eventInfo,
      currentTime: new Date().toISOString()
    };
  }

  /**
   * 참여 자격 확인
   * @private
   */
  handleCheckParticipation(data) {
    const { eventId } = data;
    const userId = this.currentUser.userId;
    const today = new Date().toDateString();
    
    const eventInfo = this.eventData[eventId];
    if (!eventInfo) {
      throw new Error('INVALID_EVENT');
    }

    // 참여 이력 확인
    const participationKey = `${userId}-${eventId}-${today}`;
    const hasParticipated = this.participationHistory.has(participationKey);
    
    return {
      success: true,
      canParticipate: !hasParticipated,
      reason: hasParticipated ? 'ALREADY_PARTICIPATED_TODAY' : null,
      user: this.currentUser,
      remainingAttempts: hasParticipated ? 0 : 1
    };
  }

  /**
   * 게임 참여 처리
   * @private
   */
  handleSubmitParticipation(data) {
    const { eventId, gameData } = data;
    const userId = this.currentUser.userId;
    const today = new Date().toDateString();
    
    const eventInfo = this.eventData[eventId];
    if (!eventInfo) {
      throw new Error('INVALID_EVENT');
    }

    // 중복 참여 체크
    const participationKey = `${userId}-${eventId}-${today}`;
    if (this.participationHistory.has(participationKey)) {
      throw new Error('ALREADY_PARTICIPATED');
    }

    // 당첨 결과 계산
    const result = this.calculateReward(eventInfo.rewards);
    
    // 참여 이력 저장
    const participationRecord = {
      userId,
      eventId,
      gameData,
      result,
      timestamp: new Date().toISOString()
    };
    
    this.participationHistory.set(participationKey, participationRecord);
    
    Logger.info('Mock participation recorded:', participationRecord);
    
    return {
      success: true,
      result: {
        participationId: `participation-${Date.now()}`,
        reward: result,
        timestamp: participationRecord.timestamp
      }
    };
  }

  /**
   * 당첨 결과 계산
   * @private
   */
  calculateReward(rewards) {
    const totalProbability = rewards.reduce((sum, reward) => sum + reward.probability, 0);
    const random = Math.random() * totalProbability;
    
    let currentProbability = 0;
    for (const reward of rewards) {
      currentProbability += reward.probability;
      if (random <= currentProbability) {
        return {
          id: reward.id,
          name: reward.name,
          value: reward.value,
          isWinning: reward.value > 0
        };
      }
    }
    
    // 기본값: 꽝
    return rewards.find(r => r.value === 0) || rewards[rewards.length - 1];
  }

  /**
   * 결과 확인 완료
   * @private
   */
  handleConfirmResult(data) {
    const { eventId, result } = data;
    
    Logger.info('Result confirmed:', { eventId, result });
    
    return {
      success: true,
      message: 'Result confirmed successfully'
    };
  }

  /**
   * 게임 닫기
   * @private
   */
  handleCloseGame(data) {
    Logger.info('Game close requested');
    
    // 실제 환경에서는 앱이 WebView를 닫음
    if (window.CONFIG?.DEBUG?.ENABLED) {
      alert('게임이 종료됩니다. (Mock)');
    }
    
    return {
      success: true,
      message: 'Game will be closed'
    };
  }

  /**
   * 에러 보고
   * @private
   */
  handleReportError(data) {
    const { errorType, errorMessage, errorData } = data;
    
    Logger.error('Error reported to app:', { errorType, errorMessage, errorData });
    
    return {
      success: true,
      message: 'Error report received'
    };
  }

  /**
   * 로그 전송
   * @private
   */
  handleSendLogs(data) {
    const { logs } = data;
    
    Logger.info(`${logs.length} logs sent to app`);
    
    return {
      success: true,
      message: `${logs.length} logs processed`
    };
  }

  /**
   * 디바이스 정보 전송
   * @private
   */
  handleSendDeviceInfo(data) {
    Logger.info('Device info sent to app:', data);
    
    return {
      success: true,
      message: 'Device info received'
    };
  }

  // ========================================
  // 개발용 유틸리티 메서드들
  // ========================================

  /**
   * 모킹 시나리오 변경
   * @param {string} scenario - 시나리오 이름
   * @param {number} probability - 확률 (0-1)
   */
  setScenarioProbability(scenario, probability) {
    this.scenarios[scenario] = probability;
    Logger.info(`MockBridge scenario updated: ${scenario} = ${probability}`);
  }

  /**
   * 참여 이력 초기화
   */
  clearParticipationHistory() {
    this.participationHistory.clear();
    Logger.info('MockBridge participation history cleared');
  }

  /**
   * 사용자 정보 변경
   * @param {Object} userInfo - 새 사용자 정보
   */
  setCurrentUser(userInfo) {
    this.currentUser = { ...this.currentUser, ...userInfo };
    Logger.info('MockBridge current user updated:', this.currentUser);
  }

  /**
   * 이벤트 데이터 업데이트
   * @param {string} eventId - 이벤트 ID
   * @param {Object} eventData - 새 이벤트 데이터
   */
  updateEventData(eventId, eventData) {
    this.eventData[eventId] = { ...this.eventData[eventId], ...eventData };
    Logger.info(`MockBridge event data updated: ${eventId}`);
  }

  /**
   * 현재 설정 정보 반환
   * @returns {Object} 현재 MockBridge 설정
   */
  getStatus() {
    return {
      enabled: this.enabled,
      scenarios: this.scenarios,
      delays: this.delays,
      participationCount: this.participationHistory.size,
      currentUser: this.currentUser,
      availableEvents: Object.keys(this.eventData)
    };
  }
}

// 전역 접근을 위한 할당
window.MockBridge = MockBridge;

// 개발 환경에서 자동 초기화
if (window.CONFIG?.DEBUG?.ENABLED) {
  const mockBridge = new MockBridge();
  window.mockBridge = mockBridge;
  
  // 개발자 콘솔 유틸리티 추가
  window.mockUtils = {
    // 시나리오 테스트
    testNetworkError: () => mockBridge.setScenarioProbability('networkError', 1),
    testAlreadyParticipated: () => mockBridge.setScenarioProbability('alreadyParticipated', 1),
    testEventEnded: () => mockBridge.setScenarioProbability('eventEnded', 1),
    resetScenarios: () => {
      mockBridge.scenarios = window.CONFIG?.BRIDGE?.MOCK_SCENARIOS || {};
      Logger.info('MockBridge scenarios reset to default');
    },
    
    // 참여 이력 관리
    clearHistory: () => mockBridge.clearParticipationHistory(),
    
    // 상태 확인
    status: () => mockBridge.getStatus()
  };
  
  Logger.info('MockBridge initialized with dev utilities');
}