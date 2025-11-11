// CODPATCH: mailer — dynamic nodemailer import (if configured), else console fallback

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export function buildLink(path: string, params: Record<string, string>) {
  const url = new URL(path, APP_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

export async function sendMail(to: string, subject: string, html: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env as any;
  if (!SMTP_HOST || !SMTP_PORT || !MAIL_FROM) {
    console.log("\n[mail] (dev fallback) --------");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("HTML:\n", html);
    console.log("------------------------------\n");
    return;
  }
  // dynamic import via eval to avoid Turbopack resolution when not installed
  let nodemailer: any;
  try {
    // eslint-disable-next-line no-eval
    nodemailer = (await (0, eval)('import("nodemailer")')).default;
  } catch {
    console.warn("[mail] nodemailer not installed; printing to console.");
    console.log("To:", to); console.log("Subject:", subject); console.log("HTML:\n", html);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: false,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  await transporter.sendMail({ from: MAIL_FROM, to, subject, html });
}
