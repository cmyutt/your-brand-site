import prisma from "@/lib/prisma";
import { bus } from "@/lib/bus";

export async function recordAdminLog(entry: {
  targetType: string;
  targetId: string;
  action: string;
  actor?: string | null;
  note?: string | null;
  snapshot?: unknown;
}) {
  try {
    const created = await prisma.adminLog.create({
      data: {
        targetType: entry.targetType,
        targetId: entry.targetId,
        action: entry.action,
        actor: entry.actor ?? undefined,
        note: entry.note ?? undefined,
        // snapshot은 민감정보 최소화해서 넣기 권장
        snapshot: entry.snapshot as any,
      },
    });
    try {
      await bus.publish("logs:update", {
        id: created.id,
        action: created.action,
        targetType: created.targetType,
        targetId: created.targetId,
      });
    } catch {
      /* ignore */
    }
  } catch {
    /* noop */
  }
}
