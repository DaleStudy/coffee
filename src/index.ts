import { getParticipants } from "./discord.ts";
import { createMatches, loadHistory, saveHistory } from "./matcher.ts";
import { announceMatches } from "./webhook.ts";

async function main() {
	console.log("☕ 커피챗 매칭을 시작합니다...\n");

	// 1. 참여자 목록 조회
	const participants = await getParticipants();
	console.log(`참여자 ${participants.length}명 조회 완료`);

	if (participants.length < 2) {
		console.log("참여자가 2명 미만이어서 매칭을 진행할 수 없습니다.");
		return;
	}

	// 2. 매칭 이력 로드
	const history = await loadHistory();

	// 3. 매칭 생성
	const pairs = createMatches(participants, history);
	console.log(`${pairs.length}개 조 매칭 완료`);

	if (pairs.length === 0) {
		console.log("생성된 매칭이 없어 Discord에 발표하지 않습니다.");
		return;
	}

	// 4. 매칭 이력 저장
	await saveHistory(history, pairs);

	// 5. Discord에 발표
	await announceMatches(pairs);

	console.log("\n✅ 커피챗 매칭이 완료되었습니다!");
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
