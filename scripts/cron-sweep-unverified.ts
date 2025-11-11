// CODPATCH: cron client — call sweep endpoint with CRON_SECRET
import "dotenv/config";
const base = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const url = base + "/api/admin/cron/users/sweep-unverified";
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
});
console.log("[sweep]", res.status, await res.text());

