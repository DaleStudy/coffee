import type { Participant } from "./types.ts";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const THREAD_NAME_MAX_LENGTH = 100;
const GUILD_FORUM_CHANNEL_TYPE = 15;

function buildThreadName(displayName: string, groupIndex: number): string {
	const name = `☕ ${displayName} ${groupIndex}조`;

	if (name.length <= THREAD_NAME_MAX_LENGTH) {
		return name;
	}

	return `${name.slice(0, THREAD_NAME_MAX_LENGTH - 3)}...`;
}

function buildMessageContent(group: Participant[]): string {
	const mentions = group.map((p) => `<@${p.id}>`).join(" ");
	return `${mentions}\n반가워요! 편하게 시간 맞춰서 커피챗 해보세요 ☕\n서로 가능한 일정을 조율해서 디스코드에 이벤트를 생성해주세요!`;
}

async function isForumChannel(
	channelId: string,
	headers: Record<string, string>,
): Promise<boolean> {
	const res = await fetch(`${DISCORD_API_BASE}/channels/${channelId}`, {
		headers,
	});
	if (!res.ok) return false;
	const channel = (await res.json()) as { type: number };
	return channel.type === GUILD_FORUM_CHANNEL_TYPE;
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

	const forum = await isForumChannel(channelId, headers);

	for (let i = 0; i < groups.length; i++) {
		const group = groups[i];
		const content = buildMessageContent(group);
		try {
			const threadBody = forum
				? {
						name: buildThreadName(displayName, i + 1),
						auto_archive_duration: 10080,
						message: { content },
					}
				: {
						name: buildThreadName(displayName, i + 1),
						type: 11,
						auto_archive_duration: 10080,
					};

			const threadResponse = await fetch(
				`${DISCORD_API_BASE}/channels/${channelId}/threads`,
				{
					method: "POST",
					headers,
					body: JSON.stringify(threadBody),
				},
			);

			if (!threadResponse.ok) {
				const body = await threadResponse.text();
				console.error(`쓰레드 생성 실패: ${threadResponse.status} ${body}`);
				continue;
			}

			if (!forum) {
				const thread = (await threadResponse.json()) as { id: string };
				await fetch(`${DISCORD_API_BASE}/channels/${thread.id}/messages`, {
					method: "POST",
					headers,
					body: JSON.stringify({ content }),
				});
			}
		} catch (error) {
			console.error("쓰레드 생성 중 오류 발생:", error);
		}
	}

	console.log("Discord에 조별 쓰레드 생성 완료");
}
