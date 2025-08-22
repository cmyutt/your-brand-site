import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function verifyMockSignature(headers: Headers) {
  const sig = headers.get("x-mock-signature") || "";
  return sig.length > 0 && sig === (process.env.MOCK_WEBHOOK_SECRET || "");
}

export async function POST(req: Request) {
  if (!verifyMockSignature(req.headers)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { event, provider, data } = body as { event?: string; provider?: string; data?: any };

  if (provider !== "mock" || !data?.paymentId) {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { id: data.paymentId } });
  if (!payment) return NextResponse.json({ ok: false, error: "payment not found" }, { status: 404 });

  let nextPaymentStatus = payment.status;
  let nextOrderStatus: "PAID" | "CANCELED" | undefined;

  switch (event) {
    case "payment.paid":
      nextPaymentStatus = "PAID";
      nextOrderStatus = "PAID";
      break;
    case "payment.failed":
      nextPaymentStatus = "FAILED";
      nextOrderStatus = "CANCELED";
      break;
    case "payment.canceled":
      nextPaymentStatus = "CANCELED";
      nextOrderStatus = "CANCELED";
      break;
    default:
      return NextResponse.json({ ok: true, skipped: true });
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: nextPaymentStatus,
      providerPaymentId: data.providerPaymentId ?? payment.providerPaymentId,
      failureCode: data.failureCode ?? null,
      failureMessage: data.failureMessage ?? null,
    },
  });

  if (nextOrderStatus) {
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: nextOrderStatus } });
  }

  return NextResponse.json({ ok: true, payment: updated, orderUpdated: Boolean(nextOrderStatus) });
}
