// CODPATCH: order row api — return latest compact row
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { id: string } };

export async function GET(_: Request, context: RouteContext) {
  const id = context.params?.id;
  const row = await (prisma as any).order.findUnique?.({
    where: { id },
    select: { id: true, status: true },
  });
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, row });
}
