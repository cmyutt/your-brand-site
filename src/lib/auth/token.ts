// CODPATCH: auth token — sign/verify HMAC-SHA256 (server)
import crypto from "node:crypto";
import { ENV } from "@/lib/env";

export type SessionPayload = { uid: string; email: string; exp: number };

const enc = (s: string) => Buffer.from(s, "utf8");
const b64u = {
  e: (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  d: (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
};

export function signToken(p: SessionPayload): string {
  const payload = b64u.e(enc(JSON.stringify(p)));
  const mac = crypto.createHmac("sha256", ENV.SESSION_SECRET).update(payload).digest("hex");
  return `v1.${payload}.${mac}`;
}

export function verifyToken(tok: string | null): SessionPayload | null {
  if (!tok || typeof tok !== "string") return null;
  const [, payload, sig] = tok.split(".");
  if (!payload || !sig) return null;
  const mac = crypto.createHmac("sha256", ENV.SESSION_SECRET).update(payload).digest("hex");
  if (!crypto.timingSafeEqual(enc(mac), enc(sig))) return null;
  try {
    const p = JSON.parse(b64u.d(payload).toString("utf8")) as SessionPayload;
    if (!p?.uid || !p?.email || !p?.exp) return null;
    if (p.exp < Math.floor(Date.now() / 1000)) return null;
    return p;
  } catch {
    return null;
  }
}

