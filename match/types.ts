export interface MatchRecord {
	date: string;
	pairs: string[][];
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
