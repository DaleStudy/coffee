import { describe, expect, test } from "bun:test";
import { getISOWeekNumber, shouldRunToday } from "./schedule.ts";

describe("shouldRunToday", () => {
	test("weekly는 항상 true", () => {
		expect(shouldRunToday("weekly", new Date("2026-01-05"))).toBe(true); // 월요일
		expect(shouldRunToday("weekly", new Date("2026-02-16"))).toBe(true);
	});

	test("biweekly는 짝수 주에만 true", () => {
		// 2026-01-05 = ISO week 2 (짝수) → true
		const evenWeek = new Date("2026-01-05");
		expect(shouldRunToday("biweekly", evenWeek)).toBe(true);

		// 2026-01-12 = ISO week 3 (홀수) → false
		const oddWeek = new Date("2026-01-12");
		expect(shouldRunToday("biweekly", oddWeek)).toBe(false);
	});

	test("monthly는 해당 월의 첫째 월요일에만 true", () => {
		// 2026-02-02 = 첫째 월요일
		expect(shouldRunToday("monthly", new Date("2026-02-02"))).toBe(true);

		// 2026-02-09 = 둘째 월요일
		expect(shouldRunToday("monthly", new Date("2026-02-09"))).toBe(false);

		// 2026-02-03 = 화요일 (월요일이 아님)
		expect(shouldRunToday("monthly", new Date("2026-02-03"))).toBe(false);

		// 2026-03-02 = 첫째 월요일
		expect(shouldRunToday("monthly", new Date("2026-03-02"))).toBe(true);
	});
});

describe("getISOWeekNumber", () => {
	test("연초 날짜의 주 번호를 올바르게 계산한다", () => {
		// 2026-01-01 = 목요일, ISO week 1
		expect(getISOWeekNumber(new Date("2026-01-01"))).toBe(1);
	});

	test("연말 날짜의 주 번호를 올바르게 계산한다", () => {
		// 2025-12-29 = 월요일, ISO week 1 of 2026
		expect(getISOWeekNumber(new Date("2025-12-29"))).toBe(1);
	});

	test("중간 날짜의 주 번호를 올바르게 계산한다", () => {
		// 2026-02-16 = 월요일
		const weekNum = getISOWeekNumber(new Date("2026-02-16"));
		expect(weekNum).toBe(8);
	});
});
