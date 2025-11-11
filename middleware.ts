// Combined security headers + admin/customer auth guard (UTF-8)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function setSecurityHeaders(res: NextResponse) {
  try {
    res.headers.set("X-Frame-Options", "SAMEORIGIN");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  } catch {}
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/health).*)",
  ],
};

const CUSTOMER_PROTECTED_PREFIX = ["/account", "/orders", "/me", "/checkout"];

const b64u = {
  d: (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
};

async function verifySidCookie(token: string | null): Promise<boolean> {
  if (!token) return false;
  const secret = process.env.SESSION_SECRET || "";
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const payload = parts[1];
  const sig = parts[2];

  // HMAC with Web Crypto (Edge Runtime)
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const macBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const macHex = Array.from(new Uint8Array(macBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (macHex.length !== sig.length) return false;
  let ok = 0;
  for (let i = 0; i < macHex.length; i++) ok |= macHex.charCodeAt(i) ^ sig.charCodeAt(i);
  if (ok !== 0) return false;

  try {
    const p = JSON.parse(b64u.d(payload).toString("utf8"));
    const exp = Number(p?.exp ?? 0);
    if (!exp || exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;
  const res = NextResponse.next();
  setSecurityHeaders(res);

  // Admin guard (legacy cookie "admin" = 1)
  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith("/admin/login")) return res;
    const authed = req.cookies.get("admin")?.value === "1";
    if (!authed) {
      const dest = url.clone();
      dest.pathname = "/admin/login";
      dest.searchParams.set("next", pathname);
      return NextResponse.redirect(dest);
    }
    // Ensure display name cookie exists (e.g., "MJ")
    const hasName = req.cookies.get("adminName")?.value;
    if (!hasName) {
      const name = (process.env.ADMIN_ACTOR_FALLBACK || "MJ").trim() || "MJ";
      res.cookies.set("adminName", name, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12,
      });
    }
    return res;
  }

  // Customer guard
  const needAuth = CUSTOMER_PROTECTED_PREFIX.some((p) => pathname.startsWith(p));
  if (!needAuth) return res;

  const sid = req.cookies.get("sid")?.value ?? null;
  const ok = await verifySidCookie(sid);
  if (ok) return res;

  const dest = url.clone();
  dest.pathname = "/login";
  dest.search = url.search
    ? `${url.search}&next=${encodeURIComponent(pathname)}`
    : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(dest);
}

