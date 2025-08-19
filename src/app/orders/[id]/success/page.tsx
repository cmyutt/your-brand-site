import prisma from '@/lib/prisma';
import Link from 'next/link';

export const runtime = 'nodejs';

// ✅ Next.js 15에서는 params가 Promise로 전달됨
export default async function OrderSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Promise 풀기
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: { name: true, email: true } },
      items: {
        select: {
          id: true,
          unitPrice: true,
          qty: true,
          product: { select: { name: true } },
          variant: { select: { name: true } },
        },
        orderBy: { id: 'asc' },
      },
    },
  });

  if (!order) {
    return (
      <div style={{ maxWidth: 720, margin: '24px auto' }}>
        <h1>주문을 찾을 수 없어요.</h1>
        <Link href="/">홈으로</Link>
      </div>
    );
  }

  const total = order.totalAmount;

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', display: 'grid', gap: 12 }}>
      <h1>주문 완료</h1>
      <p>
        주문번호: <strong>{order.id}</strong>
      </p>
      <p>
        주문자: <strong>{order.customer?.name}</strong>
        {order.customer?.email ? ` · ${order.customer.email}` : ''}
      </p>

      <ul style={{ display: 'grid', gap: 6 }}>
        {order.items.map((it) => (
          <li key={it.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {it.product?.name}
              {it.variant ? ` · ${it.variant.name}` : ''} × {it.qty}
            </span>
            <span>{(it.unitPrice * it.qty).toLocaleString()}원</span>
          </li>
        ))}
      </ul>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderTop: '1px dashed #ddd',
          paddingTop: 6,
        }}
      >
        <span>총액</span>
        <strong>{total.toLocaleString()}원</strong>
      </div>

      <div style={{ marginTop: 8 }}>
        <Link href="/">계속 쇼핑</Link>
      </div>
    </div>
  );
}
