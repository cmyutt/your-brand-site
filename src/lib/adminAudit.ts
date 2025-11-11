// CODPATCH: admin audit — safe logger (no hard dependency)
import prisma from "@/lib/prisma";
import { getAdminActor } from "@/lib/actor";

type AuditPayload = {
  action: string;
  target?: string | null;
  meta?: Record<string, any> | null;
  ok: boolean;
  message?: string | null;
};

export async function recordAdminAudit(p: AuditPayload) {
  try {
    const actor = (await getAdminActor()) ?? "admin";
    const data: any = {
      targetType: "audit",
      targetId: p.target ?? null,
      action: p.action,
      actor,
      note: p.message ?? null,
      snapshot: { ok: p.ok, ...(p.meta ?? {}) },
    };
    // 프로젝트 스키마에 따라 없는 경우도 무시
    // @ts-ignore
    if ((prisma as any).adminLog?.create) {
      await (prisma as any).adminLog.create({ data });
    }
  } catch {
    // 로깅 실패는 본 흐름을 방해하지 않음
  }
}

