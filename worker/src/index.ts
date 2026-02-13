import {
	type APIChatInputApplicationCommandInteraction,
	InteractionResponseType,
	InteractionType,
} from "discord-api-types/v10";
import { handleCommand } from "./handlers.ts";
import { verifyRequest } from "./verify.ts";

interface Env {
	DISCORD_PUBLIC_KEY: string;
	DISCORD_APPLICATION_ID: string;
	DISCORD_BOT_TOKEN: string;
	DISCORD_SERVER_ID: string;
	DISCORD_ROLE_ID: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method !== "POST") {
			return new Response("Method Not Allowed", { status: 405 });
		}

		const signature = request.headers.get("X-Signature-Ed25519");
		const timestamp = request.headers.get("X-Signature-Timestamp");
		if (!signature || !timestamp) {
			return new Response("Unauthorized", { status: 401 });
		}

		const body = await request.text();
		const isValid = await verifyRequest(
			body,
			signature,
			timestamp,
			env.DISCORD_PUBLIC_KEY,
		);
		if (!isValid) {
			return new Response("Unauthorized", { status: 401 });
		}

		const interaction = JSON.parse(body);

		if (interaction.type === InteractionType.Ping) {
			return Response.json({ type: InteractionResponseType.Pong });
		}

		if (interaction.type === InteractionType.ApplicationCommand) {
			return handleCommand(
				interaction as APIChatInputApplicationCommandInteraction,
				env,
			);
		}

		return new Response("Unknown interaction type", { status: 400 });
	},
} satisfies ExportedHandler<Env>;
