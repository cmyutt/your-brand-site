"use server";

// CODPATCH: customer auth actions ??model autodetect + safe fallbacks
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { setSession, clearSession, getSession } from "@/lib/auth/session";
import { bus } from "@/lib/bus";
import { sendMail, buildLink } from "@/lib/email";
import { hit } from "@/lib/ratelimit";
import { ensureSameOrigin, clientKey } from "@/lib/originGuard";
import crypto from "node:crypto";

type Result = { kind: "ok"; message: string } | { kind: "fail"; message: string };

const EMAIL_VERIFY_HOURS = 24;
const RESET_HOURS = 2;

function makeToken() { return crypto.randomBytes(32).toString("base64url"); }

function hashSignupCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}


// --- helpers -------------------------------------------------------

function getUserModel(p: any) {
  // Return whichever user-like model exists in prisma.
  return p.user ?? p.customer ?? p.member ?? p.account ?? null;
}

async function findByEmail(pModel: any, email: string) {
  try {
    if (pModel?.findUnique) return await pModel.findUnique({ where: { email } });
  } catch {}
  try {
    if (pModel?.findFirst) return await pModel.findFirst({ where: { email } });
  } catch {}
  return null;
}

async function createUser(pModel: any, email: string, hash: string) {
  const tries = [
    { email, password: hash, role: "USER" },
    { email, passwordHash: hash, role: "USER" },
    { email, password: hash },
    { email, passwordHash: hash },
  ];
  let lastErr: any = null;
  for (const data of tries) {
    try {
      return await pModel.create({ data });
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Failed to create user.");
}

// --- actions -------------------------------------------------------

export async function signUp(_: any, fd: FormData): Promise<Result> {
  try {
    const okOrigin = await ensureSameOrigin();
    if (!okOrigin) {
      return { kind: "fail", message: "Invalid request origin." };
    }

    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) {
      return { kind: "fail", message: "Please enter your email and password." };
    }

    const ipKey = await clientKey("signup");
    const r1 = await hit(ipKey, 5, 15 * 60);
    const r2 = await hit(`signup:${email}`, 5, 15 * 60);
    if (!r1.allowed || !r2.allowed) {
      return { kind: "fail", message: "Too many attempts. Please try again later." };
    }

    const U = getUserModel(prisma as any);
    if (!U) {
      return { kind: "fail", message: "User model not found (expected User/Customer/Member/Account)." };
    }

    const exists = await findByEmail(U, email);
    if (exists) {
      return { kind: "fail", message: "That email is already registered." };
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await createUser(U, email, hash);

    const tokenValue = makeToken();
    if ((prisma as any).token?.create) {
      await (prisma as any).token.create({
        data: {
          userId: String((user as any).id),
          type: "EMAIL_VERIFY",
          token: tokenValue,
          expiresAt: new Date(Date.now() + EMAIL_VERIFY_HOURS * 3600 * 1000),
        },
      });
    }

    const link = buildLink("/verify", { token: tokenValue });
    await sendMail(
      email,
      "[Your Brand] Confirm your email",
      `<p>Please confirm your email address.</p><p><a href="${link}">${link}</a></p>`
    );

    return { kind: "ok", message: "A verification email has been sent." };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "An unexpected error occurred." };
  }
}

export async function signIn(_: any, fd: FormData): Promise<Result> {
  try {
    const okOrigin = await ensureSameOrigin();
    if (!okOrigin) {
      return { kind: "fail", message: "Invalid request origin." };
    }

    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const password = String(fd.get("password") ?? "");
    if (!email || !password) {
      return { kind: "fail", message: "Please enter your email and password." };
    }

    const key = `signin:${await clientKey(email)}`;
    const rate = await hit(key, 5, 10 * 60);
    if (!rate.allowed) {
      return { kind: "fail", message: "Too many attempts. Please try again later." };
    }

    const U = getUserModel(prisma as any);
    if (!U) {
      return { kind: "fail", message: "User model not found (expected User/Customer/Member/Account)." };
    }

    const user = await findByEmail(U, email);
    if (!user) {
      return { kind: "fail", message: "Invalid email or password." };
    }

    const hash = (user as any).password ?? (user as any).passwordHash ?? "";
    const ok = await bcrypt.compare(password, String(hash));
    if (!ok) {
      return { kind: "fail", message: "Invalid email or password." };
    }

    if (!(user as any).emailVerifiedAt) {
      try {
        const tokenValue = makeToken();
        await (prisma as any).token.create({
          data: {
            userId: String((user as any).id),
            type: "EMAIL_VERIFY",
            token: tokenValue,
            expiresAt: new Date(Date.now() + EMAIL_VERIFY_HOURS * 3600 * 1000),
          },
        });
        const link = buildLink("/verify", { token: tokenValue });
        await sendMail(
          String((user as any).email),
          "[Your Brand] Confirm your email",
          `<p>Please confirm your email.</p><p><a href="${link}">${link}</a></p>`
        );
      } catch {
        // ignore follow-up mail errors
      }
      return { kind: "fail", message: "Check your inbox for the verification email." };
    }

    await setSession({ id: String((user as any).id), email: String((user as any).email) });
    try {
      await bus.publish("customer:signin", { id: String((user as any).id) });
    } catch {}
    return { kind: "ok", message: "Signed in." };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "An unexpected error occurred." };
  }
}

export async function startAuth(_: any, fd: FormData): Promise<any> {
  try {
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    if (!email) {
      return { kind: "fail", message: "이메일을 입력해 주세요." };
    }

    const U = getUserModel(prisma as any);
    const user = await findByEmail(U, email);
    return {
      redirect: user
        ? `/login?email=${encodeURIComponent(email)}`
        : `/signup?email=${encodeURIComponent(email)}`,
    };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "Unable to start authentication." };
  }
}
export async function sendSignupCode(_: any, fd: FormData): Promise<Result> {
  try {
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    if (!email) {
      return { kind: "fail", message: "이메일을 입력해 주세요." };
    }

    const U = getUserModel(prisma as any);
    const user = await findByEmail(U, email);
    if (user && (user as any).emailVerifiedAt) {
      return { kind: "fail", message: "이미 인증이 완료된 이메일이에요." };
    }

    const rl = await hit(`signup-code:${email}`, 5, 60 * 60);
    if (!rl.allowed) {
      return { kind: "fail", message: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." };
    }

    const request = await (prisma as any).signupRequest.findUnique({ where: { email } });
    if (request && request.createdAt && request.createdAt.getTime() > Date.now() - 60 * 1000) {
      return { kind: "fail", message: "코드를 다시 받으려면 잠시만 기다려 주세요." };
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const hashed = hashSignupCode(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await (prisma as any).signupRequest.upsert({
      where: { email },
      update: { code: hashed, expiresAt, createdAt: new Date() },
      create: { email, code: hashed, expiresAt },
    });

    await sendMail(
      email,
      "[Your Brand] Verification code",
      `<p>Your code: <b>${code}</b></p><p>Please enter it within 10 minutes.</p>`
    );
    return { kind: "ok", message: "인증 코드를 이메일로 전송했어요." };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "인증 코드를 보내지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
}

export async function verifySignupCode(_: any, fd: FormData): Promise<Result> {
  try {
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const code = String(fd.get("code") ?? "").trim();
    if (!email || !code) {
      return { kind: "fail", message: "인증 코드를 입력해 주세요." };
    }

    const request = await (prisma as any).signupRequest.findUnique({ where: { email } });
    if (!request) {
      return { kind: "fail", message: "인증 요청을 찾을 수 없어요." };
    }
    if (new Date(request.expiresAt).getTime() < Date.now()) {
      return { kind: "fail", message: "인증 코드의 유효 시간이 지났어요." };
    }

    const hashed = hashSignupCode(code);
    if (hashed !== request.code) {
      return { kind: "fail", message: "인증 코드가 올바르지 않아요." };
    }

    return { kind: "ok", message: "Verification code confirmed." };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "인증 코드를 확인하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
}
export async function signUpWithCode(_: any, fd: FormData): Promise<Result> {
  try {
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const code = String(fd.get("code") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const name = String(fd.get("name") ?? "").trim();
    const phoneCountry = String(fd.get("phoneCountry") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const country = String(fd.get("country") ?? "").trim();
    const birthdate = String(fd.get("birthdate") ?? "").trim();
    const agree = String(fd.get("agree") ?? "") === "on";

    if (!email || !code || !password) {
      return { kind: "fail", message: "필수 항목을 모두 입력해 주세요." };
    }

    if (password.length < 8) {
      return { kind: "fail", message: "비밀번호는 최소 8자 이상이어야 해요." };
    }

    const request = await (prisma as any).signupRequest.findUnique({ where: { email } });
    if (!request) {
      return { kind: "fail", message: "인증 요청을 찾을 수 없어요." };
    }
    if (new Date(request.expiresAt).getTime() < Date.now()) {
      return { kind: "fail", message: "인증 코드의 유효 시간이 지났어요." };
    }
    if (hashSignupCode(code) !== request.code) {
      return { kind: "fail", message: "인증 코드가 올바르지 않아요." };
    }

    const U = getUserModel(prisma as any);
    let user = await findByEmail(U, email);
    if (user && (user as any).emailVerifiedAt) {
      return { kind: "fail", message: "이미 가입된 이메일이에요." };
    }

    const hash = await bcrypt.hash(password, 10);
    let createdNew = false;
    if (!user) {
      user = await createUser(U, email, hash);
      createdNew = true;
    }

    const data: any = {
      emailVerifiedAt: new Date(),
      marketingConsent: !!agree,
    };
    if (name) data.name = name;
    if (phoneCountry) data.phoneCountry = phoneCountry;
    if (phone) data.phone = phone;
    if (country) data.country = country;
    if (birthdate) {
      const d = new Date(birthdate);
      if (!Number.isNaN(d.getTime())) {
        data.birthdate = d;
      }
    }

    const id = String((user as any).id);
    const payloads = [
      { ...data, passwordHash: hash },
      { ...data, password: hash },
      data,
    ];

    let updated = false;
    for (const payload of payloads) {
      try {
        await U.update({ where: { id }, data: payload });
        updated = true;
        break;
      } catch {
        // try next payload
      }
    }
    if (!updated) {
      throw new Error("계정 정보를 업데이트하지 못했어요.");
    }

    try { await (prisma as any).signupRequest.delete({ where: { email } }); } catch {}
    try { await (prisma as any).token.deleteMany({ where: { userId: id, type: "EMAIL_VERIFY" } }); } catch {}

    try {
      if (createdNew) {
        await bus.publish("admin:users", { action: "create", id });
      }
      await bus.publish("admin:users", { action: "verify", id });
    } catch {}

    await setSession({ id, email });
    return { kind: "ok", message: "가입이 완료됐어요." };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "가입을 완료하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
}

export async function signOut(): Promise<Result> {
  try {
    const okOrigin = await ensureSameOrigin();
    if (!okOrigin) {
      return { kind: "fail", message: "Invalid request origin." };
    }

    const session = await getSession();
    if (!session) {
      return { kind: "ok", message: "You are already signed out." };
    }

    await clearSession();
    try {
      await bus.publish("customer:signout", { id: String(session.uid) });
    } catch {}

    return { kind: "ok", message: "Signed out." };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "Unable to sign out." };
  }
}





