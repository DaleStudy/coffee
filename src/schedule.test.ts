import { describe, expect, test } from "bun:test";
import { shouldRunToday } from "./schedule.ts";

describe("shouldRunToday", () => {
	const today = new Date("2026-04-06T00:00:00Z");

	test("manual은 항상 false", () => {
		expect(shouldRunToday("manual", today)).toBe(false);
		expect(shouldRunToday("manual", today, new Date("2025-01-01"))).toBe(false);
	});

	test("이력이 없으면 즉시 실행", () => {
		expect(shouldRunToday("weekly", today)).toBe(true);
		expect(shouldRunToday("biweekly", today)).toBe(true);
		expect(shouldRunToday("monthly", today)).toBe(true);
	});

	test("weekly는 마지막 매칭 후 7일 이상 경과 시 실행", () => {
		// 7일 전 → 실행
		expect(shouldRunToday("weekly", today, new Date("2026-03-30"))).toBe(true);
		// 6일 전 → 대기
		expect(shouldRunToday("weekly", today, new Date("2026-03-31"))).toBe(false);
		// 14일 전 → 실행
		expect(shouldRunToday("weekly", today, new Date("2026-03-23"))).toBe(true);
	});

	test("biweekly는 마지막 매칭 후 14일 이상 경과 시 실행", () => {
		// 14일 전 → 실행
		expect(shouldRunToday("biweekly", today, new Date("2026-03-23"))).toBe(
			true,
		);
		// 13일 전 → 대기
		expect(shouldRunToday("biweekly", today, new Date("2026-03-24"))).toBe(
			false,
		);
		// 21일 전 → 실행
		expect(shouldRunToday("biweekly", today, new Date("2026-03-16"))).toBe(
			true,
		);
	});

	test("monthly는 마지막 매칭 후 28일 이상 경과 시 실행", () => {
		// 28일 전 → 실행
		expect(shouldRunToday("monthly", today, new Date("2026-03-09"))).toBe(true);
		// 27일 전 → 대기
		expect(shouldRunToday("monthly", today, new Date("2026-03-10"))).toBe(
			false,
		);
	});
});
