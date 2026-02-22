import type { MatchSchedule } from "./types.ts";

/**
 * 주어진 스케줄에 따라 오늘 매칭을 실행해야 하는지 판단
 */
export function shouldRunToday(
	schedule: MatchSchedule,
	today: Date = new Date(),
): boolean {
	switch (schedule) {
		case "weekly":
			return true;
		case "biweekly": {
			// ISO 주 번호 기준 짝수 주
			const weekNumber = getISOWeekNumber(today);
			return weekNumber % 2 === 0;
		}
		case "monthly": {
			// 해당 월의 첫째 월요일
			return isFirstMondayOfMonth(today);
		}
	}
}

/**
 * ISO 8601 주 번호 계산
 */
export function getISOWeekNumber(date: Date): number {
	const d = new Date(
		Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
	);
	// 가장 가까운 목요일로 이동 (ISO 8601 기준)
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * 해당 월의 첫째 월요일인지 확인
 */
function isFirstMondayOfMonth(date: Date): boolean {
	if (date.getDay() !== 1) return false; // 월요일이 아니면 false
	return date.getDate() <= 7; // 7일 이내의 월요일이면 첫째 월요일
}
