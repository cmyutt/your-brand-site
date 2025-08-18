// src/app/cart/actions.ts
'use server';

import { addLine, removeLine, updateQty, clearCart } from '@/lib/cart';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function addToCart(formData: FormData) {
  const productId = String(formData.get('productId') || '');
  const v = String(formData.get('variantId') || '');
  const variantId = v || null;
  const qty = Math.max(1, parseInt(String(formData.get('qty') || '1'), 10) || 1);
  if (!productId) throw new Error('productId required');

  await addLine({ productId, variantId, qty });
  redirect('/cart');
}

export async function removeFromCart(formData: FormData) {
  const productId = String(formData.get('productId') || '');
  const v = String(formData.get('variantId') || '');
  const variantId = v || null;

  await removeLine({ productId, variantId });
  redirect('/cart');
}

export async function updateCartQty(formData: FormData) {
  const productId = String(formData.get('productId') || '');
  const v = String(formData.get('variantId') || '');
  const variantId = v || null;
  const qty = Math.max(1, parseInt(String(formData.get('qty') || '1'), 10) || 1);

  await updateQty({ productId, variantId, qty });
  // 낙관적 업데이트를 쓰므로 전체 리다이렉트는 생략, 서버 상태만 갱신
  revalidatePath('/cart');
}

export async function clearCartAction() {
  await clearCart();
  redirect('/cart');
}
