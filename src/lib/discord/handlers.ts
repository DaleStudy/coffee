import {
	type APIApplicationCommandAutocompleteInteraction,
	type APIChatInputApplicationCommandInteraction,
	ApplicationCommandOptionType,
	InteractionResponseType,
	MessageFlags,
} from "discord-api-types/v10";
import rolesConfig from "../../../data/roles.json";
import type { RoleConfig } from "../../../data/types.ts";
import { addRole, removeRole } from "./discord-api.ts";

interface Env {
	DISCORD_BOT_TOKEN: string;
	DISCORD_SERVER_ID: string;
}

export function handleAutocomplete(
	interaction: APIApplicationCommandAutocompleteInteraction,
): Response {
	const subcommand = interaction.data.options?.find(
		(opt) => opt.type === ApplicationCommandOptionType.Subcommand,
	);

	const focusedOption =
		subcommand?.type === ApplicationCommandOptionType.Subcommand
			? subcommand.options?.find((opt: { focused?: boolean }) => opt.focused)
			: undefined;

	const query = (
		focusedOption && "value" in focusedOption ? String(focusedOption.value) : ""
	).toLowerCase();

	const choices = (rolesConfig as RoleConfig[])
		.filter(
			(role) =>
				role.name.toLowerCase().includes(query) ||
				role.displayName.toLowerCase().includes(query),
		)
		.slice(0, 25)
		.map((role) => ({
			name: role.displayName,
			value: role.name,
		}));

	return Response.json({
		type: InteractionResponseType.ApplicationCommandAutocompleteResult,
		data: { choices },
	});
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

	// role 옵션 추출
	const roleOption =
		subcommand.type === ApplicationCommandOptionType.Subcommand
			? subcommand.options?.find(
					(opt) =>
						opt.type === ApplicationCommandOptionType.String &&
						opt.name === "role",
				)
			: undefined;

	const roleName =
		roleOption && "value" in roleOption ? String(roleOption.value) : undefined;

	if (!roleName) {
		return ephemeral("역할을 선택해주세요.");
	}

	const roleConfig = (rolesConfig as RoleConfig[]).find(
		(r) => r.name === roleName,
	);
	if (!roleConfig) {
		return ephemeral("존재하지 않는 역할입니다.");
	}

	switch (subcommand.name) {
		case "join":
			return handleJoin(userId, roleConfig, env);
		case "leave":
			return handleLeave(userId, roleConfig, env);
		default:
			return ephemeral("알 수 없는 명령어입니다.");
	}
}

async function handleJoin(
	userId: string,
	role: RoleConfig,
	env: Env,
): Promise<Response> {
	try {
		await addRole(
			env.DISCORD_BOT_TOKEN,
			env.DISCORD_SERVER_ID,
			userId,
			role.roleId,
		);
		return ephemeral(
			`☕ ${role.displayName}에 참여했습니다! 다음 매칭을 기다려주세요.`,
		);
	} catch {
		return ephemeral(
			"참여 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
		);
	}
}

async function handleLeave(
	userId: string,
	role: RoleConfig,
	env: Env,
): Promise<Response> {
	try {
		await removeRole(
			env.DISCORD_BOT_TOKEN,
			env.DISCORD_SERVER_ID,
			userId,
			role.roleId,
		);
		return ephemeral(
			`👋 ${role.displayName} 참여를 중단했습니다. 언제든 다시 참여할 수 있습니다!`,
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
