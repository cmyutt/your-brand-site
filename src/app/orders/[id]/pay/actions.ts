// src/app/orders/[id]/pay/actions.ts
"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

type InitiateOk = { ok: true; approveUrl: string };
type InitiateErr = { ok: false; error?: string };
type InitiateResp = InitiateOk | InitiateErr;

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function parseInitiate(x: unknown): InitiateResp {
  if (!isObject(x)) return { ok: false, error: "invalid response" };
  const ok = x.ok === true || x.ok === false ? (x.ok as boolean) : false;
  if (ok === true && typeof x.approveUrl === "string") {
    return { ok: true, approveUrl: x.approveUrl };
  }
  return { ok: false, error: typeof x.error === "string" ? x.error : "invalid response" };
}

export async function initiatePayment(orderId: string) {
  if (!orderId) throw new Error("orderId required");

  // 배포/로컬 모두 동작하도록 base URL 계산
  const hdrs = await headers(); // ✅ Next 15: Promise 반환 → await 필요
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

  const jsonUnknown: unknown = await res.json().catch(() => ({}));
  const json = parseInitiate(jsonUnknown);

  if (!res.ok || json.ok !== true) {
    throw new Error(json.ok === false && json.error ? json.error : "failed to initiate payment");
  }

  // mock 결제 승인 URL로 바로 이동(테스트 편의)
  redirect(json.approveUrl);
}
