# Coffee Chat Bot - 개발 계획

> 이 문서는 완료된 기능과 향후 추가할 기능들을 정리합니다.

---

## ✅ 완료된 기능 (MVP)

### 핵심 기능

#### B-1: 자동 매칭
**상태**: ✅ 완료 (2026-01-26)

**구현 내용**:
- GitHub Actions를 통한 2주마다 자동 실행
- cron 스케줄: 매주 월요일 UTC 00:00 (KST 09:00)
- 짝수 주차에만 실행 (홀수 주는 skip)
- `workflow_dispatch`로 수동 트리거 가능

**구현 파일**:
- `.github/workflows/match.yml`
- `src/matcher.ts` - `createMatches()`

#### B-2: 매칭 발표
**상태**: ✅ 완료 (2026-01-26)

**구현 내용**:
- Discord Webhook으로 매칭 결과 채널에 공지
- 참여자 멘션 포함 (`<@user_id>`)
- 3인조 표시 자동 추가

**구현 파일**:
- `src/webhook.ts` - `announceMatches()`

**메시지 포맷**:
```
☕ **이번 커피챗 매칭 발표!**

1. @user1 ↔ @user2
2. @user3 ↔ @user4
3. @user5 ↔ @user6 ↔ @user7 (3인조)

2주 안에 커피챗을 진행해주세요! ☕
```

#### B-3: 중복 매칭 방지
**상태**: ✅ 완료 (2026-01-26)

**구현 내용**:
- `data/history.json`에서 최근 4회 매칭 이력 참조
- 같은 조합이 나오면 재셔플 (최대 100번 시도)
- Fisher-Yates 셔플 알고리즘 사용

**구현 파일**:
- `src/matcher.ts` - `getRecentPairs()`, `shuffle()`

**데이터 구조**:
```json
{
  "matches": [
    {
      "date": "2026-01-26",
      "pairs": [
        ["user_id_1", "user_id_2"],
        ["user_id_3", "user_id_4"]
      ]
    }
  ]
}
```

#### B-4: 홀수 처리
**상태**: ✅ 완료 (2026-01-26)

**구현 내용**:
- 참여자가 홀수일 경우 마지막 조를 3인 1조로 구성
- 마지막 사람을 마지막 조에 추가

**구현 파일**:
- `src/matcher.ts` - `createMatches()` 마지막 로직

---

### 인프라 & CI/CD

#### GitHub Actions 자동화
**상태**: ✅ 완료 (2026-01-26)

**구현 내용**:
- 매칭 자동 실행 워크플로우
- 매칭 후 `data/history.json` 변경사항을 자동 PR 생성
- Biome 자동 포맷팅 추가 (2026-02-01)

**구현 파일**:
- `.github/workflows/match.yml`
- `.github/workflows/ci.yml`

#### CI 파이프라인
**상태**: ✅ 완료 (2026-01-26)

**구현 내용**:
- TypeScript 타입 체크 (`tsc --noEmit`)
- Biome lint & format 체크
- Bun 테스트 실행
- PR 및 main push 시 자동 실행

**구현 파일**:
- `.github/workflows/ci.yml`
- `biome.json`

---

### 기술 스택

| 항목 | 선택 | 완료일 |
|------|------|--------|
| 런타임 | Bun | 2026-01-26 |
| 언어 | TypeScript | 2026-01-26 |
| 데이터 저장 | JSON 파일 | 2026-01-26 |
| 매칭 실행 | GitHub Actions (cron) | 2026-01-26 |
| 결과 발표 | Discord Webhook | 2026-01-26 |
| 참여자 관리 | `/coffee join/leave` (Cloudflare Worker) | 2026-02-08 |
| 코드 품질 | Biome (lint + format) | 2026-01-26 |

---

### 환경변수

| 환경변수 | 타입 | 용도 |
|----------|------|------|
| `DISCORD_BOT_TOKEN` | Secret | Discord Bot 토큰 (Role 멤버 조회) |
| `DISCORD_WEBHOOK_URL` | Secret | 매칭 결과 발표용 Webhook |
| `DISCORD_SERVER_ID` | Variable | 디스코드 서버 ID |
| `DISCORD_ROLE_ID` | Variable | 커피챗 참여자 Role ID |

---

## 📋 Post-MVP 기능

### 1. 사용자 기능

#### U-1: 커피챗 참여 신청
**상태**: ✅ 완료 (2026-02-08)

**구현 내용**:
- `/coffee join` 슬래시 명령어로 커피챗 Role 자동 부여
- Cloudflare Workers + Discord HTTP Interactions Endpoint 방식 (상시 서버 불필요)
- ephemeral 응답으로 본인에게만 확인 메시지 표시

**구현 파일**:
- `worker/src/handlers.ts` - `handleJoin()`
- `worker/src/discord-api.ts` - `addRole()`

#### U-2: 커피챗 참여 탈퇴
**상태**: ✅ 완료 (2026-02-08)

**구현 내용**:
- `/coffee leave` 슬래시 명령어로 커피챗 Role 자동 제거
- U-1과 동일한 Cloudflare Workers 인프라 사용

**구현 파일**:
- `worker/src/handlers.ts` - `handleLeave()`
- `worker/src/discord-api.ts` - `removeRole()`

---

### 2. 관리자 기능

#### A-1: 매칭 주기 설정
**설명**: 매칭이 실행되는 주기 및 시간을 관리자가 설정

**현재 제약**:
- 매칭 주기가 2주로 하드코딩됨 (`.github/workflows/match.yml`)
- 변경하려면 GitHub Actions 워크플로우 파일 수정 필요

**향후 구현**:
- 설정 파일 또는 Discord 명령어로 주기 변경
- 예: `/coffee set-schedule weekly` 또는 `/coffee set-schedule biweekly`

---

### 3. 고급 매칭 기능

#### 채널/그룹별 매칭 풀 분리
**설명**: 슬랙 Donut처럼 채널별로 독립적인 매칭 풀 운영

**배경**:
- 디스코드는 슬랙과 달리 채널 멤버십 개념이 없음
- 채널 참여 = 매칭 풀 참여 자동 연동 불가

**구현 방식 (옵션)**:
1. **채널 + Role 연동**: 채널마다 전용 Role 생성
2. **포럼/스레드 활용**: 관심사별 포럼 채널 참여자 매칭
3. **명령어에 채널 지정**: `/coffee join #channel-name`

**데이터 구조 변경**:
```json
{
  "channels": {
    "채널_ID_1": {
      "matches": [...]
    },
    "채널_ID_2": {
      "matches": [...]
    }
  }
}
```

#### 관심사 기반 매칭 알고리즘
**설명**: 직군, 관심사 등 다양한 기준으로 최적의 매칭

**구현 아이디어**:
- 사용자 프로필 등록 (관심사, 직군, 경력 등)
- 가중치 기반 매칭 점수 계산
- 유사도가 낮은 사람끼리 매칭하여 다양성 증진

---

### 4. 피드백 & 품질 개선

#### 커피챗 피드백 수집
**설명**: 커피챗 후기 수집 및 매칭 품질 개선

**구현 방식**:
- 커피챗 2주 후 자동 DM 발송
- 간단한 평점 시스템 (👍/👎 리액션)
- 피드백 데이터를 매칭 알고리즘에 반영

---

### 5. 스케줄링 통합

#### 사용자 프로필 및 가용 시간 등록
**설명**: 사용자 가용 시간(Availability) 등록 및 자동 일정 조율

**기능**:
- 사용자가 선호하는 요일/시간대 등록
- Google Calendar, Outlook 연동
- 매칭 시 양측의 가용 시간 자동 제안

---

### 6. 배포 & 확장

#### 마켓플레이스 공개 배포
**설명**: Discord 마켓플레이스에서 누구나 설치 가능한 오픈소스 봇

**요구사항**:
- 멀티 테넌시 지원 (여러 서버에서 독립적으로 동작)
- 데이터베이스 필요 (JSON 파일로는 한계)
- 안정적인 호스팅 환경

---

## 우선순위

| 순위 | 기능 | 난이도 | 비고 |
|------|------|--------|------|
| 1 | A-1: 매칭 주기 설정 | 쉬움 | 설정 파일만 추가하면 됨 |
| 2 | 채널/그룹별 매칭 풀 | 중간 | 데이터 구조 변경 필요 |
| ~~3~~ | ~~U-1, U-2: 슬래시 명령어~~ | ~~중간~~ | ✅ 완료 (Cloudflare Worker) |
| 4 | 피드백 수집 | 중간 | DM 발송 로직 추가 |
| 5 | 관심사 기반 매칭 | 어려움 | 프로필 시스템 + 알고리즘 개선 |
| 6 | 스케줄링 통합 | 어려움 | 외부 API 연동 |
| 7 | 마켓플레이스 배포 | 어려움 | 멀티 테넌시 + DB + 호스팅 |

---

## 기술 부채

### 현재 제약사항

1. **JSON 파일 기반 저장소**
   - 동시성 제어 없음
   - 스케일링 한계
   - → PostgreSQL/MongoDB로 마이그레이션 필요

2. **GitHub Actions 실행**
   - 실시간 명령어 처리 불가
   - 매칭 주기 변경 시 코드 수정 필요
   - → 상시 실행 봇 + 설정 관리 시스템 필요

3. ~~**Role 수동 관리**~~ → ✅ 해결 (2026-02-08)
   - `/coffee join` / `/coffee leave` 명령어로 자동화 완료
   - Cloudflare Workers로 서버리스 구현

---

## 참고 자료

- 벤치마킹: [Donut (Slack)](https://www.donut.com/)
- Discord API: https://discord.com/developers/docs
- discord.js: https://discord.js.org/
