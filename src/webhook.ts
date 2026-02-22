import type { Participant } from "./types.ts";

export async function announceMatches(
	webhookUrl: string,
	groups: Participant[][],
	displayName?: string,
): Promise<void> {
	const lines = groups.map((group, i) => {
		const mentions = group.map((p) => `<@${p.id}>`).join(" ↔ ");
		const suffix = group.length > 2 ? ` (${group.length}인조)` : "";
		return `${i + 1}. ${mentions}${suffix}`;
	});

	const title = displayName
		? `☕ **이번 ${displayName} 매칭 발표!**`
		: "☕ **이번 커피챗 매칭 발표!**";

	const content = `${title}

${lines.join("\n")}

2주 안에 커피챗을 진행해주세요! ☕`;

	const response = await fetch(webhookUrl, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ content }),
	});

	if (!response.ok) {
		throw new Error(`Webhook 전송 실패: ${response.status}`);
	}

	console.log("Discord에 매칭 결과 발표 완료");
}
