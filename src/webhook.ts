import type { Participant } from "./types.ts";

const DISCORD_API_BASE = "https://discord.com/api/v10";

export async function announceMatches(
	channelId: string,
	botToken: string,
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

	const response = await fetch(
		`${DISCORD_API_BASE}/channels/${channelId}/messages`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bot ${botToken}`,
			},
			body: JSON.stringify({ content }),
		},
	);

	if (!response.ok) {
		throw new Error(`메시지 전송 실패: ${response.status}`);
	}

	console.log("Discord에 매칭 결과 발표 완료");
}
