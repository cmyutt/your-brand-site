import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ ok: false, error: "paymentId required" }, { status: 400 });

  // 1) 웹훅 시뮬레이트
  const webhookRes = await fetch(new URL("/api/webhooks/payments", req.url).toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-mock-signature": process.env.MOCK_WEBHOOK_SECRET || "",
    },
    body: JSON.stringify({
      event: "payment.failed",
      provider: "mock",
      data: { paymentId, status: "FAILED", failureCode: "MOCK_ERR", failureMessage: "User canceled" },
    }),
    cache: "no-store",
  });
  await webhookRes.json().catch(() => ({}));

  // 2) 결과 페이지로 리다이렉트
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, select: { orderId: true } });
  if (!payment) return NextResponse.json({ ok: false, error: "payment not found" }, { status: 404 });

  const resultUrl = new URL(`/orders/${payment.orderId}/result`, req.url);
  resultUrl.searchParams.set("status", "CANCELED");
  return NextResponse.redirect(resultUrl, { status: 302 });
}
