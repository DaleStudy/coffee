import type { Participant } from "./types.ts";

function getEnvOrThrow(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`환경변수 ${key}가 설정되지 않았습니다.`);
	}
	return value;
}

const WEBHOOK_URL = getEnvOrThrow("DISCORD_WEBHOOK_URL");

export async function announceMatches(pairs: Participant[][]): Promise<void> {
	const lines = pairs.map((pair, i) => {
		const mentions = pair.map((p) => `<@${p.id}>`).join(" ↔ ");
		const suffix = pair.length > 2 ? " (3인조)" : "";
		return `${i + 1}. ${mentions}${suffix}`;
	});

	const content = `☕ **이번 커피챗 매칭 발표!**

${lines.join("\n")}

2주 안에 커피챗을 진행해주세요! ☕`;

	const response = await fetch(WEBHOOK_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content }),
	});

	if (!response.ok) {
		throw new Error(`Webhook 전송 실패: ${response.status}`);
	}

	console.log("Discord에 매칭 결과 발표 완료");
}
