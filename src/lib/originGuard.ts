// CODPATCH: origin guard — block cross-site POST to auth actions
import { headers } from "next/headers";

export async function ensureSameOrigin() {
  const h = await headers();
  const origin = h.get("origin");
  const referer = h.get("referer");
  const host = h.get("host");
  try {
    const ok1 = origin ? new URL(origin).host === host : true;
    const ok2 = referer ? new URL(referer).host === host : true;
    return ok1 && ok2;
  } catch { return false; }
}

export async function clientKey(extra?: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  return [ip, extra ?? ""].filter(Boolean).join(":");
}

