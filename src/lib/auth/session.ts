// CODPATCH: auth session — set/get/clear sid cookie
import { cookies } from "next/headers";
import { signToken, verifyToken, SessionPayload } from "@/lib/auth/token";

const COOKIE = "sid";
const MAX_AGE = 60 * 60 * 24 * 30; // 30d

export async function setSession(user: { id: string; email: string }) {
  const jar = await cookies();
  const p: SessionPayload = {
    uid: String(user.id),
    email: String(user.email),
    exp: Math.floor(Date.now() / 1000) + MAX_AGE,
  };
  const token = signToken(p);
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getSession() {
  const jar = await cookies();
  const tok = jar.get(COOKIE)?.value ?? null;
  return verifyToken(tok);
}

