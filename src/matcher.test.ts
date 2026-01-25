import { describe, test, expect } from "bun:test";
import { createMatches } from "./matcher.ts";
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

  test("홀수 인원일 때 마지막 조가 3인이 된다", () => {
    const participants = createParticipants(5);
    const history: MatchHistory = { matches: [] };

    const pairs = createMatches(participants, history);

    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toHaveLength(2);
    expect(pairs[1]).toHaveLength(3);
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
          .join(",")
      );

      if (!pairKeys.includes("user1,user2") && !pairKeys.includes("user3,user4")) {
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
