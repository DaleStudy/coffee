const DISCORD_API = "https://discord.com/api/v10";

export async function addRole(
	botToken: string,
	guildId: string,
	userId: string,
	roleId: string,
): Promise<void> {
	const response = await fetch(
		`${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
		{
			method: "PUT",
			headers: {
				Authorization: `Bot ${botToken}`,
				"X-Audit-Log-Reason": encodeURIComponent("커피챗 참여 (/coffee join)"),
			},
		},
	);

	if (!response.ok) {
		const body = await response.text();
		console.error(`Role 추가 실패: ${response.status} ${body}`);
		throw new Error(`Role 추가 실패: ${response.status}`);
	}
}

export async function removeRole(
	botToken: string,
	guildId: string,
	userId: string,
	roleId: string,
): Promise<void> {
	const response = await fetch(
		`${DISCORD_API}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
		{
			method: "DELETE",
			headers: {
				Authorization: `Bot ${botToken}`,
				"X-Audit-Log-Reason": encodeURIComponent("커피챗 탈퇴 (/coffee leave)"),
			},
		},
	);

	if (!response.ok) {
		const body = await response.text();
		console.error(`Role 제거 실패: ${response.status} ${body}`);
		throw new Error(`Role 제거 실패: ${response.status}`);
	}
}
