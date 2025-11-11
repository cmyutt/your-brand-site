// CODPATCH: /verify — GET ?token=... → 이메일 인증 처리 후 리다이렉트
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  try {
    const t = await (prisma as any).token.findUnique?.({ where: { token } })
           ?? await (prisma as any).token.findFirst?.({ where: { token } });
    if (!t || t.type !== "EMAIL_VERIFY" || new Date(t.expiresAt).getTime() < Date.now()) {
      return NextResponse.redirect(new URL("/verify/fail", url.origin));
    }
    await (prisma as any).user.update({ where: { id: t.userId }, data: { emailVerifiedAt: new Date() } });
    await (prisma as any).token.delete({ where: { id: t.id } });
    return NextResponse.redirect(new URL("/verify/success", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/verify/fail", url.origin));
  }
}
