import type { MatchSchedule } from "./types.ts";

const INTERVAL_DAYS: Record<Exclude<MatchSchedule, "manual">, number> = {
	weekly: 7,
	biweekly: 14,
	monthly: 28,
};

/**
 * 마지막 매칭일 기준으로 오늘 매칭을 실행해야 하는지 판단
 */
export function shouldRunToday(
	schedule: MatchSchedule,
	today: Date = new Date(),
	lastMatchDate?: Date,
): boolean {
	if (schedule === "manual") return false;
	if (!lastMatchDate) return true;

	const diffDays = Math.floor(
		(today.getTime() - lastMatchDate.getTime()) / 86400000,
	);
	return diffDays >= INTERVAL_DAYS[schedule];
}
