import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ✅ Route Handler에서는 params가 Promise 아님
export async function GET(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const { id } = ctx.params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!order) {
    return NextResponse.json(
      { ok: false, error: "order not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { ok: true, status: order.status },
    { headers: { "Cache-Control": "no-store" } } // 🔒 캐시 비활성화
  );
}
