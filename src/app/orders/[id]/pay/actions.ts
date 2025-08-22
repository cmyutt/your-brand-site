"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function initiatePayment(orderId: string) {
  if (!orderId) throw new Error("orderId required");

  // 배포/로컬 모두 동작하도록 base URL 계산
  const hdrs = headers();
  const host = hdrs.get("host");
  const protocol = process.env.VERCEL ? "https" : "http";
  const base =
    (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim()) ||
    (host ? `${protocol}://${host}` : "");

  const res = await fetch(`${base}/api/payments/initiate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "failed to initiate payment");
  }

  // mock 결제 승인/실패 URL 중 승인으로 보냄(테스트 편의)
  redirect(json.approveUrl as string);
}
