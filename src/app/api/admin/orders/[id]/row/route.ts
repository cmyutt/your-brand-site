// CODPATCH: order row api — return latest compact row
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const row = await (prisma as any).order.findUnique?.({
    where: { id },
    select: { id: true, status: true },
  });
  if (!row) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json({ ok: true, row });
}

