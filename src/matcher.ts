import type { MatchHistory, Participant } from "./types.ts";

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
  pairs: Participant[][]
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

function getRecentPairs(history: MatchHistory, lookback: number = 4): Set<string> {
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

export function createMatches(
  participants: Participant[],
  history: MatchHistory
): Participant[][] {
  const recentPairs = getRecentPairs(history);
  const pairs: Participant[][] = [];

  let shuffled = shuffle(participants);
  let attempts = 0;
  const maxAttempts = 100;

  while (shuffled.length >= 2 && attempts < maxAttempts) {
    const pair = shuffled.slice(0, 2);
    const key = pairKey(pair.map((p) => p.id));

    if (recentPairs.has(key)) {
      shuffled = shuffle(shuffled);
      attempts++;
      continue;
    }

    pairs.push(pair);
    shuffled = shuffled.slice(2);
    attempts = 0;
  }

  // 홀수 처리: 마지막 사람을 마지막 조에 추가
  if (shuffled.length === 1 && pairs.length > 0) {
    pairs[pairs.length - 1].push(shuffled[0]);
  }

  return pairs;
}
