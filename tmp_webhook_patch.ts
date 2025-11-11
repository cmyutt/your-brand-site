// src/app/api/webhooks/payments/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordPaymentWebhook, recordStatusChange } from "@/lib/orderEvents";

function verifyMockSignature(headers: Headers) {
  const sig = headers.get("x-mock-signature") || "";
  return sig.length > 0 && sig === (process.env.MOCK_WEBHOOK_SECRET || "");
}

export async function POST(req: Request) {
  if (!verifyMockSignature(req.headers)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as unknown));
  const { event, provider, data } = body as {
    event?: "payment.paid" | "payment.failed" | "payment.canceled";
    provider?: string;
    data?: {
      paymentId?: string;
      providerPaymentId?: string | null;
      failureCode?: string | null;
      failureMessage?: string | null;
    };
  };

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
      // ?????†ëŠ” ?´ë²¤?¸ë„ ?¹í›… ?´ë ¥ë§??¨ê¸°ê³??¤í‚µ
      await recordPaymentWebhook({
        orderId: payment.orderId,
        note: `unknown event: ${String(event)}`,
      });
      return NextResponse.json({ ok: true, skipped: true });
  }

  // ê²°ì œ ?´ë ¥ ê¸°ë¡
  await recordPaymentWebhook({
    orderId: payment.orderId,
    note: `provider=${provider}, providerPaymentId=${data.providerPaymentId ?? ""}`,
    payload: {
      from: payment.status,
      to: nextPaymentStatus,
      event,
      provider,
      providerPaymentId: data.providerPaymentId ?? null,
    },
  });

  // ê²°ì œ/ì£¼ë¬¸ ?íƒœ ?…ë°?´íŠ¸
  const updated = await prisma.$transaction(async (db) => {
    const p = await db.payment.update({
      where: { id: payment.id },
      data: {
        status: nextPaymentStatus,
        providerPaymentId: data.providerPaymentId ?? payment.providerPaymentId,
        failureCode: data.failureCode ?? null,
        failureMessage: data.failureMessage ?? null,
      },
    });

    if (nextOrderStatus) {
      const prev = await db.order.findUnique({
        where: { id: payment.orderId },
        select: { status: true },
      });
      if (prev && prev.status !== nextOrderStatus) {
        await db.order.update({ where: { id: payment.orderId }, data: { status: nextOrderStatus } });
        await recordStatusChange({
          orderId: payment.orderId,
          from: prev.status,
          to: nextOrderStatus,
          note: `via webhook: ${event}`,
          actor: "system",
        });
      }
    }

    return p;
  });

  return NextResponse.json({ ok: true, payment: updated, orderUpdated: Boolean(nextOrderStatus) });
}

