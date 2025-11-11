// CODPATCH: webhook idempotency — upstash(if env) or file cache fallback
import fs from "node:fs";
import path from "node:path";

const UP_URL = process.env.UPSTASH_REDIS_REST_URL;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/** returns true if the key is newly set (i.e., first time) */
export async function claimOnce(key: string, ttlSec = 24 * 60 * 60): Promise<boolean> {
  if (UP_URL && UP_TOKEN) {
    try {
      const url = `${UP_URL}/set/${encodeURIComponent(key)}/${Date.now()}?NX=1&EX=${ttlSec}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${UP_TOKEN}` } });
      const json = await res.json().catch(() => ({}));
      return json?.result === "OK";
    } catch {
      // fallthrough to file cache
    }
  }
  const dir = path.join(process.cwd(), ".next", "cache", "webhooks");
  const file = path.join(dir, key.replace(/[^a-zA-Z0-9:_-]/g, "_"));
  try {
    fs.mkdirSync(dir, { recursive: true });
    const exists = fs.existsSync(file);
    if (exists) return false;
    fs.writeFileSync(file, String(Date.now()));
    return true;
  } catch {
    return true; // best effort
  }
}

