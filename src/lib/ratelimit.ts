// CODPATCH: ratelimit — upstash(if env) or in-memory fallback
const UP_URL = process.env.UPSTASH_REDIS_REST_URL;
const UP_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const mem = new Map<string, { n: number; exp: number }>();

export async function hit(key: string, limit: number, windowSec: number) {
  const now = Math.floor(Date.now() / 1000);
  if (UP_URL && UP_TOKEN) {
    try {
      const url = `${UP_URL}/incr/${encodeURIComponent(key)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${UP_TOKEN}` } });
      const json: any = await res.json().catch(() => ({}));
      const n = Number(json?.result ?? 1);
      if (n === 1) {
        await fetch(`${UP_URL}/expire/${encodeURIComponent(key)}/${windowSec}`, {
          headers: { Authorization: `Bearer ${UP_TOKEN}` },
        }).catch(() => {});
      }
      return { allowed: n <= limit, remaining: Math.max(0, limit - n), resetSec: windowSec };
    } catch {}
  }
  const cur = mem.get(key);
  if (!cur || cur.exp <= now) { mem.set(key, { n: 1, exp: now + windowSec }); return { allowed: true, remaining: limit - 1, resetSec: windowSec }; }
  cur.n += 1;
  return { allowed: cur.n <= limit, remaining: Math.max(0, limit - cur.n), resetSec: cur.exp - now };
}
export function clearKey(key: string) { mem.delete(key); }

