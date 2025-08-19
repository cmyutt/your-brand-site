// src/app/admin/orders/page.tsx
import Link from "next/link";
import prisma from "@/lib/prisma";
import { OrderStatus, Prisma } from "@prisma/client";
import { setOrderStatus } from "./_actions";

export const runtime = "nodejs";

type SP = Record<string, string | string[] | undefined>;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SP>; // ✅ Next 15 규칙
}) {
  const sp = await searchParams;

  const page = parseInt((typeof sp?.page === "string" ? sp.page : "1") ?? "1", 10) || 1;
  const perRaw = parseInt((typeof sp?.per === "string" ? sp.per : "10") ?? "10", 10) || 10;
  const per = Math.min(50, Math.max(5, perRaw));
  const s = typeof sp?.status === "string" ? (sp.status as OrderStatus | "") : "";

  const where: Prisma.OrderWhereInput =
    s && Object.values(OrderStatus).includes(s as OrderStatus)
      ? { status: s as OrderStatus }
      : {};

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, email: true } },
        items: { select: { unitPrice: true, qty: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * per,
      take: per,
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / per));
  const qs = (q: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== "") u.set(k, String(v));
    });
    return `?${u.toString()}`;
  };

  const statuses: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.PAID,
    OrderStatus.FULFILLED,
    OrderStatus.CANCELED,
    OrderStatus.REFUNDED,
  ];

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", display: "grid", gap: 16 }}>
      <h1>주문 관리</h1>

      {/* 상태 필터 */}
      <form
        style={{ display: "flex", gap: 8 }}
        onChange={(e) => {
          // 서버액션 없이 간단 네비게이션
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            const select = e.target as HTMLSelectElement;
            if (select.name === "status") {
              if (select.value) url.searchParams.set("status", select.value);
              else url.searchParams.delete("status");
              url.searchParams.set("page", "1");
              window.location.href = url.toString();
            }
          }
        }}
      >
        <select name="status" defaultValue={s}>
          <option value="">전체</option>
          {statuses.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
        <select
          name="per"
          defaultValue={String(per)}
          onChange={(e) => {
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.set("per", e.currentTarget.value);
              url.searchParams.set("page", "1");
              window.location.href = url.toString();
            }
          }}
        >
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}개
            </option>
          ))}
        </select>
      </form>

      {/* 목록 */}
      <ul style={{ display: "grid", gap: 8 }}>
        {orders.map((o) => {
          const total =
            // totalAmount 필드가 이미 있다면 우선 사용
            // 없다면 아이템 합산
            // (스키마에 totalAmount가 없다면 이 줄은 자동으로 fallback)
            (o.totalAmount as number | undefined) ??
            o.items.reduce((a, it) => a + it.unitPrice * it.qty, 0);

          return (
            <li
              key={o.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <strong>#{o.id.slice(0, 8)}</strong>
                <span style={{ opacity: 0.7 }}>
                  {new Date(o.createdAt).toLocaleString()}
                </span>
                <span style={{ opacity: 0.7 }}>· {o.status}</span>
              </div>

              <div style={{ opacity: 0.85 }}>
                {o.customer?.name || "guest"}{" "}
                {o.customer?.email ? `· ${o.customer.email}` : ""}
              </div>

              <div>
                아이템 {o._count.items}개 · 총액 {total.toLocaleString()}원
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Link href={`/admin/orders/${o.id}`}>Detail</Link>

                {/* 상태 전환 버튼들 (서버 액션) */}
                {statuses.map((st) => (
                  <form
                    key={st}
                    action={async () => {
                      "use server";
                      await setOrderStatus(o.id, st);
                    }}
                  >
                    <button
                      type="submit"
                      disabled={o.status === st}
                      style={{
                        padding: "4px 8px",
                        opacity: o.status === st ? 0.4 : 1,
                      }}
                      title={`→ ${st}`}
                    >
                      {st}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {/* 페이지네이션 */}
      <nav style={{ display: "flex", gap: 8 }}>
        <Link href={qs({ status: s || undefined, page: Math.max(1, page - 1), per })}>
          ← Prev
        </Link>
        <span style={{ opacity: 0.7 }}>
          {page} / {pages}
        </span>
        <Link href={qs({ status: s || undefined, page: Math.min(pages, page + 1), per })}>
          Next →
        </Link>
      </nav>
    </div>
  );
}
