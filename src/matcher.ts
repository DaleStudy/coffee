import type {
	ExperienceLevel,
	ExperienceStats,
	MatchHistory,
	MatchingOptions,
	Participant,
} from "./types.ts";

const HISTORY_FILE = "data/history.json";

export async function loadHistory(): Promise<MatchHistory> {
	const file = Bun.file(HISTORY_FILE);
	if (await file.exists()) {
		return await file.json();
	}
	return { matches: [] };
}

export async function saveHistory(
	history: MatchHistory,
	pairs: Participant[][],
): Promise<void> {
	const newRecord = {
		date: new Date().toISOString().split("T")[0],
		pairs: pairs.map((pair) => pair.map((p) => p.id)),
	};

	history.matches.push(newRecord);
	await Bun.write(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function shuffle<T>(array: T[]): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

function getRecentPairs(
	history: MatchHistory,
	lookback: number = 4,
): Set<string> {
	const recentMatches = history.matches.slice(-lookback);
	const pairs = new Set<string>();

	for (const match of recentMatches) {
		for (const pair of match.pairs) {
			const sorted = [...pair].sort();
			pairs.add(sorted.join(","));
		}
	}

	return pairs;
}

function pairKey(ids: string[]): string {
	return [...ids].sort().join(",");
}

// ===== 새로운 함수들 =====

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
	const meetingCount = getMeetingCount(idA, idB, history);
	const meetingScore = 1 / (1 + meetingCount);
	const mixScore = getExperienceMixScore(idA, idB, stats);

	return meetingScore * 0.6 + mixScore * 0.4;
}

interface ScoredCandidate {
	ids: [string, string];
	score: number;
}

/**
 * 모든 페어의 점수 매트릭스 생성
 */
export function buildScoreMatrix(
	participants: Participant[],
	history: MatchHistory,
	stats: ExperienceStats,
): ScoredCandidate[] {
	const candidates: ScoredCandidate[] = [];

	for (let i = 0; i < participants.length; i++) {
		for (let j = i + 1; j < participants.length; j++) {
			const idA = participants[i].id;
			const idB = participants[j].id;
			const score = calculatePairScore(idA, idB, history, stats);
			candidates.push({ ids: [idA, idB], score });
		}
	}

	return candidates;
}

/**
 * 소프트맥스 변환으로 점수를 확률로 변환
 */
export function scoresToProbabilities(
	candidates: ScoredCandidate[],
	temperature: number = 0.5,
): { ids: [string, string]; probability: number }[] {
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
 * 3인조 배치 시 최적의 조 선택
 * 남은 1명을 기존 페어들 중 가장 점수가 높은 조에 배치
 */
export function assignThirdMember(
	thirdMember: Participant,
	pairs: Participant[][],
	history: MatchHistory,
	stats: ExperienceStats,
): number {
	if (pairs.length === 0) return -1;
	if (pairs.length === 1) return 0;

	let bestIndex = 0;
	let bestScore = -1;

	for (let i = 0; i < pairs.length; i++) {
		const pair = pairs[i];
		// 3인조가 될 때의 총 점수 계산 (3명 간의 모든 페어 점수 합)
		let totalScore = 0;
		for (const member of pair) {
			totalScore += calculatePairScore(
				thirdMember.id,
				member.id,
				history,
				stats,
			);
		}

		if (totalScore > bestScore) {
			bestScore = totalScore;
			bestIndex = i;
		}
	}

	return bestIndex;
}

export function createMatches(
	participants: Participant[],
	history: MatchHistory,
	options: MatchingOptions = {},
): Participant[][] {
	const { temperature = 0.5 } = options;

	// 엣지 케이스: 2명 이하
	if (participants.length === 0) return [];
	if (participants.length === 1) return [];
	if (participants.length === 2) return [participants];
	if (participants.length === 3) return [participants];

	const recentPairs = getRecentPairs(history);
	const stats = calculateExperienceStats(participants, history);
	const pairs: Participant[][] = [];

	// 참여자 맵 생성
	const participantMap = new Map<string, Participant>();
	for (const p of participants) {
		participantMap.set(p.id, p);
	}

	// 남은 참여자 ID 집합
	const remaining = new Set(participants.map((p) => p.id));

	// 홀수일 때 3인조 후보 먼저 선택 (나중에 배치)
	let thirdMemberId: string | null = null;
	if (remaining.size % 2 === 1) {
		// 가중 무작위로 3인조 후보 선택 (경험이 중간인 사람 선호)
		const shuffledIds = shuffle(Array.from(remaining));
		thirdMemberId = shuffledIds[0];
		remaining.delete(thirdMemberId);
	}

	// 매칭 루프
	while (remaining.size >= 2) {
		const remainingParticipants = Array.from(remaining).map(
			(id) => participantMap.get(id)!,
		);

		// 점수 매트릭스 생성
		let candidates = buildScoreMatrix(remainingParticipants, history, stats);

		// 최근 4회 중복 필터링
		const filteredCandidates = candidates.filter(
			(c) => !recentPairs.has(pairKey(c.ids)),
		);

		// 필터링 후 후보가 있으면 사용, 없으면 전체 후보 사용 (fallback)
		if (filteredCandidates.length > 0) {
			candidates = filteredCandidates;
		}

		// 확률 변환 및 선택
		const probabilities = scoresToProbabilities(candidates, temperature);
		const selected = weightedRandomSelect(probabilities);

		if (!selected) break;

		// 선택된 페어 추가
		const [idA, idB] = selected.ids;
		pairs.push([participantMap.get(idA)!, participantMap.get(idB)!]);

		// 선택된 참여자 제거
		remaining.delete(idA);
		remaining.delete(idB);
	}

	// 3인조 후보를 최적 조에 배치
	if (thirdMemberId && pairs.length > 0) {
		const thirdMember = participantMap.get(thirdMemberId)!;
		const bestIndex = assignThirdMember(thirdMember, pairs, history, stats);
		pairs[bestIndex].push(thirdMember);
	}

	return pairs;
}
