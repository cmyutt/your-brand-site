// CODPATCH: stock recalc v2 — dry-run by default, --apply to persist, with admin audit
// Usage:
//   tsx scripts/stock-recalc.v2.ts --from=YYYY-MM-DD --to=YYYY-MM-DD
//   tsx scripts/stock-recalc.v2.ts --order=ord_123 --apply
import prisma from "@/lib/prisma";
import { recordAdminAudit } from "@/lib/adminAudit";
import { calcStockDelta } from "@/lib/stockDelta";

type Opts = { order?: string; from?: string; to?: string; apply?: boolean };

function parseArgs(argv: string[]): Opts {
  const s = argv.slice(2).join(" ");
  const get = (k: string) => s.match(new RegExp(`--${k}=([^\\s]+)`))?.[1];
  return { order: get("order"), from: get("from"), to: get("to"), apply: /--apply/.test(s) };
}

async function main() {
  const opts = parseArgs(process.argv);
  const where: any = {};
  if (opts.order) where.id = opts.order;
  if (opts.from || opts.to) {
    where.createdAt = {};
    if (opts.from) where.createdAt.gte = new Date(opts.from);
    if (opts.to) where.createdAt.lte = new Date(opts.to);
  }
  const orders = await (prisma as any).order.findMany({
    where,
    include: { items: { select: { id: true, qty: true, variantId: true, unitPrice: true } }, events: true },
    orderBy: { createdAt: "asc" },
  });

  let grand = 0;
  for (const ord of orders) {
    const qty = (ord.items ?? []).reduce((n: number, it: any) => n + (Number(it?.qty) || 0), 0);
    let delta = 0;
    for (const ev of (ord.events ?? []).sort((a: any, b: any) => +new Date(a.createdAt) - +new Date(b.createdAt))) {
      delta += calcStockDelta(ev.from as any, ev.to as any, ord.items.map((it: any) => ({ qty: it.qty })));
    }
    console.log(`# ${ord.id} Δ=${delta}`);
    grand += delta;

    if (opts.apply && delta !== 0) {
      for (const it of ord.items ?? []) {
        try {
          await (prisma as any).variant.update({
            where: { id: it.variantId },
            data: { stock: { increment: delta } },
          });
        } catch {}
      }
      await recordAdminAudit({
        action: "STOCK_RECALC_APPLY",
        target: ord.id,
        meta: { delta },
        ok: true,
        message: "재고 재계산 반영",
      });
    }
  }
  console.log(`== Grand Total Δ = ${grand}`);
}

main()
  .catch(async (e) => {
    console.error(e);
    await recordAdminAudit({ action: "STOCK_RECALC_APPLY", ok: false, message: String(e) });
    process.exit(1);
  })
  .finally(async () => { try { await (prisma as any).$disconnect(); } catch {} });

