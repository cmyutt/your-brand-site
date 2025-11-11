// CODPATCH: healthcheck — db & env
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ENV } from "@/lib/env";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, env: { db: !!ENV.DATABASE_URL } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  } finally {
    try { await prisma.$disconnect(); } catch {}
  }
}

