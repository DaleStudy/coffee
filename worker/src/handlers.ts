import {
	type APIChatInputApplicationCommandInteraction,
	ApplicationCommandOptionType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import { addRole, removeRole } from "./discord-api.ts";

interface Env {
	DISCORD_BOT_TOKEN: string;
	DISCORD_SERVER_ID: string;
	DISCORD_ROLE_ID: string;
}

export async function handleCommand(
	interaction: APIChatInputApplicationCommandInteraction,
	env: Env,
): Promise<Response> {
	const subcommand = interaction.data.options?.find(
		(opt) => opt.type === ApplicationCommandOptionType.Subcommand,
	);

	if (!subcommand) {
		return ephemeral("알 수 없는 명령어입니다.");
	}

	const userId = interaction.member?.user?.id ?? interaction.user?.id;
	if (!userId) {
		return ephemeral("사용자 정보를 확인할 수 없습니다.");
	}

	switch (subcommand.name) {
		case "join":
			return handleJoin(userId, env);
		case "leave":
			return handleLeave(userId, env);
		default:
			return ephemeral("알 수 없는 명령어입니다.");
	}
}

async function handleJoin(userId: string, env: Env): Promise<Response> {
	try {
		await addRole(
			env.DISCORD_BOT_TOKEN,
			env.DISCORD_SERVER_ID,
			userId,
			env.DISCORD_ROLE_ID,
		);
		return ephemeral("☕ 커피챗에 참여했습니다! 다음 매칭을 기다려주세요.");
	} catch {
		return ephemeral(
			"참여 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
		);
	}
}

async function handleLeave(userId: string, env: Env): Promise<Response> {
	try {
		await removeRole(
			env.DISCORD_BOT_TOKEN,
			env.DISCORD_SERVER_ID,
			userId,
			env.DISCORD_ROLE_ID,
		);
		return ephemeral(
			"👋 커피챗 참여를 중단했습니다. 언제든 다시 참여할 수 있습니다!",
		);
	} catch {
		return ephemeral(
			"탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
		);
	}
}

function ephemeral(content: string): Response {
	return Response.json({
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			content,
			flags: MessageFlags.Ephemeral,
		},
	});
}
