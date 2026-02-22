# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

디스코드 서버 멤버들을 자동으로 매칭하여 커피챗(1:1 대화)을 연결해주는 봇입니다. GitHub Actions로 2주마다 자동 실행되며, Discord Role 기반으로 참여자를 관리합니다. `/coffee join`과 `/coffee leave` 슬래시 명령어로 사용자가 직접 참여/탈퇴할 수 있으며, Cloudflare Workers로 서버리스 처리됩니다.

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

# Worker 로컬 개발
bun run worker:dev

# Worker 배포
bun run worker:deploy

# 슬래시 명령어 등록
bun run worker:register
```

## Architecture

### 매칭 실행 흐름 (src/index.ts)

1. **참여자 조회** (`discord.ts`) - Discord API로 특정 Role을 가진 멤버 목록 가져오기
2. **매칭 이력 로드** (`matcher.ts`) - `data/history.json`에서 과거 매칭 기록 로드
3. **매칭 생성** (`matcher.ts`) - Fisher-Yates 셔플 + 중복 방지 알고리즘
4. **이력 저장** (`matcher.ts`) - 새로운 매칭을 history.json에 추가
5. **Discord 발표** (`webhook.ts`) - Webhook으로 매칭 결과 채널에 공지

### 슬래시 명령어 처리 흐름 (worker/src/index.ts)

1. **서명 검증** (`verify.ts`) - Discord 요청의 Ed25519 서명 검증
2. **PING/PONG** - Discord 연결 확인 응답
3. **명령어 라우팅** (`handlers.ts`) - `/coffee join` 또는 `/coffee leave` 처리
4. **Role 관리** (`discord-api.ts`) - Discord REST API로 Role 추가/제거

### 핵심 알고리즘 (matcher.ts)

- **중복 방지**: 최근 4회 매칭 이력과 비교하여 같은 조합 회피 (최대 100번 재시도)
- **홀수 처리**: 참여자가 홀수일 경우 마지막 조를 3인 1조로 구성
- **데이터 구조**: `data/history.json`에 날짜별 매칭 기록 저장

### 환경변수

**매칭 (GitHub Actions)**:

- `DISCORD_BOT_TOKEN` - Discord Bot 토큰 (Secret)
- `DISCORD_WEBHOOK_URL` - 매칭 결과 발표용 Webhook URL (Secret)
- `DISCORD_SERVER_ID` - 디스코드 서버 ID (Variable)
- `DISCORD_ROLE_ID` - 커피챗 참여자 Role ID (Variable)

**Worker (Cloudflare)**:

- `DISCORD_PUBLIC_KEY` - 서명 검증용 공개키 (wrangler.jsonc var)
- `DISCORD_APPLICATION_ID` - Discord 앱 ID (wrangler.jsonc var)
- `DISCORD_SERVER_ID` - 서버 ID (wrangler.jsonc var)
- `DISCORD_ROLE_ID` - 커피챗 Role ID (wrangler.jsonc var)
- `DISCORD_BOT_TOKEN` - Bot 토큰 (wrangler secret)

### GitHub Actions 자동화

`.github/workflows/match.yml`:

- **스케줄**: 매주 월요일 UTC 00:00 (KST 09:00)
- **격주 실행**: 짝수 주에만 매칭 실행 (홀수 주는 skip)
- **수동 실행**: `workflow_dispatch`로 언제든지 수동 트리거 가능
- **이력 관리**: 매칭 후 `data/history.json` 변경사항을 PR로 자동 생성

## Worker 배포

### 배포하기

```bash
# worker 디렉토리에서 실행
cd worker

# Cloudflare 로그인 (계정 전환 시)
bunx wrangler login

# 배포
bunx wrangler deploy

# 슬래시 명령어 등록
bun run register-commands
```

배포 URL: `https://coffee.dalestudy.workers.dev`

### 새로운 Cloudflare 계정에 세팅하기

1. **Cloudflare 로그인**

   ```bash
   bunx wrangler login
   ```

2. **workers.dev 서브도메인 등록** (신규 계정인 경우)

   Cloudflare 대시보드 → Compute → Workers에서 서브도메인을 설정하거나, API로 등록:

   ```bash
   # 현재 서브도메인 확인
   curl -s "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/subdomain" \
     -H "Authorization: Bearer <TOKEN>"

   # 서브도메인 변경 (기존 것 삭제 후 재등록)
   curl -s -X DELETE "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/subdomain" \
     -H "Authorization: Bearer <TOKEN>"
   curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/workers/subdomain" \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" \
     --data '{"subdomain": "원하는이름"}'
   ```

3. **Worker 배포**

   ```bash
   cd worker && bunx wrangler deploy
   ```

4. **Bot 토큰 등록**

   ```bash
   cd worker && bunx wrangler secret put DISCORD_BOT_TOKEN
   ```

5. **슬래시 명령어 등록**

   ```bash
   cd worker && bun run register-commands
   ```

6. **Discord Interactions Endpoint URL 설정**

   [Discord Developer Portal](https://discord.com/developers/applications) → 앱 선택 → General Information → Interactions Endpoint URL에 배포된 Worker URL 입력 후 저장

### 참고사항

- `wrangler.jsonc`의 `vars`에는 공개 가능한 값만 포함 (`DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`, `DISCORD_SERVER_ID`, `DISCORD_ROLE_ID`)
- `DISCORD_BOT_TOKEN`은 반드시 `wrangler secret`으로 관리
- Cloudflare 계정의 이메일 인증이 완료되어야 Worker 배포 가능

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
