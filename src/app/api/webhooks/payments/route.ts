// src/app/api/webhooks/payments/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { recordPaymentWebhook, recordStatusChange } from "@/lib/orderEvents";
import { recordAdminAudit } from "@/lib/adminAudit";
import { verifyHmac } from "@/lib/webhooks/hmac";
import { claimOnce } from "@/lib/webhooks/idempotency";
import { ENV } from "@/lib/env";

function verifyMockSignature(headers: Headers) {
  const sig = headers.get("x-mock-signature") || "";
  return sig.length > 0 && sig === (process.env.MOCK_WEBHOOK_SECRET || "");
}

export async function POST(req: Request) {
  // 0) raw body (HMAC/idem 용)
  const raw = Buffer.from(await req.arrayBuffer());

  // 1) HMAC (옵션) — PAYMENT_WEBHOOK_SECRET 이 설정된 경우만 검증
  try {
    const secret = (ENV as any).PAYMENT_WEBHOOK_SECRET ?? process.env.PAYMENT_WEBHOOK_SECRET ?? "";
    if (secret) {
      const ok = verifyHmac({
        raw,
        secret,
        headers: {
          signature: req.headers.get("X-Signature"),
          timestamp: req.headers.get("X-Timestamp"),
          algo: req.headers.get("X-Signature-Alg") ?? "sha256",
        },
      });
      if (!ok) {
        await recordAdminAudit({ action: "PAYMENT_WEBHOOK_HMAC", ok: false, message: "invalid hmac" });
        return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
      }
    } else {
      // 기존 mock 시그니처 체크 (환경에 따라 사용)
      if (!verifyMockSignature(req.headers)) {
        return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
      }
    }
  } catch {}

  const text = raw.toString("utf8");
  const body = (text ? JSON.parse(text) : ({} as unknown));
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

  // 2) Idempotency — 이벤트 ID/헤더 기반
  try {
    const eventId = (body as any)?.id ?? req.headers.get("X-Event-Id") ?? `${data.paymentId}:${event}`;
    if (eventId) {
      const first = await claimOnce(`pay:${eventId}`, 24 * 60 * 60);
      if (!first) {
        await recordAdminAudit({ action: "PAYMENT_WEBHOOK_DUP", ok: true, target: data.paymentId, message: eventId });
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }
  } catch {}

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
      // 알 수 없는 이벤트도 웹훅 이력만 남기고 스킵
      await recordPaymentWebhook({
        orderId: payment.orderId,
        note: `unknown event: ${String(event)}`,
      });
      await recordAdminAudit({ action: "PAYMENT_WEBHOOK_UNKNOWN", ok: true, target: payment.orderId, message: String(event) });
      return NextResponse.json({ ok: true, skipped: true });
  }

  // 결제 이력 기록
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

  // 결제/주문 상태 업데이트
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

  await recordAdminAudit({ action: "PAYMENT_WEBHOOK", ok: true, target: payment.orderId, message: `${event} → ${nextOrderStatus ?? "PAYMENT_ONLY"}` });

  return NextResponse.json({ ok: true, payment: updated, orderUpdated: Boolean(nextOrderStatus) });
}
