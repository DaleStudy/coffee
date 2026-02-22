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

		let bestIndex = 0;
		let bestScore = -1;

		for (let i = 0; i < groups.length; i++) {
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

export function createMatches(
	participants: Participant[],
	history: MatchHistory,
	options: MatchingOptions = {},
): Participant[][] {
	const { temperature = 0.5, groupSize = 2 } = options;

	// 2명 미만이면 매칭 불가
	if (participants.length < 2) return [];
	// groupSize * 2 미만이면 한 그룹으로
	if (participants.length < groupSize * 2) return [participants];

	const recentGroups = getRecentGroups(history);
	const stats = calculateExperienceStats(participants, history);
	const groups: Participant[][] = [];

	// 참여자 맵 생성
	const participantMap = new Map<string, Participant>();
	for (const p of participants) {
		participantMap.set(p.id, p);
	}

	// 남은 참여자 ID 집합
	const remaining = new Set(participants.map((p) => p.id));

	// 나머지 인원(total % groupSize)을 먼저 분리
	const extraCount = remaining.size % groupSize;
	const extraMemberIds: string[] = [];
	if (extraCount > 0) {
		const shuffledIds = shuffle(Array.from(remaining));
		for (let i = 0; i < extraCount; i++) {
			extraMemberIds.push(shuffledIds[i]);
			remaining.delete(shuffledIds[i]);
		}
	}

	// 매칭 루프
	while (remaining.size >= groupSize) {
		const remainingParticipants = Array.from(remaining).map(
			(id) => participantMap.get(id)!,
		);

		// 그룹 후보 생성
		let candidates = buildGroupCandidates(
			remainingParticipants,
			history,
			stats,
			groupSize,
		);

		// 최근 중복 필터링
		const filteredCandidates = candidates.filter(
			(c) => !recentGroups.has(groupKey(c.ids)),
		);

		// 필터링 후 후보가 있으면 사용, 없으면 전체 후보 사용 (fallback)
		if (filteredCandidates.length > 0) {
			candidates = filteredCandidates;
		}

		// 확률 변환 및 선택
		const probabilities = scoresToProbabilities(candidates, temperature);
		const selected = weightedRandomSelect(probabilities);

		if (!selected) break;

		// 선택된 그룹 추가
		const group = selected.ids.map((id) => participantMap.get(id)!);
		groups.push(group);

		// 선택된 참여자 제거
		for (const id of selected.ids) {
			remaining.delete(id);
		}
	}

	// 나머지 인원을 최적 그룹에 배치
	if (extraMemberIds.length > 0 && groups.length > 0) {
		const extraMembers = extraMemberIds.map((id) => participantMap.get(id)!);
		assignExtraMembers(extraMembers, groups, history, stats);
	}

	return groups;
}
