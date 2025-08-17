import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import AutoSubmitNumber from '@/components/AutoSubmitNumber';
import { getCart, updateQty, removeLine, clearCart } from '@/lib/cart';

export const runtime = 'nodejs';

export default async function CartPage() {
  const items = await getCart();

  async function updateQtyAction(formData: FormData) {
    'use server';
    const productId = String(formData.get('productId') || '');
    const variantId = (formData.get('variantId') as string) || null;
    const qty = Math.max(1, parseInt(String(formData.get('qty') || '1'), 10) || 1);
    await updateQty({ productId, variantId, qty });
    revalidatePath('/cart');
  }

  async function removeLineAction(formData: FormData) {
    'use server';
    const productId = String(formData.get('productId') || '');
    const variantId = (formData.get('variantId') as string) || null;
    await removeLine({ productId, variantId });
    revalidatePath('/cart');
  }

  async function clearAction() {
    'use server';
    await clearCart();
    revalidatePath('/cart');
  }

  const calcTotal = () =>
    items.reduce((sum, { product, variant, line }) => {
      const unit = product.price + (variant?.extra ?? 0);
      return sum + unit * line.qty;
    }, 0);

  const total = calcTotal();

  return (
    <main style={{ maxWidth: 960, margin: '24px auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>장바구니</h1>

      <ul style={{ display: 'grid', gap: 12 }}>
        {items.map(({ product, variant, line }) => {
          const unitPrice = product.price + (variant?.extra ?? 0);
          const subtotal = unitPrice * line.qty;
          const lineKey = `${line.productId}__${line.variantId ?? 'default'}`;

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
                  <Link href={`/products/${product.slug}`} style={{ fontWeight: 700 }}>
                    {product.name}
                  </Link>
                  <span style={{ opacity: 0.7, marginLeft: 8 }}>
                    · {variant?.name ?? '기본'} · 재고 {variant?.stock ?? 0}
                  </span>

                  <div style={{ opacity: 0.7, marginTop: 8 }}>
                    단가 {unitPrice.toLocaleString()}원 · 소계{' '}
                    <b
                      id={`sub-${lineKey}`}
                      data-subtotal={String(subtotal)}
                    >
                      {subtotal.toLocaleString()}원
                    </b>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <form action={updateQtyAction} style={{ display: 'inline' }}>
                    <input type="hidden" name="productId" value={line.productId} />
                    <input type="hidden" name="variantId" value={line.variantId ?? ''} />
                    <AutoSubmitNumber
                      name="qty"
                      value={line.qty}
                      min={1}
                      max={999}
                      aria-label="수량"
                      data-line-key={lineKey}
                      data-unit-price={String(unitPrice)}
                    />
                  </form>

                  <form action={removeLineAction} style={{ display: 'inline' }}>
                    <input type="hidden" name="productId" value={line.productId} />
                    <input type="hidden" name="variantId" value={line.variantId ?? ''} />
                    <button
                      type="submit"
                      style={{
                        background: '#fee',
                        border: '1px solid #f88',
                        padding: '4px 8px',
                        borderRadius: 6,
                      }}
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

      <div style={{ marginTop: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <strong>
          총 <span id="cart-total">{total.toLocaleString()}원</span>
        </strong>

        <form action={clearAction}>
          <button type="submit" style={{ padding: '4px 8px' }}>
            전체 비우기
          </button>
        </form>

        <a href="/checkout" style={{ padding: '4px 8px', border: '1px solid #ccc' }}>
          주문하기
        </a>
      </div>
    </main>
  );
}
