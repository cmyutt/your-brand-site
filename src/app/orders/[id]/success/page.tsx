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
      payment: { select: { id: true, status: true, amount: true } },
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
        주문자: <strong>{order.customer?.name ?? '-'}</strong>
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

      {/* 액션 영역 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {/* 결제하기: 우리가 구현한 /orders/[id]/pay로 이동 */}
        <Link
          href={`/orders/${order.id}/pay`}
          style={{
            border: '1px solid #ddd',
            borderRadius: 12,
            padding: '8px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          결제하기
        </Link>

        {/* 결제 결과 바로 보기(웹훅 후 자동 리다이렉트 목적지) */}
        <Link
          href={`/orders/${order.id}/result`}
          style={{
            border: '1px solid #ddd',
            borderRadius: 12,
            padding: '8px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          결제 결과 보기
        </Link>

        {/* 주문 상세 페이지(있으면 더 자세한 정보) */}
        <Link
          href={`/orders/${order.id}`}
          style={{
            border: '1px solid #ddd',
            borderRadius: 12,
            padding: '8px 14px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          주문 상세
        </Link>

        {/* 계속 쇼핑 */}
        <Link href="/" style={{ marginLeft: 'auto' }}>
          계속 쇼핑
        </Link>
      </div>

      {/* 참고: 결제 상태 힌트 */}
      {order.payment ? (
        <p style={{ color: '#666', fontSize: 13 }}>
          결제상태: <strong>{order.payment.status}</strong> (결제ID: {order.payment.id})
        </p>
      ) : (
        <p style={{ color: '#666', fontSize: 13 }}>
          아직 결제가 생성되지 않았습니다. <strong>결제하기</strong> 버튼을 눌러 진행하세요.
        </p>
      )}
    </div>
  );
}
