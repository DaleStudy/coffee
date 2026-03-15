import type { Participant } from "./types.ts";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const THREAD_NAME_MAX_LENGTH = 100;

function buildThreadName(group: Participant[]): string {
	const prefix = "☕ ";
	const usernames = group.map((p) => p.username).join(", ");
	const fullName = `${prefix}${usernames}`;

	if (fullName.length <= THREAD_NAME_MAX_LENGTH) {
		return fullName;
	}

	return `${fullName.slice(0, THREAD_NAME_MAX_LENGTH - 3)}...`;
}

export async function createGroupThreads(
	channelId: string,
	botToken: string,
	groups: Participant[][],
): Promise<void> {
	const headers = {
		"Content-Type": "application/json",
		Authorization: `Bot ${botToken}`,
	};

	for (const group of groups) {
		try {
			const threadResponse = await fetch(
				`${DISCORD_API_BASE}/channels/${channelId}/threads`,
				{
					method: "POST",
					headers,
					body: JSON.stringify({
						name: buildThreadName(group),
						type: 11,
						auto_archive_duration: 10080,
					}),
				},
			);

			if (!threadResponse.ok) {
				console.error(`쓰레드 생성 실패: ${threadResponse.status}`);
				continue;
			}

			const thread = (await threadResponse.json()) as { id: string };

			const mentions = group.map((p) => `<@${p.id}>`).join(" ");
			await fetch(`${DISCORD_API_BASE}/channels/${thread.id}/messages`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					content: `${mentions} 커피챗 일정을 잡아보세요! ☕`,
				}),
			});
		} catch (error) {
			console.error("쓰레드 생성 중 오류 발생:", error);
		}
	}

	console.log("Discord에 조별 쓰레드 생성 완료");
}
