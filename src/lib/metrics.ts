// CODPATCH: metrics — AOV / Top Products / Lead time (idempotent)
import prisma from "@/lib/prisma";

type TopProduct = {
  id: string;
  name: string;
  qty: number;
};

export async function aovBetween(from?: Date, to?: Date) {
  const where: any = {};
  if (from || to) where.createdAt = {};
  if (from) where.createdAt.gte = from;
  if (to) where.createdAt.lte = to;
  const rows = await (prisma as any).order.findMany({ where, select: { totalAmount: true } });
  if (!rows.length) return 0;
  const sum = rows.reduce((n: number, r: any) => n + (Number(r?.totalAmount) || 0), 0);
  return Math.round((sum / rows.length) * 100) / 100;
}

export async function topProductsBetween(from?: Date, to?: Date, limit = 5): Promise<TopProduct[]> {
  const where: any = {};
  if (from || to) where.createdAt = {};
  if (from) where.createdAt.gte = from;
  if (to) where.createdAt.lte = to;

  const orders = await (prisma as any).order.findMany({
    where,
    include: { items: { select: { productId: true, qty: true } } },
  });

  const agg = new Map<string, number>();
  for (const o of orders) {
    for (const it of o.items ?? []) {
      const k = String(it.productId);
      agg.set(k, (agg.get(k) ?? 0) + (Number(it.qty) || 0));
    }
  }

  const sorted = Array.from(agg.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const products = await (prisma as any).product.findMany({
    where: { id: { in: sorted.map(([id]) => id) } },
    select: { id: true, name: true },
  });
  const nameById = new Map<string, string>(
    products.map((p: any) => [String(p.id), String(p.name ?? "")])
  );
  return sorted.map(
    ([id, qty]) =>
      ({
        id,
        name: nameById.get(id) || id,
        qty,
      }) satisfies TopProduct
  );
}

export async function leadTimeBetween(from?: Date, to?: Date) {
  const where: any = {};
  if (from || to) where.createdAt = {};
  if (from) where.createdAt.gte = from;
  if (to) where.createdAt.lte = to;
  const orders = await (prisma as any).order.findMany({
    where,
    include: { events: { select: { createdAt: true, to: true } } },
    orderBy: { createdAt: "asc" },
  });

  let sumDays = 0, cnt = 0;
  for (const o of orders) {
    const created = new Date(o.createdAt);
    const hit = (o.events ?? []).find((e: any) => e.to === "FULFILLED");
    if (hit) {
      const days = Math.max(0, (new Date(hit.createdAt).getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      sumDays += days; cnt += 1;
    }
  }
  const avg = cnt ? sumDays / cnt : 0;
  return Math.round(avg * 10) / 10;
}
