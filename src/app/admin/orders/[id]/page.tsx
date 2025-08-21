// src/app/admin/orders/[id]/page.tsx
import Link from "next/link";
import prisma from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { setOrderStatus } from "../_actions";

export const runtime = "nodejs";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true } },
      items: {
        include: {
          product: { select: { name: true, price: true } },
          variant: { select: { name: true } },
        },
      },
    },
  });

  if (!order) {
    return (
      <div style={{ maxWidth: 960, margin: "24px auto" }}>
        <Link href="/admin/orders">← Orders</Link>
        <h1 style={{ marginTop: 12 }}>주문을 찾을 수 없어요.</h1>
      </div>
    );
  }

  // 합계: subtotal 스냅샷이 있으면 우선 사용, 없으면 unitPrice*qty
  const totalWon = order.items.reduce(
    (a, it) => a + (it.subtotal ?? it.unitPrice * it.qty),
    0
  );

  const statuses: OrderStatus[] = [
    OrderStatus.PENDING,
    OrderStatus.PAID,
    OrderStatus.FULFILLED,
    OrderStatus.CANCELED,
    OrderStatus.REFUNDED,
  ];

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", display: "grid", gap: 16 }}>
      <Link href="/admin/orders">← Orders</Link>

      <header style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
          Order #{order.id.slice(0, 8)}
        </h1>
        <span style={{ opacity: 0.7 }}>· {order.status}</span>
      </header>

      <div style={{ opacity: 0.8 }}>
        {new Date(order.createdAt).toLocaleString()} ·{" "}
        {order.customer?.name || "guest"}
        {order.customer?.email ? ` · ${order.customer.email}` : ""}
      </div>

      {/* 아이템 목록 */}
      <ul style={{ display: "grid", gap: 8 }}>
        {order.items.map((it) => {
          const line = it.subtotal ?? it.unitPrice * it.qty;
          return (
            <li
              key={it.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <strong>{it.product.name}</strong>
                  {it.variant?.name && (
                    <span style={{ opacity: 0.7 }}>· {it.variant.name}</span>
                  )}
                </div>
                <div style={{ opacity: 0.7 }}>
                  {it.unitPrice.toLocaleString()}원 × {it.qty}
                </div>
              </div>
              <div style={{ fontWeight: 700 }}>{line.toLocaleString()}원</div>
            </li>
          );
        })}
      </ul>

      <div style={{ textAlign: "right", fontSize: 18, fontWeight: 700 }}>
        합계 {totalWon.toLocaleString()}원
      </div>

      {/* 상태 전환 */}
      <section style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {statuses.map((st) => (
          <form
            key={st}
            action={async () => {
              "use server";
              await setOrderStatus(order.id, st);
            }}
          >
            <button
              type="submit"
              disabled={order.status === st}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #ddd",
                background: "#fafafa",
                opacity: order.status === st ? 0.4 : 1,
              }}
              title={`→ ${st}`}
            >
              {st}
            </button>
          </form>
        ))}
      </section>
    </div>
  );
}
