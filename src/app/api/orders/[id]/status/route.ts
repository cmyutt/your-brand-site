// src/app/api/orders/[id]/status/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Next 15(App Router)에서는 route handler의 2번째 인자에서
 * params가 Promise 로 들어옵니다. 따라서 `await context.params`가 필요합니다.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      createdAt: true,
      customerId: true,
    },
  });

  if (!order) {
    return NextResponse.json({ ok: false, error: "order not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, order });
}
