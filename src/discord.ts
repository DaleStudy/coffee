import { Client, GatewayIntentBits } from "discord.js";
import type { Participant } from "./types.ts";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const SERVER_ID = process.env.DISCORD_SERVER_ID!;
const ROLE_ID = process.env.DISCORD_ROLE_ID!;

export async function getParticipants(): Promise<Participant[]> {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  await client.login(DISCORD_BOT_TOKEN);

  try {
    const guild = await client.guilds.fetch(SERVER_ID);
    const members = await guild.members.fetch();

    const participants = members
      .filter((member) => member.roles.cache.has(ROLE_ID) && !member.user.bot)
      .map((member) => ({
        id: member.user.id,
        username: member.user.username,
      }));

    return participants;
  } finally {
    await client.destroy();
  }
}
