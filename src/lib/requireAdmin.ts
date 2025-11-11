// src/lib/requireAdmin.ts  (생성)
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** 비로그인이면 /admin/login?next=... 로 즉시 리다이렉트 */
export async function requireAdmin(nextPath: string) {
  const jar = await cookies();
  const ok = jar.get("admin")?.value === "1";
  if (!ok) redirect(`/admin/login?next=${encodeURIComponent(nextPath)}`);
}
