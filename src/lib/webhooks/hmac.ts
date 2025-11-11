// CODPATCH: webhook hmac — verify HMAC-SHA256 with timestamp
import crypto from "node:crypto";

export type HmacHeaders = {
  signature?: string | null; // X-Signature
  timestamp?: string | null; // X-Timestamp (unix seconds)
  algo?: string | null; // X-Signature-Alg (default: sha256)
};

export function constantTimeEq(a: string, b: string) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** returns true if signature is valid and timestamp is within skew(sec) */
export function verifyHmac(opts: {
  raw: Buffer;
  secret: string;
  headers: HmacHeaders;
  skewSec?: number; // default 300s
}) {
  const { raw, secret, headers, skewSec = 300 } = opts;
  const ts = Number(headers.timestamp ?? 0);
  const now = Math.floor(Date.now() / 1000);
  if (!ts || Math.abs(now - ts) > skewSec) return false;

  const algo = (headers.algo ?? "sha256").toLowerCase();
  const msg = `${ts}.${raw.toString("utf8")}`;
  const mac = crypto.createHmac(algo, secret).update(msg).digest("hex");
  const sig = String(headers.signature ?? "");
  return constantTimeEq(mac, sig);
}

