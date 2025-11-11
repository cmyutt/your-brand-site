// src/app/cart/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import AutoSubmitNumber from '@/components/AutoSubmitNumber';
import { getCart } from '@/lib/cart';
import { removeFromCart, updateCartQty, clearCartAction } from './actions';

export const runtime = 'nodejs';

export default async function CartPage() {
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent('/cart')}`);
  }

  const items = await getCart();
  const total = items.reduce((acc, it) => acc + it.subtotal, 0);

  return (
    <div style={{ maxWidth: 960, margin: '24px auto', display: 'grid', gap: 16 }}>
      <h1>Cart</h1>

      <form action={clearCartAction}>
        <button type="submit" style={{ padding: '6px 10px' }}>Clear cart</button>
      </form>

      <ul style={{ display: 'grid', gap: 12 }}>
        {items.map((it) => {
          const lineKey = `${it.product.id}__${it.variant?.id ?? 'null'}`;
          const unit = it.unitPrice;

          return (
            <li
              key={lineKey}
              style={{
                border: '1px solid #eee',
                borderRadius: 12,
                padding: 12,
                display: 'grid',
                gap: 8,
                alignItems: 'center',
                gridTemplateColumns: '1fr auto auto',
              }}
            >
              <div>
                <strong>{it.product.name}</strong>
                {it.variant && (
                  <>
                    {' '}夷?<span style={{ opacity: 0.7 }}>{it.variant.name}</span>
                  </>
                )}
                <div style={{ opacity: 0.7, marginTop: 4 }}>Unit {unit.toLocaleString()} KRW</div>
              </div>

              <form action={updateCartQty} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <input type="hidden" name="productId" value={it.product.id} />
                <input type="hidden" name="variantId" value={it.variant?.id ?? ''} />
                <AutoSubmitNumber
                  name="qty"
                  value={it.line.qty}
                  min={1}
                  max={999}
                  data-line-key={lineKey}
                  data-unit-price={unit}
                />
              </form>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                <span
                  id={`sub-${lineKey}`}
                  data-subtotal={it.subtotal}
                  style={{ width: 120, textAlign: 'right', display: 'inline-block' }}
                >
                  {it.subtotal.toLocaleString()} KRW
                </span>

                <form action={removeFromCart}>
                  <input type="hidden" name="productId" value={it.product.id} />
                  <input type="hidden" name="variantId" value={it.variant?.id ?? ''} />
                  <button
                    type="submit"
                    style={{ padding: '4px 8px', background: '#fee', border: '1px solid #f88', borderRadius: 6 }}
                  >
                    Remove
                  </button>
                </form>
              </div>
            </li>
          );
        })}
        {items.length === 0 && (
          <li style={{ opacity: 0.7 }}>Your cart is empty.</li>
        )}
      </ul>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div>
          <span style={{ opacity: 0.7 }}>Total </span>
          <strong id="cart-total">{total.toLocaleString()} KRW</strong>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/">
            <button type="button" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
              Continue shopping
            </button>
          </Link>

          <Link href="/checkout">
            <button type="button" style={{ padding: '8px 12px', borderRadius: 8, background: '#111', color: '#fff' }}>
              Checkout
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

