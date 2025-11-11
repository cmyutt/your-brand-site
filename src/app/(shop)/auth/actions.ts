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

async function updateUserPassword(pModel: any, id: string, hash: string): Promise<boolean> {
  const payloads = [{ passwordHash: hash }, { password: hash }];
  for (const data of payloads) {
    try {
      await pModel.update({ where: { id }, data });
      return true;
    } catch {
      // try next payload shape
    }
  }
  return false;
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
      return { kind: "fail", message: "�̸����� �Է��� �ּ���." };
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
      return { kind: "fail", message: "�̸����� �Է��� �ּ���." };
    }

    const U = getUserModel(prisma as any);
    const user = await findByEmail(U, email);
    if (user && (user as any).emailVerifiedAt) {
      return { kind: "fail", message: "�̹� ������ �Ϸ�� �̸����̿���." };
    }

    const rl = await hit(`signup-code:${email}`, 5, 60 * 60);
    if (!rl.allowed) {
      return { kind: "fail", message: "��û�� �ʹ� ���ƿ�. ��� �� �ٽ� �õ��� �ּ���." };
    }

    const request = await (prisma as any).signupRequest.findUnique({ where: { email } });
    if (request && request.createdAt && request.createdAt.getTime() > Date.now() - 60 * 1000) {
      return { kind: "fail", message: "�ڵ带 �ٽ� �������� ��ø� ��ٷ� �ּ���." };
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
    return { kind: "ok", message: "���� �ڵ带 �̸��Ϸ� �����߾��." };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "���� �ڵ带 ������ ���߾��. ��� �� �ٽ� �õ��� �ּ���." };
  }
}

export async function verifySignupCode(_: any, fd: FormData): Promise<Result> {
  try {
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const code = String(fd.get("code") ?? "").trim();
    if (!email || !code) {
      return { kind: "fail", message: "���� �ڵ带 �Է��� �ּ���." };
    }

    const request = await (prisma as any).signupRequest.findUnique({ where: { email } });
    if (!request) {
      return { kind: "fail", message: "���� ��û�� ã�� �� �����." };
    }
    if (new Date(request.expiresAt).getTime() < Date.now()) {
      return { kind: "fail", message: "���� �ڵ��� ��ȿ �ð��� �������." };
    }

    const hashed = hashSignupCode(code);
    if (hashed !== request.code) {
      return { kind: "fail", message: "���� �ڵ尡 �ùٸ��� �ʾƿ�." };
    }

    return { kind: "ok", message: "Verification code confirmed." };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "���� �ڵ带 Ȯ������ ���߾��. ��� �� �ٽ� �õ��� �ּ���." };
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
      return { kind: "fail", message: "�ʼ� �׸��� ��� �Է��� �ּ���." };
    }

    if (password.length < 8) {
      return { kind: "fail", message: "��й�ȣ�� �ּ� 8�� �̻��̾�� �ؿ�." };
    }

    const request = await (prisma as any).signupRequest.findUnique({ where: { email } });
    if (!request) {
      return { kind: "fail", message: "���� ��û�� ã�� �� �����." };
    }
    if (new Date(request.expiresAt).getTime() < Date.now()) {
      return { kind: "fail", message: "���� �ڵ��� ��ȿ �ð��� �������." };
    }
    if (hashSignupCode(code) !== request.code) {
      return { kind: "fail", message: "���� �ڵ尡 �ùٸ��� �ʾƿ�." };
    }

    const U = getUserModel(prisma as any);
    let user = await findByEmail(U, email);
    if (user && (user as any).emailVerifiedAt) {
      return { kind: "fail", message: "�̹� ���Ե� �̸����̿���." };
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
      throw new Error("���� ������ ������Ʈ���� ���߾��.");
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
    return { kind: "ok", message: "������ �Ϸ�ƾ��." };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "������ �Ϸ����� ���߾��. ��� �� �ٽ� �õ��� �ּ���." };
  }}

export async function requestPasswordReset(_: any, fd: FormData): Promise<Result> {
  try {
    const okOrigin = await ensureSameOrigin();
    if (!okOrigin) {
      return { kind: "fail", message: "Invalid request origin." };
    }

    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    if (!email) {
      return { kind: "fail", message: "Please enter your email." };
    }

    const rate = await hit(`pwreset:${email}`, 5, 15 * 60);
    if (!rate.allowed) {
      return { kind: "fail", message: "Too many requests. Try again later." };
    }

    const U = getUserModel(prisma as any);
    const user = U ? await findByEmail(U, email) : null;
    if (!user) {
      return { kind: "ok", message: "If the account exists, a reset link was sent." };
    }

    const tokenModel = (prisma as any).token;
    if (!tokenModel?.create) {
      return { kind: "fail", message: "Reset token storage is unavailable." };
    }

    const tokenValue = makeToken();
    const userId = String((user as any).id);

    await tokenModel.deleteMany({ where: { userId, type: "PASSWORD_RESET" } });
    await tokenModel.create({
      data: {
        userId,
        type: "PASSWORD_RESET",
        token: tokenValue,
        expiresAt: new Date(Date.now() + RESET_HOURS * 3600 * 1000),
      },
    });

    const link = buildLink("/reset-password", { token: tokenValue });
    await sendMail(
      email,
      "[Your Brand] Reset your password",
      `<p>Use the link below to reset your password.</p><p><a href="${link}">${link}</a></p>`
    );

    return { kind: "ok", message: "If the account exists, a reset link was sent." };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "Unable to process your request." };
  }
}

export async function resetPassword(_: any, fd: FormData): Promise<Result> {
  try {
    const okOrigin = await ensureSameOrigin();
    if (!okOrigin) {
      return { kind: "fail", message: "Invalid request origin." };
    }

    const token = String(fd.get("token") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (!token || !password) {
      return { kind: "fail", message: "Missing token or password." };
    }
    if (password.length < 8) {
      return { kind: "fail", message: "Password must be at least 8 characters." };
    }

    const tokenModel = (prisma as any).token;
    const record = tokenModel?.findUnique ? await tokenModel.findUnique({ where: { token } }) : null;
    if (!record || record.type !== "PASSWORD_RESET") {
      return { kind: "fail", message: "Invalid reset token." };
    }
    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return { kind: "fail", message: "Reset link has expired." };
    }

    const U = getUserModel(prisma as any);
    if (!U?.update) {
      return { kind: "fail", message: "User model not available." };
    }

    const hash = await bcrypt.hash(password, 10);
    const updated = await updateUserPassword(U, String(record.userId), hash);
    if (!updated) {
      return { kind: "fail", message: "Failed to update password." };
    }

    try {
      await tokenModel.deleteMany({ where: { userId: record.userId, type: "PASSWORD_RESET" } });
    } catch {}

    try {
      await bus.publish("customer:password", { id: String(record.userId) });
    } catch {}

    return { kind: "ok", message: "Password has been updated." };
  } catch (e: any) {
    return { kind: "fail", message: e?.message ?? "Unable to reset password." };
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





