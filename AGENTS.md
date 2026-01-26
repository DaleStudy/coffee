# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

디스코드 서버 멤버들을 자동으로 매칭하여 커피챗(1:1 대화)을 연결해주는 봇입니다. GitHub Actions로 2주마다 자동 실행되며, Discord Role 기반으로 참여자를 관리합니다.

## Development Commands

```bash
# 매칭 실행 (로컬 테스트)
bun run match

# 테스트 실행
bun test

# 타입 체크
bun run typecheck

# Lint 체크
bun run lint

# 코드 포맷팅
bun run format
```

## Architecture

### 실행 흐름 (src/index.ts)

1. **참여자 조회** (`discord.ts`) - Discord API로 특정 Role을 가진 멤버 목록 가져오기
2. **매칭 이력 로드** (`matcher.ts`) - `data/history.json`에서 과거 매칭 기록 로드
3. **매칭 생성** (`matcher.ts`) - Fisher-Yates 셔플 + 중복 방지 알고리즘
4. **이력 저장** (`matcher.ts`) - 새로운 매칭을 history.json에 추가
5. **Discord 발표** (`webhook.ts`) - Webhook으로 매칭 결과 채널에 공지

### 핵심 알고리즘 (matcher.ts)

- **중복 방지**: 최근 4회 매칭 이력과 비교하여 같은 조합 회피 (최대 100번 재시도)
- **홀수 처리**: 참여자가 홀수일 경우 마지막 조를 3인 1조로 구성
- **데이터 구조**: `data/history.json`에 날짜별 매칭 기록 저장

### 환경변수

**Secrets** (GitHub Secrets에 저장):

- `DISCORD_BOT_TOKEN` - Discord Bot 토큰 (Role 멤버 조회용)
- `DISCORD_WEBHOOK_URL` - 매칭 결과 발표용 Webhook URL

**Variables** (GitHub Variables에 저장):

- `DISCORD_SERVER_ID` - 디스코드 서버 ID
- `DISCORD_ROLE_ID` - 커피챗 참여자 Role ID

### GitHub Actions 자동화

`.github/workflows/match.yml`:

- **스케줄**: 매주 월요일 UTC 00:00 (KST 09:00)
- **격주 실행**: 짝수 주에만 매칭 실행 (홀수 주는 skip)
- **수동 실행**: `workflow_dispatch`로 언제든지 수동 트리거 가능
- **이력 관리**: 매칭 후 `data/history.json` 변경사항을 PR로 자동 생성

## Code Style

- **Runtime**: Bun (TypeScript 네이티브 지원)
- **Formatter**: Biome (tab indent, recommended rules)
- **Testing**: Bun test (`*.test.ts` 파일)
- **Import**: ESM (`type: "module"`)

## Testing

테스트 파일은 `*.test.ts` 형식으로 작성하며, Bun의 test runner를 사용합니다.

```typescript
// expect().toBeDefined() 후 non-null assertion 사용 패턴
expect(capturedBody).toBeDefined();
const parsed = JSON.parse(capturedBody!); // OK in tests
```

이 패턴 때문에 `biome.json`에서 `noNonNullAssertion` 규칙이 비활성화되어 있습니다.
