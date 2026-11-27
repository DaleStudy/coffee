export interface MatchRecord {
	date: string;
	pairs: string[][];
	/** pairs와 같은 순서의 조별 쓰레드 ID. 쓰레드를 만들지 못한 조는 null */
	threads?: (string | null)[];
}

export interface MatchHistory {
	matches: MatchRecord[];
}

export interface Participant {
	id: string;
	username: string;
}

export type ExperienceLevel = "newcomer" | "regular" | "veteran";

export interface ExperienceStats {
	matchCounts: Map<string, number>;
	maxCount: number;
}

export interface MatchingOptions {
	groupSize?: number; // 기본 2
}

export type { MatchSchedule, RoleConfig } from "../data/types.ts";
