import type { Participant } from "./types.ts";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const THREAD_NAME_MAX_LENGTH = 100;

function buildThreadName(displayName: string, groupIndex: number): string {
	const name = `☕ ${displayName} ${groupIndex}조`;

	if (name.length <= THREAD_NAME_MAX_LENGTH) {
		return name;
	}

	return `${name.slice(0, THREAD_NAME_MAX_LENGTH - 3)}...`;
}

export async function createGroupThreads(
	channelId: string,
	botToken: string,
	groups: Participant[][],
	displayName: string,
): Promise<void> {
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bot ${botToken}`,
	};

	for (let i = 0; i < groups.length; i++) {
		const group = groups[i];
		try {
			const threadResponse = await fetch(
				`${DISCORD_API_BASE}/channels/${channelId}/threads`,
				{
					method: "POST",
					headers,
					body: JSON.stringify({
						name: buildThreadName(displayName, i + 1),
						type: 11,
						auto_archive_duration: 10080,
					}),
				},
			);

			if (!threadResponse.ok) {
				const body = await threadResponse.text();
				console.error(`쓰레드 생성 실패: ${threadResponse.status} ${body}`);
				continue;
			}

			const thread = (await threadResponse.json()) as { id: string };

			const mentions = group.map((p) => `<@${p.id}>`).join(" ");
			await fetch(`${DISCORD_API_BASE}/channels/${thread.id}/messages`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					content: `${mentions}\n반가워요! 편하게 시간 맞춰서 커피챗 해보세요 ☕\n서로 가능한 일정을 조율해서 디스코드에 이벤트를 생성해주세요!`,
				}),
			});
		} catch (error) {
			console.error("쓰레드 생성 중 오류 발생:", error);
		}
	}

	console.log("Discord에 조별 쓰레드 생성 완료");
}
