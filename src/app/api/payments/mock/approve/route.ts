import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const paymentId = url.searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ ok: false, error: "paymentId required" }, { status: 400 });

  const res = await fetch(new URL("/api/webhooks/payments", req.url).toString(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-mock-signature": process.env.MOCK_WEBHOOK_SECRET || "",
    },
    body: JSON.stringify({
      event: "payment.paid",
      provider: "mock",
      data: { paymentId, providerPaymentId: `mock_${paymentId}`, status: "PAID" },
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  return NextResponse.json({ ok: true, forwarded: json });
}
