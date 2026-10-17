import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
	adapter: cloudflare(),
	session: false,
	// 정규 URL은 슬래시 없는 형태다. 사전 렌더링 페이지도 about.html 로 만들어 같은 형태로 서빙한다
	trailingSlash: "never",
	build: { format: "file" },
});
