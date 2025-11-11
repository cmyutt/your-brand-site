// CODPATCH: env-check — load .env(.local) first, THEN import ENV
import { config } from "dotenv";
import { existsSync } from "node:fs";

// 1) .env.local 있으면 그걸, 없으면 .env를 로드
config({ path: existsSync(".env.local") ? ".env.local" : ".env" });

// 2) dotenv 로드가 끝난 다음에 ENV를 불러온다(정적 import 금지)
const { ENV } = await import("../src/lib/env"); // <-- 상대경로 중요!

console.log("[env] OK", Object.keys(ENV));
