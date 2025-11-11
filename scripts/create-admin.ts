// CODPATCH: create backup admin — prisma + bcryptjs (idempotent)
import { prisma } from "@/lib/prisma";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

type Args = { email: string; password?: string; reset?: boolean };
function parse(): Args {
  const get = (k: string) => {
    const p = process.argv.find((a) => a.startsWith(`--${k}=`));
    return p ? p.split("=")[1] : undefined;
  };
  const email = get("email");
  if (!email) throw new Error("--email=<addr> is required");
  const password = get("password");
  const reset = /--reset/.test(process.argv.join(" "));
  return { email, password, reset };
}

async function main() {
  const userModel = (prisma as any).user;
  if (!userModel) {
    console.log("[admin] prisma.user model not found — skipping (no-op)");
    return;
  }

  const { email, password, reset } = parse();
  const pw = password || crypto.randomBytes(12).toString("base64url");
  const hash = await bcrypt.hash(pw, 10);

  // 1) 사용자 존재 여부
  const existing = (await userModel.findUnique?.({ where: { email } })) ?? (await userModel.findFirst?.({ where: { email } }));

  if (!existing) {
    // 2) 새로 생성 (password / passwordHash 필드 대응)
    try {
      await userModel.create({ data: { email, role: "ADMIN", password: hash } });
    } catch {
      await userModel.create({ data: { email, role: "ADMIN", passwordHash: hash } });
    }
    console.log(`[admin] created: ${email}`);
  } else {
    // 3) 이미 있으면 ADMIN 승격 + (옵션) 비번 재설정
    await userModel.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    if (reset) {
      try {
        await userModel.update({ where: { id: existing.id }, data: { password: hash } });
      } catch {
        await userModel.update({ where: { id: existing.id }, data: { passwordHash: hash } });
      }
      console.log(`[admin] elevated & password reset: ${email}`);
    } else {
      console.log(`[admin] elevated (password unchanged): ${email}`);
    }
  }

  console.log(`[admin] login email: ${email}`);
  console.log(`[admin] password: ${pw}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
  });

