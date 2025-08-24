// src/app/api/webhooks/payments/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

function verifyMockSignature(headers: Headers) {
  const sig = headers.get("x-mock-signature") || "";
  return sig.length > 0 && sig === (process.env.MOCK_WEBHOOK_SECRET || "");
}

type WebhookData = {
  paymentId?: string;
  providerPaymentId?: string;
  failureCode?: string;
  failureMessage?: string | null;
};

type WebhookBody = {
  event?: "payment.paid" | "payment.failed" | "payment.canceled" | string;
  provider?: "mock" | string;
  data?: WebhookData;
};

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function asBody(x: unknown): WebhookBody {
  if (!isObject(x)) return {};
  return x as WebhookBody;
}

export async function POST(req: Request) {
  if (!verifyMockSignature(req.headers)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  const raw: unknown = await req.json().catch(() => ({}));
  const { event, provider, data } = asBody(raw);

  if (provider !== "mock" || !isObject(data) || typeof data.paymentId !== "string") {
    return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({ where: { id: data.paymentId } });
  if (!payment) return NextResponse.json({ ok: false, error: "payment not found" }, { status: 404 });

  let nextPaymentStatus = payment.status as "PAID" | "FAILED" | "CANCELED";
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
      providerPaymentId:
        typeof data.providerPaymentId === "string" ? data.providerPaymentId : payment.providerPaymentId,
      failureCode: typeof data.failureCode === "string" ? data.failureCode : null,
      failureMessage:
        typeof data.failureMessage === "string" ? data.failureMessage : null,
    },
  });

  if (nextOrderStatus) {
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: nextOrderStatus } });
  }

  return NextResponse.json({ ok: true, payment: updated, orderUpdated: Boolean(nextOrderStatus) });
}
