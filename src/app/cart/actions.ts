// src/app/cart/actions.ts
'use server';

import { addLine, updateQty, removeLine, clearCart } from '@/lib/cart';
import { revalidatePath } from 'next/cache';

export async function updateQtyAction(formData: FormData) {
  const productId = String(formData.get('productId') || '');
  const variantId = (formData.get('variantId') as string) || null;
  const qty = parseInt(String(formData.get('qty') || '1'), 10) || 1;
  await updateQty({ productId, variantId, qty });
  revalidatePath('/cart');
}

export async function removeLineAction(formData: FormData) {
  const productId = String(formData.get('productId') || '');
  const variantId = (formData.get('variantId') as string) || null;
  await removeLine({ productId, variantId });
  revalidatePath('/cart');
}

export async function clearCartAction() {
  await clearCart();
  revalidatePath('/cart');
}

/** 필요 시 상세페이지에서 사용 */
export async function addLineAction(formData: FormData) {
  const productId = String(formData.get('productId') || '');
  const variantId = (formData.get('variantId') as string) || null;
  const qty = parseInt(String(formData.get('qty') || '1'), 10) || 1;
  await addLine({ productId, variantId, qty });
  revalidatePath('/cart');
}
