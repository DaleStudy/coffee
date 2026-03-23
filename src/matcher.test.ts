import { describe, expect, test } from "bun:test";
import {
	buildGroupCandidates,
	calculateExperienceStats,
	calculatePairScore,
	calculateRecencyPenalty,
	createMatches,
	generatePartition,
	getExperienceLevel,
	getExperienceMixScore,
	getMeetingCount,
	getRecentPairs,
	scorePartition,
	scoresToProbabilities,
	weightedRandomSelect,
} from "./matcher.ts";
import type { MatchHistory, Participant } from "./types.ts";

function createParticipants(count: number): Participant[] {
	return Array.from({ length: count }, (_, i) => ({
		id: `user${i + 1}`,
		username: `User ${i + 1}`,
	}));
}

describe("createMatches", () => {
	test("짝수 인원일 때 2인 조로 매칭된다", () => {
		const participants = createParticipants(4);
		const history: MatchHistory = { matches: [] };

		const pairs = createMatches(participants, history);

		expect(pairs).toHaveLength(2);
		expect(pairs.every((pair) => pair.length === 2)).toBe(true);
	});

	test("홀수 인원일 때 한 조가 3인이 된다", () => {
		const participants = createParticipants(5);
		const history: MatchHistory = { matches: [] };

		const pairs = createMatches(participants, history);

		expect(pairs).toHaveLength(2);
		const lengths = pairs.map((p) => p.length).sort();
		expect(lengths).toEqual([2, 3]);
	});

	test("1명일 때 빈 배열을 반환한다", () => {
		const participants = createParticipants(1);
		const history: MatchHistory = { matches: [] };

		const pairs = createMatches(participants, history);

		expect(pairs).toHaveLength(0);
	});

	test("0명일 때 빈 배열을 반환한다", () => {
		const participants: Participant[] = [];
		const history: MatchHistory = { matches: [] };

		const pairs = createMatches(participants, history);

		expect(pairs).toHaveLength(0);
	});

	test("모든 참여자가 매칭에 포함된다", () => {
		const participants = createParticipants(6);
		const history: MatchHistory = { matches: [] };

		const pairs = createMatches(participants, history);
		const matchedIds = pairs.flat().map((p) => p.id);

		expect(matchedIds.sort()).toEqual(participants.map((p) => p.id).sort());
	});

	test("최근 매칭 이력이 있으면 같은 조를 피한다", () => {
		const participants = createParticipants(4);
		const history: MatchHistory = {
			matches: [
				{
					date: "2025-01-01",
					pairs: [
						["user1", "user2"],
						["user3", "user4"],
					],
				},
			],
		};

		// 여러 번 실행해서 이력과 다른 매칭이 나오는지 확인
		let foundDifferentPairing = false;
		for (let i = 0; i < 50; i++) {
			const pairs = createMatches(participants, history);
			const pairKeys = pairs.map((pair) =>
				pair
					.map((p) => p.id)
					.sort()
					.join(","),
			);

			if (
				!pairKeys.includes("user1,user2") &&
				!pairKeys.includes("user3,user4")
			) {
				foundDifferentPairing = true;
				break;
			}
		}

		expect(foundDifferentPairing).toBe(true);
	});

	test("2명일 때 1개 조가 생성된다", () => {
		const participants = createParticipants(2);
		const history: MatchHistory = { matches: [] };

		const pairs = createMatches(participants, history);

		expect(pairs).toHaveLength(1);
		expect(pairs[0]).toHaveLength(2);
	});

	test("3명일 때 1개 3인조가 생성된다", () => {
		const participants = createParticipants(3);
		const history: MatchHistory = { matches: [] };

		const pairs = createMatches(participants, history);

		expect(pairs).toHaveLength(1);
		expect(pairs[0]).toHaveLength(3);
	});
});

describe("createMatches with groupSize", () => {
	test("groupSize=3일 때 3인 조로 매칭된다", () => {
		const participants = createParticipants(6);
		const history: MatchHistory = { matches: [] };

		const groups = createMatches(participants, history, { groupSize: 3 });

		expect(groups).toHaveLength(2);
		expect(groups.every((g) => g.length === 3)).toBe(true);
	});

	test("groupSize=3이고 7명이면 3인조 2개 + 나머지 1명이 배치된다", () => {
		const participants = createParticipants(7);
		const history: MatchHistory = { matches: [] };

		const groups = createMatches(participants, history, { groupSize: 3 });

		expect(groups).toHaveLength(2);
		const lengths = groups.map((g) => g.length).sort();
		expect(lengths).toEqual([3, 4]);
	});

	test("groupSize=3이고 8명이면 4-4로 균등 분배된다", () => {
		const participants = createParticipants(8);
		const history: MatchHistory = { matches: [] };

		const groups = createMatches(participants, history, { groupSize: 3 });

		expect(groups).toHaveLength(2);
		const lengths = groups.map((g) => g.length).sort();
		expect(lengths).toEqual([4, 4]);
	});

	test("groupSize=3이고 11명이면 3-4-4로 균등 분배된다", () => {
		const participants = createParticipants(11);
		const history: MatchHistory = { matches: [] };

		const groups = createMatches(participants, history, { groupSize: 3 });

		expect(groups).toHaveLength(3);
		const lengths = groups.map((g) => g.length).sort();
		expect(lengths).toEqual([3, 4, 4]);
	});

	test("groupSize=4일 때 4인 조로 매칭된다", () => {
		const participants = createParticipants(8);
		const history: MatchHistory = { matches: [] };

		const groups = createMatches(participants, history, { groupSize: 4 });

		expect(groups).toHaveLength(2);
		expect(groups.every((g) => g.length === 4)).toBe(true);
	});

	test("groupSize보다 인원이 적으면 한 그룹으로", () => {
		const participants = createParticipants(2);
		const history: MatchHistory = { matches: [] };

		const groups = createMatches(participants, history, { groupSize: 3 });

		expect(groups).toHaveLength(1);
		expect(groups[0]).toHaveLength(2);
	});

	test("groupSize=3이고 모든 참여자가 매칭에 포함된다", () => {
		const participants = createParticipants(9);
		const history: MatchHistory = { matches: [] };

		const groups = createMatches(participants, history, { groupSize: 3 });
		const matchedIds = groups.flat().map((p) => p.id);

		expect(matchedIds.sort()).toEqual(participants.map((p) => p.id).sort());
	});
});

describe("getMeetingCount", () => {
	test("만난 적 없으면 0을 반환한다", () => {
		const history: MatchHistory = { matches: [] };
		expect(getMeetingCount("user1", "user2", history)).toBe(0);
	});

	test("한 번 만났으면 1을 반환한다", () => {
		const history: MatchHistory = {
			matches: [
				{
					date: "2025-01-01",
					pairs: [["user1", "user2"]],
				},
			],
		};
		expect(getMeetingCount("user1", "user2", history)).toBe(1);
	});

	test("여러 번 만났으면 정확한 횟수를 반환한다", () => {
		const history: MatchHistory = {
			matches: [
				{ date: "2025-01-01", pairs: [["user1", "user2"]] },
				{ date: "2025-01-08", pairs: [["user1", "user3"]] },
				{ date: "2025-01-15", pairs: [["user1", "user2"]] },
				{ date: "2025-01-22", pairs: [["user1", "user2"]] },
			],
		};
		expect(getMeetingCount("user1", "user2", history)).toBe(3);
		expect(getMeetingCount("user1", "user3", history)).toBe(1);
	});

	test("3인조에서도 만남을 카운트한다", () => {
		const history: MatchHistory = {
			matches: [
				{
					date: "2025-01-01",
					pairs: [["user1", "user2", "user3"]],
				},
			],
		};
		expect(getMeetingCount("user1", "user2", history)).toBe(1);
		expect(getMeetingCount("user1", "user3", history)).toBe(1);
		expect(getMeetingCount("user2", "user3", history)).toBe(1);
	});
});

describe("calculateRecencyPenalty", () => {
	test("만난 적 없으면 0을 반환한다", () => {
		const history: MatchHistory = { matches: [] };
		expect(calculateRecencyPenalty("user1", "user2", history)).toBe(0);
	});

	test("직전 라운드에서 만났으면 1.0을 반환한다", () => {
		const history: MatchHistory = {
			matches: [
				{ date: "2025-01-01", pairs: [["user1", "user2"]] },
			],
		};
		expect(calculateRecencyPenalty("user1", "user2", history)).toBe(1);
	});

	test("여러 라운드에서 만났으면 1/roundsAgo 합산을 반환한다", () => {
		const history: MatchHistory = {
			matches: [
				{ date: "2025-01-01", pairs: [["user1", "user2"]] }, // roundsAgo=3
				{ date: "2025-01-08", pairs: [["user1", "user3"]] }, // roundsAgo=2
				{ date: "2025-01-15", pairs: [["user1", "user2"]] }, // roundsAgo=1
			],
		};
		// penalty = 1/1 + 1/3 = 1.333...
		expect(calculateRecencyPenalty("user1", "user2", history)).toBeCloseTo(1 + 1 / 3, 5);
		// penalty = 1/2
		expect(calculateRecencyPenalty("user1", "user3", history)).toBeCloseTo(1 / 2, 5);
	});

	test("3인조에서 만남도 카운트한다", () => {
		const history: MatchHistory = {
			matches: [
				{ date: "2025-01-01", pairs: [["user1", "user2", "user3"]] },
			],
		};
		expect(calculateRecencyPenalty("user1", "user2", history)).toBe(1);
		expect(calculateRecencyPenalty("user2", "user3", history)).toBe(1);
	});
});

describe("calculateExperienceStats", () => {
	test("히스토리가 없으면 모두 0 카운트", () => {
		const participants = createParticipants(3);
		const history: MatchHistory = { matches: [] };

		const stats = calculateExperienceStats(participants, history);

		expect(stats.matchCounts.get("user1")).toBe(0);
		expect(stats.matchCounts.get("user2")).toBe(0);
		expect(stats.maxCount).toBe(0);
	});

	test("매칭 횟수를 정확히 계산한다", () => {
		const participants = createParticipants(3);
		const history: MatchHistory = {
			matches: [
				{ date: "2025-01-01", pairs: [["user1", "user2"]] },
				{ date: "2025-01-08", pairs: [["user1", "user3"]] },
				{ date: "2025-01-15", pairs: [["user1", "user2"]] },
			],
		};

		const stats = calculateExperienceStats(participants, history);

		expect(stats.matchCounts.get("user1")).toBe(3);
		expect(stats.matchCounts.get("user2")).toBe(2);
		expect(stats.matchCounts.get("user3")).toBe(1);
		expect(stats.maxCount).toBe(3);
	});
});

describe("getExperienceLevel", () => {
	test("maxCount가 0이면 newcomer", () => {
		expect(getExperienceLevel(0, 0)).toBe("newcomer");
	});

	test("하위 25%는 newcomer", () => {
		expect(getExperienceLevel(0, 10)).toBe("newcomer");
		expect(getExperienceLevel(2, 10)).toBe("newcomer");
		expect(getExperienceLevel(2.5, 10)).toBe("newcomer");
	});

	test("상위 25%는 veteran", () => {
		expect(getExperienceLevel(8, 10)).toBe("veteran");
		expect(getExperienceLevel(10, 10)).toBe("veteran");
	});

	test("중간 50%는 regular", () => {
		expect(getExperienceLevel(3, 10)).toBe("regular");
		expect(getExperienceLevel(5, 10)).toBe("regular");
		expect(getExperienceLevel(7, 10)).toBe("regular");
	});
});

describe("getExperienceMixScore", () => {
	test("신규-신규는 낮은 점수(0.3)", () => {
		const stats = {
			matchCounts: new Map([
				["user1", 0],
				["user2", 0],
			]),
			maxCount: 10,
		};
		expect(getExperienceMixScore("user1", "user2", stats)).toBe(0.3);
	});

	test("신규-베테랑은 높은 점수(1.0)", () => {
		const stats = {
			matchCounts: new Map([
				["user1", 0],
				["user2", 10],
			]),
			maxCount: 10,
		};
		expect(getExperienceMixScore("user1", "user2", stats)).toBe(1.0);
	});

	test("베테랑-베테랑은 중간 낮은 점수(0.5)", () => {
		const stats = {
			matchCounts: new Map([
				["user1", 10],
				["user2", 10],
			]),
			maxCount: 10,
		};
		expect(getExperienceMixScore("user1", "user2", stats)).toBe(0.5);
	});
});

describe("calculatePairScore", () => {
	test("만남 이력이 없고 경험 믹싱이 좋으면 높은 점수", () => {
		const history: MatchHistory = { matches: [] };
		const stats = {
			matchCounts: new Map([
				["user1", 0],
				["user2", 10],
			]),
			maxCount: 10,
		};

		const score = calculatePairScore("user1", "user2", history, stats);
		// recencyPenalty = 0, meetingScore = 1/(1+0) = 1.0
		// mixScore = 1.0 (newcomer-veteran)
		// total = 1.0 * 0.6 + 1.0 * 0.4 = 1.0
		expect(score).toBe(1.0);
	});

	test("최근 만남이 많으면 점수가 낮아진다", () => {
		const history: MatchHistory = {
			matches: [
				{ date: "2025-01-01", pairs: [["user1", "user2"]] },
				{ date: "2025-01-08", pairs: [["user1", "user2"]] },
			],
		};
		const stats = {
			matchCounts: new Map([
				["user1", 5],
				["user2", 5],
			]),
			maxCount: 10,
		};

		const score = calculatePairScore("user1", "user2", history, stats);
		// recencyPenalty = 1/1 + 1/2 = 1.5
		// meetingScore = 1/(1+1.5) = 0.4
		// mixScore = 0.6 (regular-regular)
		// total = 0.4 * 0.6 + 0.6 * 0.4 = 0.24 + 0.24 = 0.48
		expect(score).toBeCloseTo(0.48, 2);
	});

	test("오래된 만남은 페널티가 작다", () => {
		const history: MatchHistory = {
			matches: [
				{ date: "2025-01-01", pairs: [["user1", "user2"]] },
				{ date: "2025-01-08", pairs: [["user1", "user3"]] },
				{ date: "2025-01-15", pairs: [["user1", "user3"]] },
				{ date: "2025-01-22", pairs: [["user1", "user3"]] },
				{ date: "2025-01-29", pairs: [["user1", "user3"]] },
			],
		};
		const stats = {
			matchCounts: new Map([
				["user1", 5],
				["user2", 5],
			]),
			maxCount: 10,
		};

		const score = calculatePairScore("user1", "user2", history, stats);
		// recencyPenalty = 1/5 = 0.2 (met in oldest round only)
		// meetingScore = 1/(1+0.2) = 0.833...
		// mixScore = 0.6 (regular-regular)
		// total = 0.833 * 0.6 + 0.6 * 0.4 = 0.5 + 0.24 = 0.74
		expect(score).toBeCloseTo(0.74, 2);
	});
});

describe("getRecentPairs", () => {
	test("빈 히스토리면 빈 Set을 반환한다", () => {
		const history: MatchHistory = { matches: [] };
		expect(getRecentPairs(history).size).toBe(0);
	});

	test("직전 라운드의 모든 페어를 반환한다", () => {
		const history: MatchHistory = {
			matches: [
				{
					date: "2025-01-01",
					pairs: [["user1", "user2"], ["user3", "user4"]],
				},
			],
		};
		const pairs = getRecentPairs(history);
		expect(pairs.has("user1,user2")).toBe(true);
		expect(pairs.has("user3,user4")).toBe(true);
		expect(pairs.size).toBe(2);
	});

	test("3인조에서는 모든 페어 조합을 반환한다", () => {
		const history: MatchHistory = {
			matches: [
				{
					date: "2025-01-01",
					pairs: [["user1", "user2", "user3"]],
				},
			],
		};
		const pairs = getRecentPairs(history);
		expect(pairs.has("user1,user2")).toBe(true);
		expect(pairs.has("user1,user3")).toBe(true);
		expect(pairs.has("user2,user3")).toBe(true);
		expect(pairs.size).toBe(3);
	});

	test("lookback=1이면 직전 라운드만 본다", () => {
		const history: MatchHistory = {
			matches: [
				{ date: "2025-01-01", pairs: [["user1", "user2"]] },
				{ date: "2025-01-08", pairs: [["user3", "user4"]] },
			],
		};
		const pairs = getRecentPairs(history, 1);
		expect(pairs.has("user3,user4")).toBe(true);
		expect(pairs.has("user1,user2")).toBe(false);
	});
});

describe("buildGroupCandidates", () => {
	test("groupSize=2일 때 모든 페어를 생성한다", () => {
		const participants = createParticipants(3);
		const history: MatchHistory = { matches: [] };
		const stats = calculateExperienceStats(participants, history);

		const candidates = buildGroupCandidates(participants, history, stats, 2);

		// C(3,2) = 3
		expect(candidates).toHaveLength(3);
		expect(candidates.every((c) => c.ids.length === 2)).toBe(true);
	});

	test("groupSize=3일 때 모든 3인 조합을 생성한다", () => {
		const participants = createParticipants(4);
		const history: MatchHistory = { matches: [] };
		const stats = calculateExperienceStats(participants, history);

		const candidates = buildGroupCandidates(participants, history, stats, 3);

		// C(4,3) = 4
		expect(candidates).toHaveLength(4);
		expect(candidates.every((c) => c.ids.length === 3)).toBe(true);
	});
});

describe("scoresToProbabilities", () => {
	test("빈 배열은 빈 배열 반환", () => {
		expect(scoresToProbabilities([])).toEqual([]);
	});

	test("높은 점수가 높은 확률을 갖는다", () => {
		const candidates = [
			{ ids: ["a", "b"], score: 1.0 },
			{ ids: ["c", "d"], score: 0.5 },
		];

		const probs = scoresToProbabilities(candidates, 0.5);

		expect(probs[0].probability).toBeGreaterThan(probs[1].probability);
	});

	test("확률의 합은 1이다", () => {
		const candidates = [
			{ ids: ["a", "b"], score: 0.8 },
			{ ids: ["c", "d"], score: 0.6 },
			{ ids: ["e", "f"], score: 0.4 },
		];

		const probs = scoresToProbabilities(candidates, 0.5);
		const sum = probs.reduce((acc, p) => acc + p.probability, 0);

		expect(sum).toBeCloseTo(1.0, 5);
	});
});

describe("weightedRandomSelect", () => {
	test("빈 배열은 null 반환", () => {
		expect(weightedRandomSelect([])).toBeNull();
	});

	test("하나만 있으면 그것을 반환", () => {
		const candidates = [{ id: "a", probability: 1.0 }];
		expect(weightedRandomSelect(candidates)).toEqual(candidates[0]);
	});
});

describe("generatePartition", () => {
	test("참여자를 groupSize씩 나눈다", () => {
		const participants = createParticipants(6);
		const groups = generatePartition(participants, 2);

		expect(groups).toHaveLength(3);
		expect(groups.every((g) => g.length === 2)).toBe(true);
	});

	test("모든 참여자가 포함된다", () => {
		const participants = createParticipants(6);
		const groups = generatePartition(participants, 2);
		const allIds = groups.flat().map((p) => p.id).sort();

		expect(allIds).toEqual(participants.map((p) => p.id).sort());
	});

	test("나머지 인원은 기존 그룹에 분배된다", () => {
		const participants = createParticipants(7);
		const groups = generatePartition(participants, 3);

		expect(groups).toHaveLength(2);
		const lengths = groups.map((g) => g.length).sort();
		expect(lengths).toEqual([3, 4]);
	});
});

describe("scorePartition", () => {
	test("그룹 내 모든 페어의 pairScore 합을 반환한다", () => {
		const participants = createParticipants(4);
		const history: MatchHistory = { matches: [] };
		const stats = calculateExperienceStats(participants, history);
		const recentPairs = new Set<string>();
		const groups = [[participants[0], participants[1]], [participants[2], participants[3]]];

		const score = scorePartition(groups, history, stats, recentPairs);

		// 빈 히스토리에서 모든 meetingScore=1.0, 모든 mixScore=0.3 (newcomer-newcomer)
		// pairScore = 1.0 * 0.6 + 0.3 * 0.4 = 0.72 per pair
		// 2 groups × 1 pair each = 2 pairs total
		expect(score.total).toBeCloseTo(0.72 * 2, 5);
		expect(score.hasViolation).toBe(false);
	});

	test("하드 제외 위반 페어가 있으면 hasViolation이 true", () => {
		const participants = createParticipants(4);
		const history: MatchHistory = { matches: [] };
		const stats = calculateExperienceStats(participants, history);
		const recentPairs = new Set(["user1,user2"]);
		const groups = [[participants[0], participants[1]], [participants[2], participants[3]]];

		const score = scorePartition(groups, history, stats, recentPairs);

		expect(score.hasViolation).toBe(true);
	});
});

describe("통계적 검증", () => {
	test("만난 적 없는 페어가 더 자주 선택된다", () => {
		const participants = createParticipants(4);
		// user1-user2가 이미 여러 번 만남
		const history: MatchHistory = {
			matches: [
				{
					date: "2025-01-01",
					pairs: [
						["user1", "user2"],
						["user3", "user4"],
					],
				},
				{
					date: "2025-01-08",
					pairs: [
						["user1", "user2"],
						["user3", "user4"],
					],
				},
				{
					date: "2025-01-15",
					pairs: [
						["user1", "user2"],
						["user3", "user4"],
					],
				},
				{
					date: "2025-01-22",
					pairs: [
						["user1", "user2"],
						["user3", "user4"],
					],
				},
				{
					date: "2025-01-29",
					pairs: [
						["user1", "user3"],
						["user2", "user4"],
					],
				},
			],
		};

		let newPairCount = 0;
		const iterations = 100;

		for (let i = 0; i < iterations; i++) {
			const pairs = createMatches(participants, history);
			const pairKeys = pairs.map((pair) =>
				pair
					.map((p) => p.id)
					.sort()
					.join(","),
			);

			// user1-user4 또는 user2-user3은 한 번만 만남 (가장 적음)
			if (
				pairKeys.includes("user1,user4") ||
				pairKeys.includes("user2,user3")
			) {
				newPairCount++;
			}
		}

		// 적게 만난 페어가 50% 이상 선택되어야 함
		expect(newPairCount).toBeGreaterThan(iterations * 0.5);
	});

	test("신규와 경험자가 섞이는 경향이 있다", () => {
		// 10명 중 2명은 베테랑, 2명은 신규
		const participants = createParticipants(6);
		const history: MatchHistory = {
			matches: Array.from({ length: 20 }, (_, i) => ({
				date: `2025-01-${String(i + 1).padStart(2, "0")}`,
				pairs: [
					["user1", "user2"], // 베테랑들
					["user3", "user4"],
					["user5", "user6"], // 신규들 (최근 참여)
				],
			})),
		};
		// user5, user6은 최근에만 참여 (신규)
		history.matches = history.matches.slice(0, 18);
		history.matches.push({
			date: "2025-01-19",
			pairs: [
				["user1", "user5"],
				["user2", "user6"],
				["user3", "user4"],
			],
		});

		let mixedPairCount = 0;
		const iterations = 100;

		for (let i = 0; i < iterations; i++) {
			const pairs = createMatches(participants, history);
			// 신규(user5,user6)끼리만 매칭되는지 확인
			for (const pair of pairs) {
				const ids = pair.map((p) => p.id);
				const hasNewcomer = ids.includes("user5") || ids.includes("user6");
				const hasVeteran = ids.includes("user1") || ids.includes("user2");

				if (hasNewcomer && hasVeteran) {
					mixedPairCount++;
				}
			}
		}

		// 신규-경험자 믹싱이 어느 정도 발생해야 함
		expect(mixedPairCount).toBeGreaterThan(iterations * 0.3);
	});
});
