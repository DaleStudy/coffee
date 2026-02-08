import { COFFEE_COMMAND } from "../src/commands.ts";

const wranglerConfig = await import("../wrangler.jsonc");
const devVars = await Bun.file(new URL("../.dev.vars", import.meta.url)).text();

const APPLICATION_ID =
	process.env.DISCORD_APPLICATION_ID ??
	wranglerConfig.vars?.DISCORD_APPLICATION_ID;

const BOT_TOKEN =
	process.env.DISCORD_BOT_TOKEN ??
	devVars.match(/^DISCORD_BOT_TOKEN=(.+)$/m)?.[1];

if (!APPLICATION_ID || !BOT_TOKEN) {
	console.error(
		"DISCORD_APPLICATION_ID와 DISCORD_BOT_TOKEN을 찾을 수 없습니다.\nwrangler.jsonc, .dev.vars, 또는 환경변수로 설정해주세요.",
	);
	process.exit(1);
}

const url = `https://discord.com/api/v10/applications/${APPLICATION_ID}/commands`;

const response = await fetch(url, {
	method: "PUT",
	headers: {
		"Content-Type": "application/json",
		Authorization: `Bot ${BOT_TOKEN}`,
	},
	body: JSON.stringify([COFFEE_COMMAND]),
});

if (!response.ok) {
	const error = await response.text();
	console.error(`명령어 등록 실패: ${response.status}\n${error}`);
	process.exit(1);
}

const result = await response.json();
console.log(`✅ ${(result as unknown[]).length}개 명령어 등록 완료`);
