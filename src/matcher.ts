import type {
	ExperienceLevel,
	ExperienceStats,
	MatchHistory,
	MatchingOptions,
	Participant,
} from "./types.ts";

export async function loadHistory(roleName: string): Promise<MatchHistory> {
	const file = Bun.file(`data/${roleName}/history.json`);
	if (await file.exists()) {
		return await file.json();
	}
	return { matches: [] };
}

export async function saveHistory(
	roleName: string,
	history: MatchHistory,
	groups: Participant[][],
): Promise<void> {
	const newRecord = {
		date: new Date().toISOString().split("T")[0],
		pairs: groups.map((group) => group.map((p) => p.id)),
	};

	history.matches.push(newRecord);
	await Bun.write(
		`data/${roleName}/history.json`,
		JSON.stringify(history, null, 2),
	);
}

export function shuffle<T>(array: T[]): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

function getRecentGroups(
	history: MatchHistory,
	lookback: number = 4,
): Set<string> {
	const recentMatches = history.matches.slice(-lookback);
	const groups = new Set<string>();

	for (const match of recentMatches) {
		for (const group of match.pairs) {
			const sorted = [...group].sort();
			groups.add(sorted.join(","));
		}
	}

	return groups;
}

function groupKey(ids: string[]): string {
	return [...ids].sort().join(",");
}

/**
 * 최근 lookback 라운드의 모든 페어를 Set으로 반환
 * 페어 키는 "id1,id2" 형식 (정렬됨)
 */
export function getRecentPairs(
	history: MatchHistory,
	lookback: number = 1,
): Set<string> {
	const recentMatches = history.matches.slice(-lookback);
	const pairs = new Set<string>();

	for (const match of recentMatches) {
		for (const group of match.pairs) {
			for (let i = 0; i < group.length; i++) {
				for (let j = i + 1; j < group.length; j++) {
					const key = [group[i], group[j]].sort().join(",");
					pairs.add(key);
				}
			}
		}
	}

	return pairs;
}

// ===== 경험 & 점수 함수들 =====

/**
 * 두 사람이 만난 횟수를 반환
 */
export function getMeetingCount(
	idA: string,
	idB: string,
	history: MatchHistory,
): number {
	let count = 0;
	for (const match of history.matches) {
		for (const pair of match.pairs) {
			if (pair.includes(idA) && pair.includes(idB)) {
				count++;
			}
		}
	}
	return count;
}

/**
 * 두 사람의 recency 기반 만남 페널티 계산
 * penalty = Σ(1 / roundsAgo) for each round where they met
 * roundsAgo = totalRounds - matchIndex (1-indexed, most recent = 1)
 */
export function calculateRecencyPenalty(
	idA: string,
	idB: string,
	history: MatchHistory,
): number {
	const totalRounds = history.matches.length;
	let penalty = 0;

	for (let i = 0; i < totalRounds; i++) {
		const match = history.matches[i];
		for (const pair of match.pairs) {
			if (pair.includes(idA) && pair.includes(idB)) {
				const roundsAgo = totalRounds - i;
				penalty += 1 / roundsAgo;
			}
		}
	}

	return penalty;
}

/**
 * 참여자들의 경험 통계 계산 (각 참여자의 총 매칭 횟수)
 */
export function calculateExperienceStats(
	participants: Participant[],
	history: MatchHistory,
): ExperienceStats {
	const matchCounts = new Map<string, number>();
	const participantIds = new Set(participants.map((p) => p.id));

	for (const p of participants) {
		matchCounts.set(p.id, 0);
	}

	for (const match of history.matches) {
		for (const pair of match.pairs) {
			for (const id of pair) {
				if (participantIds.has(id)) {
					matchCounts.set(id, (matchCounts.get(id) ?? 0) + 1);
				}
			}
		}
	}

	const counts = Array.from(matchCounts.values());
	const maxCount = counts.length > 0 ? Math.max(...counts) : 0;

	return { matchCounts, maxCount };
}

/**
 * 매칭 횟수에 따른 경험 수준 판별
 * newcomer: 하위 25%, regular: 중간 50%, veteran: 상위 25%
 */
export function getExperienceLevel(
	matchCount: number,
	maxCount: number,
): ExperienceLevel {
	if (maxCount === 0) return "newcomer";

	const ratio = matchCount / maxCount;
	if (ratio <= 0.25) return "newcomer";
	if (ratio >= 0.75) return "veteran";
	return "regular";
}

/**
 * 경험 믹싱 점수 테이블
 */
const EXPERIENCE_MIX_SCORES: Record<
	ExperienceLevel,
	Record<ExperienceLevel, number>
> = {
	newcomer: { newcomer: 0.3, regular: 0.8, veteran: 1.0 },
	regular: { newcomer: 0.8, regular: 0.6, veteran: 0.8 },
	veteran: { newcomer: 1.0, regular: 0.8, veteran: 0.5 },
};

/**
 * 두 사람의 경험 믹싱 점수 계산
 */
export function getExperienceMixScore(
	idA: string,
	idB: string,
	stats: ExperienceStats,
): number {
	const countA = stats.matchCounts.get(idA) ?? 0;
	const countB = stats.matchCounts.get(idB) ?? 0;

	const levelA = getExperienceLevel(countA, stats.maxCount);
	const levelB = getExperienceLevel(countB, stats.maxCount);

	return EXPERIENCE_MIX_SCORES[levelA][levelB];
}

/**
 * 두 사람의 종합 매칭 점수 계산
 * meetingScore * 0.6 + mixScore * 0.4
 */
export function calculatePairScore(
	idA: string,
	idB: string,
	history: MatchHistory,
	stats: ExperienceStats,
): number {
	const recencyPenalty = calculateRecencyPenalty(idA, idB, history);
	const meetingScore = 1 / (1 + recencyPenalty);
	const mixScore = getExperienceMixScore(idA, idB, stats);

	return meetingScore * 0.6 + mixScore * 0.4;
}

interface ScoredCandidate {
	ids: string[];
	score: number;
}

/**
 * 그룹 후보 생성: C(n, groupSize) 조합을 만들고
 * 그룹 내 모든 페어 점수의 평균을 그룹 점수로 사용
 */
export function buildGroupCandidates(
	participants: Participant[],
	history: MatchHistory,
	stats: ExperienceStats,
	groupSize: number = 2,
): ScoredCandidate[] {
	const candidates: ScoredCandidate[] = [];
	const ids = participants.map((p) => p.id);

	function* combinations(arr: string[], k: number): Generator<string[]> {
		if (k === 0) {
			yield [];
			return;
		}
		for (let i = 0; i <= arr.length - k; i++) {
			for (const rest of combinations(arr.slice(i + 1), k - 1)) {
				yield [arr[i], ...rest];
			}
		}
	}

	for (const combo of combinations(ids, groupSize)) {
		// 그룹 내 모든 페어 점수의 평균
		let totalScore = 0;
		let pairCount = 0;
		for (let i = 0; i < combo.length; i++) {
			for (let j = i + 1; j < combo.length; j++) {
				totalScore += calculatePairScore(combo[i], combo[j], history, stats);
				pairCount++;
			}
		}
		const avgScore = pairCount > 0 ? totalScore / pairCount : 0;
		candidates.push({ ids: combo, score: avgScore });
	}

	return candidates;
}

/**
 * 소프트맥스 변환으로 점수를 확률로 변환
 */
export function scoresToProbabilities(
	candidates: ScoredCandidate[],
	temperature: number = 0.5,
): { ids: string[]; probability: number }[] {
	if (candidates.length === 0) return [];

	// temperature로 나눈 후 exp 적용
	const expScores = candidates.map((c) => Math.exp(c.score / temperature));
	const sumExp = expScores.reduce((a, b) => a + b, 0);

	return candidates.map((c, i) => ({
		ids: c.ids,
		probability: expScores[i] / sumExp,
	}));
}

/**
 * 확률에 따른 가중 무작위 선택
 */
export function weightedRandomSelect<T extends { probability: number }>(
	candidates: T[],
): T | null {
	if (candidates.length === 0) return null;

	const random = Math.random();
	let cumulative = 0;

	for (const candidate of candidates) {
		cumulative += candidate.probability;
		if (random < cumulative) {
			return candidate;
		}
	}

	// 부동소수점 오차 대비
	return candidates[candidates.length - 1];
}

/**
 * 나머지 인원을 기존 그룹 중 최적의 그룹에 배치
 */
export function assignExtraMembers(
	extraMembers: Participant[],
	groups: Participant[][],
	history: MatchHistory,
	stats: ExperienceStats,
): void {
	for (const member of extraMembers) {
		if (groups.length === 0) break;
		if (groups.length === 1) {
			groups[0].push(member);
			continue;
		}

		const minSize = Math.min(...groups.map((g) => g.length));
		let bestIndex = 0;
		let bestScore = -1;

		for (let i = 0; i < groups.length; i++) {
			if (groups[i].length > minSize) continue;

			const group = groups[i];
			let totalScore = 0;
			for (const existing of group) {
				totalScore += calculatePairScore(
					member.id,
					existing.id,
					history,
					stats,
				);
			}

			if (totalScore > bestScore) {
				bestScore = totalScore;
				bestIndex = i;
			}
		}

		groups[bestIndex].push(member);
	}
}

/**
 * 참여자를 셔플 후 groupSize씩 나누어 파티션 생성
 * 나머지 인원은 앞 그룹부터 1명씩 분배
 */
export function generatePartition(
	participants: Participant[],
	groupSize: number,
): Participant[][] {
	const shuffled = shuffle(participants);
	const numGroups = Math.floor(shuffled.length / groupSize);
	const extra = shuffled.length % groupSize;

	const groups: Participant[][] = [];
	let idx = 0;

	// groupSize씩 나누기
	for (let g = 0; g < numGroups; g++) {
		groups.push(shuffled.slice(idx, idx + groupSize));
		idx += groupSize;
	}

	// 나머지 인원을 앞 그룹부터 1명씩 분배
	for (let e = 0; e < extra; e++) {
		groups[e % numGroups].push(shuffled[idx + e]);
	}

	return groups;
}

interface PartitionScore {
	total: number;
	hasViolation: boolean;
}

/**
 * 파티션의 총점 계산 + 하드 제외 위반 여부 확인
 * total = Σ(그룹 내 모든 페어의 pairScore)
 */
export function scorePartition(
	groups: Participant[][],
	history: MatchHistory,
	stats: ExperienceStats,
	recentPairs: Set<string>,
): PartitionScore {
	let total = 0;
	let hasViolation = false;

	for (const group of groups) {
		for (let i = 0; i < group.length; i++) {
			for (let j = i + 1; j < group.length; j++) {
				total += calculatePairScore(group[i].id, group[j].id, history, stats);
				const key = [group[i].id, group[j].id].sort().join(",");
				if (recentPairs.has(key)) {
					hasViolation = true;
				}
			}
		}
	}

	return { total, hasViolation };
}

function getTrialCount(participantCount: number): number {
	if (participantCount <= 16) return 5000;
	if (participantCount <= 30) return 2000;
	return 1000;
}

/**
 * Best-of-N 파티션 탐색으로 최적 매칭을 찾는다
 * N개 파티션을 생성하여 하드 제외를 만족하는 최고점 파티션을 반환
 * 모든 파티션이 하드 제외를 위반하면 최고점 파티션을 fallback으로 반환
 */
export function findBestPartition(
	participants: Participant[],
	history: MatchHistory,
	options: MatchingOptions = {},
): Participant[][] {
	const { groupSize = 2 } = options;
	const stats = calculateExperienceStats(participants, history);
	const recentPairs = getRecentPairs(history, 1);
	const trials = getTrialCount(participants.length);

	let bestValid: { groups: Participant[][]; score: number } | null = null;
	let bestAny: { groups: Participant[][]; score: number } | null = null;

	for (let i = 0; i < trials; i++) {
		const groups = generatePartition(participants, groupSize);
		const result = scorePartition(groups, history, stats, recentPairs);

		if (!bestAny || result.total > bestAny.score) {
			bestAny = { groups, score: result.total };
		}

		if (!result.hasViolation && (!bestValid || result.total > bestValid.score)) {
			bestValid = { groups, score: result.total };
		}
	}

	return (bestValid ?? bestAny)!.groups;
}

export function createMatches(
	participants: Participant[],
	history: MatchHistory,
	options: MatchingOptions = {},
): Participant[][] {
	const { groupSize = 2 } = options;

	if (participants.length < 2) return [];
	if (participants.length < groupSize * 2) return [participants];

	return findBestPartition(participants, history, options);
}
