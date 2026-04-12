import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import {
	type APIApplicationCommandAutocompleteInteraction,
	type APIChatInputApplicationCommandInteraction,
	InteractionResponseType,
	InteractionType,
} from "discord-api-types/v10";
import {
	handleAutocomplete,
	handleCommand,
} from "../../lib/discord/handlers.ts";
import { verifyRequest } from "../../lib/discord/verify.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
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

	if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
		return handleAutocomplete(
			interaction as APIApplicationCommandAutocompleteInteraction,
		);
	}

	if (interaction.type === InteractionType.ApplicationCommand) {
		return handleCommand(
			interaction as APIChatInputApplicationCommandInteraction,
			{
				DISCORD_BOT_TOKEN: env.DISCORD_BOT_TOKEN,
				DISCORD_SERVER_ID: env.DISCORD_SERVER_ID,
			},
		);
	}

	return new Response("Unknown interaction type", { status: 400 });
};
