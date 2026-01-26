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
