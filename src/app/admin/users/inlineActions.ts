"use server";

import { prisma } from "@/lib/prisma";
import { bus } from "@/lib/bus";
import { recordAdminAudit } from "@/lib/adminAudit";
import { sendMail, buildLink } from "@/lib/email";
import crypto from "node:crypto";

type Res = { kind: "ok"; message: string } | { kind: "fail"; message: string };

export async function deleteUserInline(_: any, fd: FormData): Promise<Res> {
  const id = String(fd.get("id") ?? "");
  if (!id) return { kind: "fail", message: "잘못된 요청입니다." };
  try {
    await (prisma as any).user.delete({ where: { id } });
    await recordAdminAudit({ action: "ADMIN_USER_DELETE", target: id, ok: true });
    try {
      await bus.publish("admin:users", { id, action: "delete" });
    } catch {}
    return { kind: "ok", message: "계정을 삭제했습니다." };
  } catch (e: any) {
    await recordAdminAudit({ action: "ADMIN_USER_DELETE", target: id, ok: false, message: e?.message });
    return { kind: "fail", message: "삭제에 실패했습니다." };
  }
}

export async function resendVerifyInline(_: any, fd: FormData): Promise<Res> {
  const id = String(fd.get("id") ?? "");
  if (!id) return { kind: "fail", message: "잘못된 요청입니다." };
  try {
    const user = await (prisma as any).user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user?.email) return { kind: "fail", message: "계정을 찾을 수 없습니다." };

    const token = crypto.randomBytes(32).toString("base64url");
    await (prisma as any).token.create({
      data: {
        userId: user.id,
        type: "EMAIL_VERIFY",
        token,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    });
    const link = buildLink("/verify", { token });
    await sendMail(
      user.email,
      "[Your Brand] 이메일 인증을 완료해 주세요",
      `<p><a href="${link}">여기를 눌러 인증을 완료해 주세요</a></p><p>${link}</p>`
    );
    await recordAdminAudit({ action: "ADMIN_USER_RESEND_VERIFY", target: id, ok: true });
    return { kind: "ok", message: "인증 메일을 보냈습니다." };
  } catch (e: any) {
    return { kind: "fail", message: "메일 발송에 실패했습니다." };
  }
}
