import {
	ApplicationCommandOptionType,
	type RESTPostAPIApplicationCommandsJSONBody,
} from "discord-api-types/v10";

export const COFFEE_COMMAND: RESTPostAPIApplicationCommandsJSONBody = {
	name: "coffee",
	description: "커피챗 관련 명령어",
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "join",
			description: "커피챗에 참여합니다",
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: "leave",
			description: "커피챗 참여를 중단합니다",
		},
	],
};
