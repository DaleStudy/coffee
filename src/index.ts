import rolesConfig from "../data/roles.json";
import { getParticipants } from "./discord.ts";
import { createMatches, loadHistory, saveHistory } from "./matcher.ts";
import { shouldRunToday } from "./schedule.ts";
import type { RoleConfig } from "./types.ts";
import { announceMatches } from "./webhook.ts";

const roles = rolesConfig as RoleConfig[];

async function main() {
	console.log("☕ 커피챗 매칭을 시작합니다...\n");

	for (const role of roles) {
		console.log(`--- [${role.displayName}] 역할 처리 중 ---`);

		// 스케줄 체크
		if (!shouldRunToday(role.schedule)) {
			console.log(
				`${role.displayName}: 이번 주는 매칭 주가 아닙니다. 건너뜁니다.`,
			);
			continue;
		}

		// 웹훅 URL 확인
		const webhookUrl = process.env[role.webhookEnvKey];
		if (!webhookUrl) {
			console.error(
				`환경변수 ${role.webhookEnvKey}가 설정되지 않았습니다. ${role.displayName} 건너뜁니다.`,
			);
			continue;
		}

		// 1. 참여자 목록 조회
		const participants = await getParticipants(role.roleId);
		console.log(
			`${role.displayName}: 참여자 ${participants.length}명 조회 완료`,
		);

		if (participants.length < 2) {
			console.log(
				`${role.displayName}: 참여자가 2명 미만이어서 매칭을 진행할 수 없습니다.`,
			);
			continue;
		}

		// 2. 매칭 이력 로드
		const history = await loadHistory(role.name);

		// 3. 매칭 생성
		const groups = createMatches(participants, history, {
			groupSize: role.groupSize,
		});
		console.log(`${role.displayName}: ${groups.length}개 조 매칭 완료`);

		if (groups.length === 0) {
			console.log(
				`${role.displayName}: 생성된 매칭이 없어 Discord에 발표하지 않습니다.`,
			);
			continue;
		}

		// 4. 매칭 이력 저장
		await saveHistory(role.name, history, groups);

		// 5. Discord에 발표
		await announceMatches(webhookUrl, groups, role.displayName);

		console.log(`${role.displayName}: ✅ 매칭 완료!`);
	}

	console.log("\n✅ 모든 역할의 커피챗 매칭이 완료되었습니다!");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
