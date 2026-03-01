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
	temperature?: number; // 기본 0.5
	groupSize?: number; // 기본 2
}

export type MatchSchedule = "weekly" | "biweekly" | "monthly";

export interface RoleConfig {
	name: string; // slug (디렉토리명, autocomplete value)
	displayName: string; // Discord에 표시할 이름
	roleId: string; // Discord 역할 ID
	channelId: string; // 매칭 결과 발표 채널 ID
	schedule: MatchSchedule; // 매칭 주기
	groupSize: number; // 그룹당 인원 수 (기본 2)
}
