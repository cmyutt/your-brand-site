// src/app/cart/page.tsx
import Link from 'next/link';
import AutoSubmitNumber from '@/components/AutoSubmitNumber';
import { getCart, clearCart } from '@/lib/cart';
import { removeFromCart, updateCartQty, clearCartAction } from './actions';

export const runtime = 'nodejs';

export default async function CartPage() {
  const items = await getCart();
  const total = items.reduce((a, b) => a + b.subtotal, 0);

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', display: 'grid', gap: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>장바구니</h1>

      {items.length === 0 ? (
        <div style={{ padding: 24, border: '1px solid #eee', borderRadius: 12 }}>
          장바구니가 비었습니다.{' '}
          <Link href="/">쇼핑 계속하기</Link>
        </div>
      ) : (
        <>
          <ul style={{ display: 'grid', gap: 12 }}>
            {items.map((it) => {
              const lineKey = `${it.product.id}__${it.variant?.id ?? 'null'}`;
              return (
                <li
                  key={lineKey}
                  style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{it.product.name}</strong>
                        {it.variant && (
                          <span style={{ opacity: 0.7 }}>· {it.variant.name}</span>
                        )}
                      </div>
                      <div style={{ opacity: 0.7, marginTop: 4 }}>
                        단가 {it.unitPrice.toLocaleString()}원
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      {/* 수량 변경 */}
                      <form action={updateCartQty} style={{ display: 'inline-block' }}>
                        <input type="hidden" name="productId" value={it.product.id} />
                        <input
                          type="hidden"
                          name="variantId"
                          value={it.variant?.id ?? ''}
                        />
                        <AutoSubmitNumber
                          name="qty"
                          value={it.line.qty}
                          min={1}
                          max={999}
                          // optimisticUpdate에서 참조할 키/단가
                          data-line-key={lineKey}
                          data-unit-price={it.unitPrice}
                          aria-label="수량"
                        />
                      </form>

                      {/* 소계 (낙관적 업데이트용 data-subtotal + id) */}
                      <span
                        id={`sub-${lineKey}`}
                        data-subtotal={String(it.subtotal)}
                        style={{ width: 96, textAlign: 'right', display: 'inline-block' }}
                      >
                        {it.subtotal.toLocaleString()}원
                      </span>

                      {/* 삭제 */}
                      <form action={removeFromCart}>
                        <input type="hidden" name="productId" value={it.product.id} />
                        <input
                          type="hidden"
                          name="variantId"
                          value={it.variant?.id ?? ''}
                        />
                        <button
                          type="submit"
                          style={{ padding: '4px 8px', border: '1px solid #eee' }}
                        >
                          삭제
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* 하단 합계/액션 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'center',
              marginTop: 12,
            }}
          >
            <form action={clearCartAction}>
              <button
                type="submit"
                style={{ background: 'transparent', border: '1px solid #ddd', padding: '4px 8px' }}
              >
                장바구니 비우기
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <strong id="cart-total">{total.toLocaleString()}원</strong>
              <Link
                href="/"
                style={{ border: '1px solid #ddd', padding: '6px 10px', borderRadius: 8 }}
              >
                계속 쇼핑
              </Link>

              {/* ⬇️ 기존 form action={() => {}} 제거하고 단순 링크로 변경 */}
              <Link
                href="/checkout"
                style={{
                  background: '#111',
                  color: '#fff',
                  padding: '6px 12px',
                  borderRadius: 8,
                }}
              >
                결제 진행
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
