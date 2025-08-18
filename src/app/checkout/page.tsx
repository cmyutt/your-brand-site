import prisma from '@/lib/prisma';
import { getCart, clearCart } from '@/lib/cart';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export const runtime = 'nodejs';

// 주문 생성 액션
async function createOrderAction(formData: FormData) {
  'use server';

  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim() || `${Date.now()}@guest.local`;
  const phone = String(formData.get('phone') || '').trim();
  const addressLine1 = String(formData.get('addressLine1') || '').trim();
  const addressLine2 = String(formData.get('addressLine2') || '').trim();
  const postalCode = String(formData.get('postalCode') || '').trim();

  const cart = await getCart();
  if (cart.length === 0) throw new Error('장바구니가 비어있습니다.');
  if (!name) throw new Error('수령자 이름은 필수입니다.');
  if (!phone) throw new Error('연락처는 필수입니다.');
  if (!addressLine1) throw new Error('주소는 필수입니다.');
  if (!postalCode) throw new Error('우편번호는 필수입니다.');

  const totalAmount = cart.reduce((acc, it) => acc + it.unitPrice * it.line.qty, 0);

  // Customer upsert (id는 스키마에서 uuid 자동)
  const customer = await prisma.customer.upsert({
    where: { email },
    update: { name },
    create: { email, name },
    select: { id: true },
  });

  // Order + OrderItem 생성 (관계명: items)
  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      status: 'PENDING',
      totalAmount,
      receiverName: name,
      phone,
      addressLine1,
      addressLine2: addressLine2 || null,
      postalCode,
      items: {
        create: cart.map((it) => ({
          productId: it.product.id,
          variantId: it.variant?.id ?? null,
          unitPrice: it.unitPrice,
          qty: it.line.qty,
        })),
      },
    },
    select: { id: true },
  });

  await clearCart();
  redirect(`/orders/${order.id}/success`);
}

export default async function CheckoutPage() {
  const cart = await getCart();
  const subtotal = cart.reduce((acc, it) => acc + it.unitPrice * it.line.qty, 0);
  const shipping = 0;
  const total = subtotal + shipping;

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', display: 'grid', gap: 16 }}>
      <h1>체크아웃</h1>

      <form action={createOrderAction} style={{ display: 'grid', gap: 8 }}>
        <input name="name" placeholder="수령자 이름" required />
        <input name="email" type="email" placeholder="이메일(선택 — 미입력 시 guest 메일)" />
        <input name="phone" placeholder="연락처" required />
        <input name="postalCode" placeholder="우편번호" required />
        <input name="addressLine1" placeholder="주소" required />
        <input name="addressLine2" placeholder="상세 주소(선택)" />
        <button type="submit">결제 진행</button>
      </form>

      <div style={{ borderTop: '1px dashed #ddd', paddingTop: 8 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          {cart.map((it) => (
            <div
              key={`${it.product.id}__${it.variant?.id || 'default'}`}
              style={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <span>
                {it.product.name}
                {it.variant ? ` · ${it.variant.name}` : ''} × {it.line.qty}
              </span>
              <span>{(it.unitPrice * it.line.qty).toLocaleString()}원</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span>총액</span>
          <strong>{total.toLocaleString()}원</strong>
        </div>

        <div style={{ marginTop: 8 }}>
          <Link href="/cart">장바구니로</Link>
        </div>
      </div>
    </div>
  );
}
