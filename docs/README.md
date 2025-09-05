# 🎰 룰렛 이벤트 시스템 - 프로젝트 문서

> 마케팅팀의 정기적 사용자 참여형 이벤트 관리를 위한 통합 시스템

## 📋 프로젝트 개요

**프로젝트명**: 마케팅 지원 룰렛 이벤트 기획 및 설계  
**Jira 티켓**: [PROD-19278](https://vendysdev.atlassian.net/browse/PROD-19278)  
**기간**: 2025년 7월 ~ 9월 (약 3개월)  
**목표**: 마케팅팀이 자율적으로 관리 가능한 사용자 참여형 이벤트 시스템 구축

### 🎯 핵심 가치
- **마케팅 자율성**: 개발팀 도움 없이 이벤트 생성/관리
- **사용자 참여**: 게임화된 재미있는 참여 경험  
- **운영 효율성**: 복잡한 자동화보다는 실용적 관리 도구

### 🏗️ 시스템 구성
- **사용자 앱**: 게임형 이벤트 참여 (복권긁기, 카드선택 등)
- **VONE 관리자**: 이벤트 생성/관리, 통계, 당첨자 관리
- **Backend API**: 참여 처리, 당첨 로직, 데이터 관리

## 📁 문서 구조

```
docs/
├── 01-project-overview/          # 프로젝트 개요
│   ├── jira-analysis.md         # Jira 티켓 분석
│   ├── business-requirements.md  # 비즈니스 요구사항  
│   └── stakeholders.md          # 이해관계자 정보
├── 02-requirements/             # 상세 요구사항
│   ├── functional-spec.md       # 기능 명세서 ⭐
│   ├── user-stories.md          # 사용자 스토리
│   └── acceptance-criteria.md   # 승인 기준
├── 03-design-system/            # 디자인 시스템
│   ├── figma-analysis.md        # Figma 분석 ⭐
│   ├── ui-specifications.md     # UI 상세 명세
│   └── user-flows.md            # 사용자 플로우
├── 04-architecture/             # 시스템 설계
│   ├── system-design.md         # 전체 아키텍처
│   ├── database-schema.md       # DB 설계
│   ├── api-design.md            # API 명세
│   └── tech-stack.md            # 기술 스택
├── 05-implementation/           # 구현 계획
│   ├── development-phases.md    # 개발 단계 계획 ⭐
│   ├── frontend-plan.md         # 프론트엔드 구현
│   ├── backend-plan.md          # 백엔드 구현
│   └── integration-plan.md      # 통합 계획
└── 06-management/               # 프로젝트 관리
    ├── timeline.md              # 일정 관리
    ├── risk-management.md       # 리스크 관리
    └── quality-assurance.md     # 품질 관리
```

⭐ = 필수 우선 확인 문서

## 🔗 주요 링크

### 공식 문서
- **Jira 티켓**: https://vendysdev.atlassian.net/browse/PROD-19278
- **Confluence 메인**: https://vendysdev.atlassian.net/wiki/spaces/PROD/pages/4074373160
- **요구사항 정의서**: https://vendysdev.atlassian.net/wiki/spaces/PROD/pages/4074602543
- **Figma 기획서**: https://www.figma.com/design/fhOINZ9nMFfa6TdnK7Syky/SD-Plan?node-id=35398-44755

### 개발 관련
- **플로우차트**: https://www.figma.com/design/fhOINZ9nMFfa6TdnK7Syky/SD-Plan?node-id=36002-21680
- **사용자 UI**: https://www.figma.com/design/fhOINZ9nMFfa6TdnK7Syky/SD-Plan?node-id=35779-21591
- **VONE 프로토타입**: https://stick-legend-12036179.figma.site/

## 👥 프로젝트 팀

### 핵심 이해관계자
- **기획**: 지예인님 (담당자)
- **마케팅**: 조영주님 (요청자)
- **테크리드**: 정보근님 (검토자)

### 개발팀 (9월 투입 예정)
- **프론트엔드**: 
  - 강규석님 (VONE 관리자, 2주)
  - 김도현님 (식권대장 앱, 1.5주)
- **백엔드**: 소재철님 (DB + API, 2.5주)

## 🚀 빠른 시작 가이드

### 1. 개발자라면 먼저 읽어야 할 문서
1. **[기능 명세서](02-requirements/functional-spec.md)** - 전체 시스템 이해
2. **[Figma 분석](03-design-system/figma-analysis.md)** - UI/UX 방향성 파악  
3. **[개발 단계](05-implementation/development-phases.md)** - 구현 계획 및 일정

### 2. 마케팅/기획팀이라면
1. **[Jira 분석](01-project-overview/jira-analysis.md)** - 프로젝트 배경 이해
2. **[비즈니스 요구사항](01-project-overview/business-requirements.md)** - 핵심 목표 확인
3. **[사용자 스토리](02-requirements/user-stories.md)** - 실제 사용 시나리오

### 3. 새로운 팀원이라면
1. 이 README 전체 읽기
2. [기능 명세서](02-requirements/functional-spec.md) 숙지
3. 관련 Confluence 문서 확인
4. 팀과 현재 진행 상황 확인

## 📊 현재 상태 및 다음 단계

### ✅ 완료된 작업 (2025.09.05 기준)
- [x] 프로젝트 기획 및 설계 완료
- [x] 마케팅팀 인터뷰 및 요구사항 수집
- [x] 테크리더 검토 및 기술 방향성 결정
- [x] Figma 기획서 및 플로우차트 완성
- [x] 개발 문서화 체계 구축

### 🔄 진행 예정 (9월 ~ 10월)
- [ ] **9월 1주**: DB 설계 및 구축 (소재철님)
- [ ] **9월 2-3주**: VONE 관리자 개발 (강규석님) 
- [ ] **9월 4주 ~ 10월 1주**: 식권대장 앱 UI (김도현님)
- [ ] **10월 1-2주**: Backend API 개발 (소재철님)
- [ ] **10월 2주**: 통합 테스트 및 배포

### 🎯 목표 달성 지표
- 마케팅팀이 독립적으로 이벤트 생성 가능
- 사용자 참여부터 당첨까지 전 과정 정상 동작  
- 첫 번째 실제 이벤트 성공적 진행

## ⚠️ 중요 참고사항

### 설계 철학
1. **실용성 우선**: 복잡한 기능보다 실제 사용 가능한 핵심 기능
2. **점진적 개선**: 1차 출시 후 피드백 기반 고도화
3. **운영 편의성**: 마케팅팀이 쉽게 사용할 수 있는 인터페이스

### 기술적 제약사항
- 재무/회계 자동화는 1차에서 제외
- 실시간 포인트 지급 대신 수동 일괄 지급
- 복잡한 사용자 세그멘테이션 기능 제외

### 비즈니스 고려사항  
- 이벤트 형태는 브랜드 아이덴티티(식권대장) 반영
- CS 부담 최소화를 위한 명확한 안내 메시지
- 확장성을 고려한 기본 구조 설계

## 🆘 문의 및 지원

### 개발 관련 문의
- **기획**: 지예인님
- **기술**: 해당 담당 개발자에게 직접 문의

### 문서 관련
- 이 문서는 지속적으로 업데이트됩니다
- 오류나 누락사항 발견시 담당자에게 알려주세요
- 새로운 결정사항은 반드시 문서에 반영해주세요

---

**마지막 업데이트**: 2025-09-05  
**문서 작성**: Claude Code 기반 자동 생성  
**관리자**: 프로젝트 담당자