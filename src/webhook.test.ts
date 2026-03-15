import { describe, expect, mock, test } from "bun:test";
import type { Participant } from "./types.ts";
import { createGroupThreads } from "./webhook.ts";

const TEST_CHANNEL_ID = "123456789";
const TEST_BOT_TOKEN = "test-bot-token";

describe("createGroupThreads", () => {
	test("각 그룹마다 쓰레드를 생성하고 초기 메시지를 보낸다", async () => {
		const calls: { url: string; body: string }[] = [];

		globalThis.fetch = mock(
			async (url: string | URL | Request, options: RequestInit) => {
				const urlStr = url.toString();
				calls.push({ url: urlStr, body: options.body as string });

				if (urlStr.endsWith("/threads")) {
					return new Response(
						JSON.stringify({ id: `thread-${calls.length}` }),
						{ status: 200 },
					);
				}
				return new Response(null, { status: 200 });
			},
		) as unknown as typeof fetch;

		const groups: Participant[][] = [
			[
				{ id: "1", username: "Alice" },
				{ id: "2", username: "Bob" },
			],
			[
				{ id: "3", username: "Charlie" },
				{ id: "4", username: "Diana" },
			],
		];

		await createGroupThreads(
			TEST_CHANNEL_ID,
			TEST_BOT_TOKEN,
			groups,
			"커피챗",
		);

		expect(calls.length).toBe(4);

		// 첫 번째 그룹: 쓰레드 생성
		expect(calls[0].url).toContain(`/channels/${TEST_CHANNEL_ID}/threads`);
		const thread1Body = JSON.parse(calls[0].body);
		expect(thread1Body.name).toBe("☕ 커피챗 1조");
		expect(thread1Body.type).toBe(11);
		expect(thread1Body.auto_archive_duration).toBe(10080);

		// 첫 번째 그룹: 초기 메시지
		expect(calls[1].url).toContain("/channels/thread-1/messages");
		const msg1Body = JSON.parse(calls[1].body);
		expect(msg1Body.content).toContain("<@1>");
		expect(msg1Body.content).toContain("<@2>");

		// 두 번째 그룹: 쓰레드 생성
		expect(calls[2].url).toContain(`/channels/${TEST_CHANNEL_ID}/threads`);
		const thread2Body = JSON.parse(calls[2].body);
		expect(thread2Body.name).toBe("☕ 커피챗 2조");

		// 두 번째 그룹: 초기 메시지
		expect(calls[3].url).toContain("/channels/thread-3/messages");
	});

	test("쓰레드 이름이 100자를 초과하면 잘린다", async () => {
		let capturedBody: string | undefined;

		globalThis.fetch = mock(
			async (url: string | URL | Request, options: RequestInit) => {
				const urlStr = url.toString();
				if (urlStr.endsWith("/threads")) {
					capturedBody = options.body as string;
					return new Response(JSON.stringify({ id: "thread-1" }), {
						status: 200,
					});
				}
				return new Response(null, { status: 200 });
			},
		) as unknown as typeof fetch;

		const groups: Participant[][] = [
			[
				{ id: "1", username: "A" },
				{ id: "2", username: "B" },
			],
		];

		const longName = "가".repeat(98);
		await createGroupThreads(
			TEST_CHANNEL_ID,
			TEST_BOT_TOKEN,
			groups,
			longName,
		);

		expect(capturedBody).toBeDefined();
		const parsed = JSON.parse(capturedBody!);
		expect(parsed.name.length).toBeLessThanOrEqual(100);
		expect(parsed.name).toEndWith("...");
	});

	test("하나의 쓰레드 생성이 실패해도 나머지는 계속 진행된다", async () => {
		let callCount = 0;
		const threadCalls: string[] = [];

		globalThis.fetch = mock(
			async (url: string | URL | Request, _options: RequestInit) => {
				const urlStr = url.toString();
				callCount++;

				if (urlStr.endsWith("/threads")) {
					threadCalls.push(urlStr);
					if (threadCalls.length === 1) {
						return new Response(null, { status: 403 });
					}
					return new Response(JSON.stringify({ id: "thread-ok" }), {
						status: 200,
					});
				}
				return new Response(null, { status: 200 });
			},
		) as unknown as typeof fetch;

		const groups: Participant[][] = [
			[
				{ id: "1", username: "A" },
				{ id: "2", username: "B" },
			],
			[
				{ id: "3", username: "C" },
				{ id: "4", username: "D" },
			],
		];

		await createGroupThreads(
			TEST_CHANNEL_ID,
			TEST_BOT_TOKEN,
			groups,
			"커피챗",
		);

		expect(threadCalls.length).toBe(2);
		// 첫 번째 실패(쓰레드만) + 두 번째 성공(쓰레드+메시지) = 3회
		expect(callCount).toBe(3);
	});

	test("초기 메시지에 모든 멤버가 멘션된다", async () => {
		let capturedMessageBody: string | undefined;

		globalThis.fetch = mock(
			async (url: string | URL | Request, options: RequestInit) => {
				const urlStr = url.toString();
				if (urlStr.endsWith("/threads")) {
					return new Response(JSON.stringify({ id: "thread-1" }), {
						status: 200,
					});
				}
				capturedMessageBody = options.body as string;
				return new Response(null, { status: 200 });
			},
		) as unknown as typeof fetch;

		const groups: Participant[][] = [
			[
				{ id: "10", username: "X" },
				{ id: "20", username: "Y" },
				{ id: "30", username: "Z" },
			],
		];

		await createGroupThreads(
			TEST_CHANNEL_ID,
			TEST_BOT_TOKEN,
			groups,
			"커피챗",
		);

		expect(capturedMessageBody).toBeDefined();
		const parsed = JSON.parse(capturedMessageBody!);
		expect(parsed.content).toContain("<@10>");
		expect(parsed.content).toContain("<@20>");
		expect(parsed.content).toContain("<@30>");
	});
});
