// src/app/checkout/page.tsx
import Link from 'next/link';
import { getCart } from '@/lib/cart';

export const runtime = 'nodejs';

export default async function CheckoutPage() {
  const items = await getCart();
  const total = items.reduce((a, c) => a + c.subtotal, 0);

  return (
    <main style={{ maxWidth: 960, margin: '24px auto', display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>결제</h1>

      {items.length === 0 ? (
        <div>
          <p>장바구니가 비었습니다.</p>
          <Link href="/cart">← 장바구니로</Link>
        </div>
      ) : (
        <>
          <ul style={{ display: 'grid', gap: 6 }}>
            {items.map((i) => (
              <li key={`${i.line.productId}__${i.line.variantId ?? ''}`}>
                {i.product.name}
                {i.variant ? ` / ${i.variant.name}` : ''} · {i.line.qty}개 ·{' '}
                {i.subtotal.toLocaleString()}원
              </li>
            ))}
          </ul>

          <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 700 }}>
            총액 {total.toLocaleString()}원
          </div>

          {/* 여기서 배송지/수취인 폼 + 주문 생성 서버액션 연결 */}
          <div style={{ opacity: 0.7 }}>주문 폼은 이후 단계에서 연결합니다.</div>

          <div>
            <Link href="/cart">← 장바구니로</Link>
          </div>
        </>
      )}
    </main>
  );
}
