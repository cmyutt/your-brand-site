// src/app/api/admin/logs/cleanup/route.ts  (생성)
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const days = Number(process.env.ADMIN_LOG_RETENTION_DAYS ?? "90");
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const { count } = await prisma.adminLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return NextResponse.json({ deleted: count, cutoff: cutoff.toISOString() });
}
