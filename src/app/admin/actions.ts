// src/app/admin/actions.ts  (생성)
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
// CODPATCH: admin actions — use redirector
import { redirectInfo } from "@/lib/redirector";

export async function logoutAction() {
  const jar = await cookies();
  // 확실 삭제: path 지정 + 만료 처리
  jar.set("admin", "", { path: "/", maxAge: 0 });
  redirectInfo("/admin/login", "로그아웃되었습니다");
}
