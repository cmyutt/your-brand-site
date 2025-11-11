// CODPATCH: env guard — validate required variables & freeze (idempotent)
type NonEmpty = string & { __brand: "NonEmpty" };
function req(name: string): NonEmpty {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v as NonEmpty;
}

export const ENV = Object.freeze({
  DATABASE_URL: req("DATABASE_URL"),
  PAYMENT_WEBHOOK_SECRET: process.env["PAYMENT_WEBHOOK_SECRET"] ?? "",
  UPSTASH_REDIS_REST_URL: process.env["UPSTASH_REDIS_REST_URL"] ?? "",
  UPSTASH_REDIS_REST_TOKEN: process.env["UPSTASH_REDIS_REST_TOKEN"] ?? "",
  SESSION_SECRET: req("SESSION_SECRET"),
});
