import { describe, expect, mock, test } from "bun:test";
import type { Participant } from "./types.ts";
import { announceMatches } from "./webhook.ts";

describe("announceMatches", () => {
	test("올바른 형식으로 웹훅을 호출한다", async () => {
		let capturedBody: string | undefined;

		globalThis.fetch = mock(async (_url: string, options: RequestInit) => {
			capturedBody = options.body as string;
			return new Response(null, { status: 200 });
		}) as unknown as typeof fetch;

		const groups: Participant[][] = [
			[
				{ id: "123", username: "Alice" },
				{ id: "456", username: "Bob" },
			],
		];

		await announceMatches("https://discord.com/api/webhooks/test", groups);

		expect(capturedBody).toBeDefined();
		const parsed = JSON.parse(capturedBody!);
		expect(parsed.content).toContain("<@123>");
		expect(parsed.content).toContain("<@456>");
		expect(parsed.content).toContain("↔");
	});

	test("3인조일 때 표시가 추가된다", async () => {
		let capturedBody: string | undefined;

		globalThis.fetch = mock(async (_url: string, options: RequestInit) => {
			capturedBody = options.body as string;
			return new Response(null, { status: 200 });
		}) as unknown as typeof fetch;

		const groups: Participant[][] = [
			[
				{ id: "1", username: "A" },
				{ id: "2", username: "B" },
				{ id: "3", username: "C" },
			],
		];

		await announceMatches("https://discord.com/api/webhooks/test", groups);

		expect(capturedBody).toBeDefined();
		const parsed = JSON.parse(capturedBody!);
		expect(parsed.content).toContain("(3인조)");
	});

	test("웹훅 실패 시 에러를 던진다", async () => {
		globalThis.fetch = mock(async () => {
			return new Response(null, { status: 500 });
		}) as unknown as typeof fetch;

		const groups: Participant[][] = [
			[
				{ id: "1", username: "A" },
				{ id: "2", username: "B" },
			],
		];

		expect(
			announceMatches("https://discord.com/api/webhooks/test", groups),
		).rejects.toThrow("Webhook 전송 실패: 500");
	});

	test("displayName이 있으면 메시지에 포함된다", async () => {
		let capturedBody: string | undefined;

		globalThis.fetch = mock(async (_url: string, options: RequestInit) => {
			capturedBody = options.body as string;
			return new Response(null, { status: 200 });
		}) as unknown as typeof fetch;

		const groups: Participant[][] = [
			[
				{ id: "1", username: "A" },
				{ id: "2", username: "B" },
			],
		];

		await announceMatches(
			"https://discord.com/api/webhooks/test",
			groups,
			"커피챗",
		);

		expect(capturedBody).toBeDefined();
		const parsed = JSON.parse(capturedBody!);
		expect(parsed.content).toContain("이번 커피챗 매칭 발표!");
	});

	test("4인조일 때 4인조 표시가 추가된다", async () => {
		let capturedBody: string | undefined;

		globalThis.fetch = mock(async (_url: string, options: RequestInit) => {
			capturedBody = options.body as string;
			return new Response(null, { status: 200 });
		}) as unknown as typeof fetch;

		const groups: Participant[][] = [
			[
				{ id: "1", username: "A" },
				{ id: "2", username: "B" },
				{ id: "3", username: "C" },
				{ id: "4", username: "D" },
			],
		];

		await announceMatches("https://discord.com/api/webhooks/test", groups);

		expect(capturedBody).toBeDefined();
		const parsed = JSON.parse(capturedBody!);
		expect(parsed.content).toContain("(4인조)");
	});
});
