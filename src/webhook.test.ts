import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import type { Participant } from "./types.ts";

describe("announceMatches", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.DISCORD_WEBHOOK_URL;

  beforeEach(() => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/test";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.DISCORD_WEBHOOK_URL = originalEnv;
  });

  test("올바른 형식으로 웹훅을 호출한다", async () => {
    let capturedBody: string | undefined;

    globalThis.fetch = mock(async (url: string, options: RequestInit) => {
      capturedBody = options.body as string;
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;

    // 모듈을 동적으로 import해서 mock된 환경변수 사용
    const { announceMatches } = await import("./webhook.ts");

    const pairs: Participant[][] = [
      [
        { id: "123", username: "Alice" },
        { id: "456", username: "Bob" },
      ],
    ];

    await announceMatches(pairs);

    expect(capturedBody).toBeDefined();
    const parsed = JSON.parse(capturedBody!);
    expect(parsed.content).toContain("<@123>");
    expect(parsed.content).toContain("<@456>");
    expect(parsed.content).toContain("↔");
  });

  test("3인조일 때 표시가 추가된다", async () => {
    let capturedBody: string | undefined;

    globalThis.fetch = mock(async (url: string, options: RequestInit) => {
      capturedBody = options.body as string;
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;

    const { announceMatches } = await import("./webhook.ts");

    const pairs: Participant[][] = [
      [
        { id: "1", username: "A" },
        { id: "2", username: "B" },
        { id: "3", username: "C" },
      ],
    ];

    await announceMatches(pairs);

    const parsed = JSON.parse(capturedBody!);
    expect(parsed.content).toContain("(3인조)");
  });

  test("웹훅 실패 시 에러를 던진다", async () => {
    globalThis.fetch = mock(async () => {
      return new Response(null, { status: 500 });
    }) as unknown as typeof fetch;

    const { announceMatches } = await import("./webhook.ts");

    const pairs: Participant[][] = [
      [
        { id: "1", username: "A" },
        { id: "2", username: "B" },
      ],
    ];

    expect(announceMatches(pairs)).rejects.toThrow("Webhook 전송 실패: 500");
  });
});
