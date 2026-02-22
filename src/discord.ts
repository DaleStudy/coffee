import { Client, GatewayIntentBits } from "discord.js";
import type { Participant } from "./types.ts";

function getEnvOrThrow(key: string): string {
	const value = process.env[key];
	if (!value) {
		throw new Error(`환경변수 ${key}가 설정되지 않았습니다.`);
	}
	return value;
}

export async function getParticipants(roleId: string): Promise<Participant[]> {
	const DISCORD_BOT_TOKEN = getEnvOrThrow("DISCORD_BOT_TOKEN");
	const SERVER_ID = getEnvOrThrow("DISCORD_SERVER_ID");

	const client = new Client({
		intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
	});

	await client.login(DISCORD_BOT_TOKEN);

	try {
		const guild = await client.guilds.fetch(SERVER_ID);
		const members = await guild.members.fetch();

		const participants = members
			.filter((member) => member.roles.cache.has(roleId) && !member.user.bot)
			.map((member) => ({
				id: member.user.id,
				username: member.user.username,
			}));

		return participants;
	} finally {
		await client.destroy();
	}
}
