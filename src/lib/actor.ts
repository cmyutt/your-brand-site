// src/lib/actor.ts
import { cookies } from "next/headers";

/**
 * 관리자 식별자(이메일/이름 등)를 서버에서 안전하게 얻는다.
 * - Next 14/15 모두 호환( cookies(): sync | async )
 * - 값이 없으면 환경변수 ADMIN_ACTOR_FALLBACK, 그마저 없으면 "admin"
 */
export async function getAdminActor(): Promise<string> {
  try {
    // cookies()가 sync 또는 promise일 수 있으므로 양쪽 모두 처리
    const maybe = (cookies as unknown as () => any)();
    const c = typeof maybe?.then === "function" ? await maybe : maybe;

    const raw =
      c?.get?.("admin_email")?.value ??
      c?.get?.("user_email")?.value ??
      c?.get?.("adminName")?.value ??
      c?.get?.("admin")?.value ??
      c?.get?.("email")?.value ??
      "";

    const actor = String(raw || "").trim();
    // Treat sentinel admin cookie value "1" as not a display name
    if (actor && actor !== "1") return actor;
  } catch {
    // noop
  }

  const fb = (process.env.ADMIN_ACTOR_FALLBACK || "").trim();
  return fb || "admin";
}
