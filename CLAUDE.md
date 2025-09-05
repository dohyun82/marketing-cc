# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 언어 설정
**모든 응답과 설명은 한글로 작성해주세요.**

## Project Overview

**프로젝트명**: 마케팅 지원 룰렛 이벤트 시스템  
**Jira 티켓**: [PROD-19278](https://vendysdev.atlassian.net/browse/PROD-19278)  
**목적**: 마케팅팀이 자율적으로 관리 가능한 사용자 참여형 이벤트 시스템

### 🎯 핵심 비즈니스 목적
- 정기적 마케팅 이벤트를 통한 사용자 참여 유도
- 식품관/복지대장몰 거래액 증대
- 마케팅팀의 독립적 이벤트 관리 역량 확보

### 🏗️ 시스템 구성
- **사용자 앱**: 게임형 이벤트 참여 (복권긁기, 카드선택 등)
- **VONE 관리자**: 이벤트 생성/관리, 통계, 당첨자 관리  
- **Backend API**: 참여 처리, 당첨 로직, 데이터 관리
- **Database**: 이벤트, 혜택, 참여로그 관리

## Development Commands

### Backend (Node.js/Express 예상)
```bash
# 개발 서버 실행
npm run dev

# 테스트 실행  
npm test

# DB 마이그레이션
npm run migrate

# 시딩
npm run seed
```

### Frontend - VONE (React/Vue 예상)
```bash
# 개발 서버
npm run serve

# 빌드
npm run build

# 린트
npm run lint
```

### Frontend - 사용자 앱 (모바일 웹)
```bash
# 개발 서버
npm run dev

# 빌드 (모바일 최적화)
npm run build:mobile

# 애니메이션 테스트
npm run test:animation
```

## Architecture & Structure

### 🗂️ 예상 프로젝트 구조
```
marketing-cc/
├── docs/                    # 프로젝트 문서화
├── backend/                 # Node.js API 서버
│   ├── src/
│   │   ├── controllers/     # API 컨트롤러
│   │   ├── services/        # 비즈니스 로직
│   │   ├── models/          # 데이터베이스 모델
│   │   ├── middleware/      # 인증, 검증 등
│   │   └── utils/           # 유틸리티 함수
│   ├── migrations/          # DB 마이그레이션
│   └── tests/               # 백엔드 테스트
├── frontend-vone/           # VONE 관리자 시스템
│   ├── src/
│   │   ├── components/      # 재사용 컴포넌트
│   │   ├── pages/           # 페이지 컴포넌트
│   │   ├── services/        # API 서비스
│   │   └── utils/           # 유틸리티
│   └── tests/
├── frontend-app/            # 사용자 앱 (모바일 웹)
│   ├── src/
│   │   ├── components/      # 게임 컴포넌트
│   │   ├── animations/      # 애니메이션 로직
│   │   ├── games/           # 게임별 구현체
│   │   └── api/             # API 통신
│   └── tests/
└── shared/                  # 공통 타입, 유틸리티
```

### 🔧 기술 스택 (예상)
- **Backend**: Node.js + Express + MySQL
- **VONE**: 기존 스택 활용 (React/Vue)
- **사용자 앱**: 모바일 웹 (React/Vue + CSS 애니메이션)
- **Database**: MySQL (기존 시스템 연동)
- **Deployment**: 기존 인프라 활용

## Business Logic Patterns

### 🎰 이벤트 참여 로직
```javascript
// 참여 자격 검증 → 당첨 처리 → 결과 반환
async function participateEvent(eventId, userId) {
  // 1. 참여 자격 검증
  const eligibility = await checkEligibility(eventId, userId);
  if (!eligibility.canParticipate) {
    return { error: eligibility.reason };
  }
  
  // 2. 당첨 로직 실행
  const result = await runLottery(eventId);
  
  // 3. 결과 저장 및 반환
  await saveParticipation(eventId, userId, result);
  return { success: true, result };
}
```

### 🎁 당첨 확률 계산
```javascript
// 가중치 기반 랜덤 선택
function selectReward(rewards) {
  const totalProbability = rewards.reduce((sum, r) => sum + r.probability, 0);
  const random = Math.random() * totalProbability;
  
  let current = 0;
  for (const reward of rewards) {
    current += reward.probability;
    if (random <= current) return reward;
  }
}
```

### 📊 수량 관리 패턴
```javascript
// 일일/총 수량 제한 확인
async function checkRewardAvailability(rewardId) {
  const reward = await getReward(rewardId);
  const today = new Date().toDateString();
  
  const dailyCount = await getDailyWinCount(rewardId, today);
  const totalCount = await getTotalWinCount(rewardId);
  
  return {
    available: dailyCount < reward.dailyLimit && totalCount < reward.totalLimit,
    dailyRemaining: reward.dailyLimit - dailyCount,
    totalRemaining: reward.totalLimit - totalCount
  };
}
```

## Development Guidelines

### 🔒 보안 고려사항
- 사용자 인증: 기존 시스템과 연동
- 중복 참여 방지: UID + EventID + Date 조합 검증
- API 호출 제한: Rate limiting 적용
- 당첨 조작 방지: 서버사이드 검증 필수

### 🎨 UI/UX 패턴
- 모바일 우선 반응형 디자인
- 애니메이션은 CSS transition 활용
- 터치 인터랙션 최적화
- 로딩 상태 및 에러 처리 UI

### 📱 모바일 웹 최적화
```css
/* 터치 최적화 */
.game-button {
  min-height: 44px;
  touch-action: manipulation;
}

/* 애니메이션 성능 최적화 */
.scratch-card {
  will-change: transform;
  transform: translateZ(0);
}
```

### 🧪 테스트 전략
- **단위 테스트**: 당첨 로직, 확률 계산
- **통합 테스트**: API 엔드포인트
- **E2E 테스트**: 사용자 참여 플로우
- **부하 테스트**: 동시 참여자 시나리오

## 📋 Key Files & Documentation

### 필수 확인 문서
- **[기능 명세서](docs/02-requirements/functional-spec.md)**: 전체 시스템 이해
- **[개발 단계](docs/05-implementation/development-phases.md)**: 구현 일정 및 담당자
- **[Figma 분석](docs/03-design-system/figma-analysis.md)**: UI/UX 가이드라인

### API 문서
- 사용자 API: 이벤트 조회, 참여, 결과 확인
- 관리자 API: 이벤트 CRUD, 통계, 당첨자 관리
- 인증: 기존 시스템 토큰 활용

### 설정 파일 패턴
```javascript
// config/database.js
module.exports = {
  development: {
    host: process.env.DB_HOST,
    database: 'marketing_events_dev',
    // ... 기존 DB 연결 설정 활용
  }
};

// config/events.js  
module.exports = {
  maxRewardsPerEvent: 6,
  defaultProbability: 100, // 꽝 기본 확률
  participationLimits: {
    ONCE_PER_EVENT: 'event',
    ONCE_PER_DAY: 'daily'
  }
};
```

## 🚨 Important Notes

### 운영 고려사항
- 이벤트는 Ver.2 방식으로 기존 배너 시스템 연동
- 포인트/상품 지급은 수동으로 진행 (자동화 제외)
- 재무/회계 시스템과 연동은 추후 고도화시 적용

### 개발 우선순위
1. **핵심 기능**: 이벤트 참여 및 당첨 로직
2. **관리 기능**: VONE 이벤트 관리 시스템  
3. **통계 기능**: 참여율, 당첨률 등 기본 통계
4. **확장 기능**: 고급 통계, A/B 테스트 등 (추후)

### 성능 목표
- 이벤트 참여 응답속도: 3초 이내
- 동시 사용자: 1,000명 지원
- 가용성: 99.9% 업타임

---

**마지막 업데이트**: 2025-09-05  
**관련 문서**: [프로젝트 README](docs/README.md)