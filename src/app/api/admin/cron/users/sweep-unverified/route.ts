// CODPATCH: sweep unverified users older than 1 day
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/adminAudit";

export async function GET(req: Request) {
  const key = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || key !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const cutoff = new Date(Date.now() - 24 * 3600 * 1000);
  const targets = await (prisma as any).user.findMany({
    where: { emailVerifiedAt: null, createdAt: { lt: cutoff } },
    select: { id: true, email: true },
  });

  for (const u of targets) {
    try {
      await (prisma as any).user.delete({ where: { id: u.id } });
      await recordAdminAudit({ action: "CRON_USER_PURGE", target: u.id, ok: true, message: u.email });
    } catch (e: any) {
      await recordAdminAudit({ action: "CRON_USER_PURGE", target: u.id, ok: false, message: e?.message });
    }
  }

  return NextResponse.json({ ok: true, deleted: targets.length });
}

