import prisma from '@/lib/prisma';
import Link from 'next/link';

export const runtime = 'nodejs';

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    include: {
      customer: { select: { name: true, email: true } },
      items: { select: { unitPrice: true, qty: true } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Prisma에서 반환된 타입을 자동으로 추론
  type OrderWithRelations = typeof orders[number];

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', display: 'grid', gap: 16 }}>
      <h1>주문 관리</h1>

      <ul style={{ display: 'grid', gap: 8 }}>
        {orders.map((o: OrderWithRelations) => {
          const total =
            o.totalAmount ??
            o.items.reduce(
              (a: number, it: { unitPrice: number; qty: number }) => a + it.unitPrice * it.qty,
              0
            );

          return (
            <li
              key={o.id}
              style={{
                border: '1px solid #eee',
                borderRadius: 12,
                padding: 12,
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <strong>#{o.id.slice(0, 8)}</strong>
                <span style={{ opacity: 0.7 }}>{new Date(o.createdAt).toLocaleString()}</span>
              </div>

              <div style={{ opacity: 0.85 }}>
                {o.customer?.name} {o.customer?.email ? `· ${o.customer.email}` : ''}
              </div>

              <div>
                아이템 {o._count.items}개 · 총액 {total.toLocaleString()}원 · 상태 {o.status}
              </div>

              <div style={{ marginTop: 8 }}>
                <Link href={`/orders/${o.id}/success`}>보기</Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
