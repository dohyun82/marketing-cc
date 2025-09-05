# 📋 기능 명세서 - 룰렛 이벤트 시스템

## 🎯 시스템 개요

마케팅팀이 정기적으로 사용자 참여형 이벤트를 관리하고 운영할 수 있는 통합 시스템입니다.

### 핵심 가치 제안
- **마케팅 자율성**: 개발팀 의존 없이 마케팅팀이 직접 이벤트 관리
- **사용자 참여**: 게임화된 인터랙션으로 사용자 참여도 증대
- **운영 효율성**: 수동 지급 방식으로 복잡한 자동화 시스템 배제

## 🏗️ 시스템 구성도

```
[사용자 앱] ←→ [Backend API] ←→ [Database]
     ↑                              ↑
[앱 배너 관리] ←→ [VONE 관리자] ←→ [이벤트 관리]
```

## 📱 사용자 앱 기능 명세

### 1. 이벤트 페이지 접근
**URL 패턴**: `/event/{eventId}?uid={userId}`

**진입점**:
- 앱 내 배너 클릭 → 인앱 웹뷰로 이벤트 페이지 로드
- URL 파라미터로 사용자 식별 및 이벤트 특정

**화면 구성**:
- 헤더: 이벤트 제목 (최대 20자)
- 메인: 참여형 게임 인터페이스
- 푸터: 유의사항 (선택적 표시)

### 2. 참여 자격 검증
**검증 항목**:
- 이벤트 활성 상태 확인
- 이벤트 기간 내 접근 여부
- 사용자 참여 횟수 제한 확인
  - "이벤트 기간 내 1회" (기본값)
  - "1일 1회" (선택 가능)

**예외 처리**:
- 기간 만료: "이벤트가 종료되었습니다"
- 참여 완료: "이미 참여한 이벤트입니다. 당첨 결과: {혜택명}"
- 비활성 이벤트: "현재 진행중인 이벤트가 없습니다"

### 3. 이벤트 참여
**인터랙션 패턴**:
- **복권 긁기 방식**: 스와이프로 결과 노출
- **카드 선택 방식**: 4개 옵션 중 1개 선택
- **음식 선택**: "오늘 먹고 싶은 음식?" 테마

**참여 프로세스**:
1. 참여 버튼 클릭
2. 게임 인터랙션 수행
3. 당첨 로직 실행 (서버)
4. 결과 즉시 표시

### 4. 당첨 결과 표시
**당첨시**:
- 축하 애니메이션
- 혜택명 표시 (예: "스타벅스 아메리카노")
- 지급 안내 텍스트 ("X월 X일에 일괄 지급됩니다")

**꽝인 경우**:
- 격려 메시지 표시
- 다음 이벤트 참여 유도

### 5. 당첨 내역 확인
**기본 동작**:
- 이미 참여한 사용자가 재접근시 당첨 결과 표시
- 이벤트 진행 중에만 확인 가능 (종료 후 미제공)

## 🖥️ VONE 관리자 기능 명세

### 1. 이벤트 목록 관리

**목록 화면**:
```
[검색] [필터: 활성상태] [필터: 진행상태] [신규등록]

| 이벤트ID | 이벤트명 | 활성여부 | 진행상태 | 예산 | 기간 | 등록자 | 액션 |
|----------|----------|----------|----------|------|------|--------|------|
| EVT-001  | 신규입점 | 활성     | 진행중   | 10만 | 9/1~10| 예인  | 상세 |
```

**검색 및 필터**:
- 이벤트명으로 검색
- 활성상태별 필터 (활성/비활성)
- 진행상태별 필터 (진행예정/진행중/종료)
- 등록일, 수정일 기준 정렬

**페이지네이션**: 기존 VONE 컴포넌트 활용

### 2. 이벤트 등록/수정

**기본 정보 섹션**:
```
이벤트명 [_________________] (최대 20자)
이벤트메모 [_________________] (최대 50자, 선택)
활성상태 [🔘 활성] [⚪ 비활성]
예상예산금액 [_________] 원 (선택)
```

**이벤트 설정 섹션**:
```
이벤트 기간
시작일시 [2025-09-01] [09:00]
종료일시 [2025-09-10] [23:59]

참여제한횟수
[🔘 이벤트 기간 내 1회] [⚪ 1일 1회]
```

**유의사항 섹션**:
```
유의사항 사용 [🔘 사용] [⚪미사용]

[리치 에디터]
- 이미지 업로드 지원
- 텍스트 서식 지원 (볼드, 줄바꿈 등)
- 최대 16,000자
```

### 3. 혜택 관리 (별도 탭)

**자동 생성 규칙**:
- 이벤트 생성시 "꽝" 혜택이 당첨확률 100%로 자동 등록
- 관리자가 추가 혜택 등록시 확률 재조정 필요

**혜택 등록 폼**:
```
혜택 타입 [드롭다운: 꽝|포인트|기프티콘|배송상품|기타]
혜택명 [____________________] (최대 20자)
당첨 확률 [___]% 
1일 최대 당첨수량 [____]개
총 당첨수량 [____]개

[+ 혜택 추가] [저장] [삭제]
```

**확률 계산 규칙**:
- 전체 혜택의 당첨 확률 합계 = 100%
- 수량 제한 로직: 1일 최대 ≤ 총 당첨수량
- 수량 소진시 해당 혜택 당첨 불가

### 4. 이벤트 상세/통계

**일반 정보 탭**:
- 등록한 모든 설정값 표시
- 이벤트 페이지 링크 제공 (배너 등록용)
- 등록자, 등록일시, 수정자, 수정일시

**혜택 설정 탭**:
- 등록된 혜택 목록 및 설정
- 실시간 당첨 수량 현황

**참여 통계 탭**:
```
참여율: 61.5% (123/200)
- 참여수: 123회
- 조회수: 200회
- 당첨률: 15.4% (19/123)
```

**당첨자 리스트**:
```
| UID | COMID | 당첨일시 | 당첨혜택 |
|-----|-------|----------|----------|
| user001 | comp01 | 09-01 14:20 | 스벅 아메리카노 |
| user002 | comp01 | 09-01 15:33 | 꽝 |
```

## 🔧 Backend API 명세

### 사용자 앱 API

#### 1. 이벤트 상세 조회
```
GET /api/v1/events/{eventId}
Query: uid={userId}

Response:
{
  "eventId": "EVT-001",
  "title": "신규 입점 기념 이벤트",
  "status": "ACTIVE",
  "period": {
    "startDate": "2025-09-01T00:00:00",
    "endDate": "2025-09-10T23:59:59"
  },
  "participationLimit": "ONCE_PER_EVENT",
  "description": "<p>이벤트 유의사항...</p>",
  "userStatus": {
    "canParticipate": true,
    "participationCount": 0,
    "lastResult": null
  }
}
```

#### 2. 이벤트 참여
```
POST /api/v1/events/{eventId}/participate
Body: {
  "uid": "user001",
  "selectedOption": 1  // 선택형 게임의 경우
}

Response:
{
  "result": "WIN",
  "reward": {
    "type": "GIFTICON",
    "name": "스타벅스 아이스 아메리카노",
    "description": "9월 15일에 일괄 지급됩니다"
  },
  "participationId": "PART-12345"
}
```

#### 3. 참여 결과 조회
```
GET /api/v1/events/{eventId}/result
Query: uid={userId}

Response:
{
  "participated": true,
  "participationDate": "2025-09-01T14:20:33",
  "result": "WIN",
  "reward": {
    "name": "스타벅스 아이스 아메리카노"
  }
}
```

### VONE 관리자 API

#### 1. 이벤트 목록 조회
```
GET /api/v1/admin/events
Query: page=1&size=20&status=ACTIVE&search=이벤트명

Response:
{
  "events": [
    {
      "eventId": "EVT-001",
      "title": "신규 입점 기념",
      "status": "ACTIVE",
      "progress": "IN_PROGRESS",
      "budget": 100000,
      "period": {...},
      "createdBy": "예인",
      "createdAt": "2025-09-01T09:00:00"
    }
  ],
  "pagination": {...}
}
```

#### 2. 이벤트 생성
```
POST /api/v1/admin/events
Body: {
  "title": "신규 입점 기념 이벤트",
  "memo": "9월 신규 브랜드 프로모션",
  "status": "ACTIVE",
  "budget": 100000,
  "startDate": "2025-09-01T00:00:00",
  "endDate": "2025-09-10T23:59:59",
  "participationLimit": "ONCE_PER_EVENT",
  "descriptionEnabled": true,
  "description": "<p>이벤트 상세 설명</p>"
}

Response:
{
  "eventId": "EVT-001",
  "eventUrl": "/event/EVT-001",
  "message": "이벤트가 생성되었습니다"
}
```

#### 3. 혜택 관리
```
POST /api/v1/admin/events/{eventId}/rewards
Body: {
  "type": "GIFTICON",
  "name": "스타벅스 아메리카노",
  "probability": 10,
  "dailyLimit": 5,
  "totalLimit": 20
}
```

#### 4. 통계 조회
```
GET /api/v1/admin/events/{eventId}/statistics

Response:
{
  "views": 200,
  "participations": 123,
  "participationRate": 61.5,
  "winRate": 15.4,
  "rewardStats": [
    {
      "rewardName": "스타벅스 아메리카노",
      "winners": 8,
      "remaining": 12
    }
  ]
}
```

#### 5. 당첨자 목록
```
GET /api/v1/admin/events/{eventId}/winners
Query: page=1&size=50

Response:
{
  "winners": [
    {
      "uid": "user001",
      "comId": "comp01",
      "winDate": "2025-09-01T14:20:33",
      "rewardName": "스타벅스 아메리카노"
    }
  ]
}
```

## 🗃️ 데이터베이스 설계

### 테이블 구조

#### events (이벤트 마스터)
```sql
CREATE TABLE events (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(20) NOT NULL,
  memo VARCHAR(50),
  status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  budget INT DEFAULT 0,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  participation_limit ENUM('ONCE_PER_EVENT', 'ONCE_PER_DAY') DEFAULT 'ONCE_PER_EVENT',
  description_enabled BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_by VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(50),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### event_rewards (이벤트 혜택)
```sql
CREATE TABLE event_rewards (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id VARCHAR(50) NOT NULL,
  reward_type ENUM('NONE', 'POINT', 'GIFTICON', 'DELIVERY', 'ETC') NOT NULL,
  reward_name VARCHAR(20) NOT NULL,
  probability INT NOT NULL,  -- 당첨 확률 (%)
  daily_limit INT NOT NULL,
  total_limit INT NOT NULL,
  current_daily_count INT DEFAULT 0,
  current_total_count INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(event_id)
);
```

#### event_participations (참여 로그)
```sql
CREATE TABLE event_participations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id VARCHAR(50) NOT NULL,
  uid VARCHAR(50) NOT NULL,
  com_id VARCHAR(50) NOT NULL,
  participation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  selected_option INT,  -- 선택형 게임의 경우
  result ENUM('WIN', 'LOSE') NOT NULL,
  reward_id BIGINT,  -- 당첨된 혜택 ID
  reward_name VARCHAR(20),  -- 당첨 혜택명 (스냅샷)
  ip_address VARCHAR(45),
  user_agent TEXT,
  FOREIGN KEY (event_id) REFERENCES events(event_id),
  FOREIGN KEY (reward_id) REFERENCES event_rewards(id),
  INDEX idx_event_uid (event_id, uid),
  INDEX idx_participation_date (participation_date)
);
```

### 핵심 비즈니스 로직

#### 당첨 로직
1. 사용자 참여 자격 검증
2. 현재 가용한 혜택 목록 조회 (수량 제한 고려)
3. 확률 기반 랜덤 추첨
4. 당첨 결과 기록 및 수량 차감
5. 사용자에게 결과 반환

#### 수량 관리
- 일일 수량 리셋: 매일 자정 `current_daily_count = 0`
- 총 수량 관리: `current_total_count`가 `total_limit` 도달시 해당 혜택 제외

#### 참여 제한 관리
- "이벤트 기간 내 1회": `event_id` + `uid` 조합의 중복 체크
- "1일 1회": `event_id` + `uid` + `DATE(participation_date)` 조합 체크

---

**참고**: 이 명세서는 Confluence 요구사항 정의서와 마케팅팀 인터뷰 결과를 바탕으로 작성되었으며, 개발 과정에서 기술적 제약사항에 따라 조정될 수 있습니다.