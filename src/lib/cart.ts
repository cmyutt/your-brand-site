// src/lib/cart.ts
import 'server-only';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const CART_COOKIE = 'cart';
const MAX_AGE = 60 * 60 * 24 * 30;

export type CartLine = {
  productId: string;
  variantId: string | null;
  qty: number;
};

export type CartItem = {
  product: { id: string; slug: string; name: string; price: number };
  variant: { id: string; name: string; stock: number | null; extra: number } | null;
  line: CartLine;
  unitPrice: number;
  subtotal: number;
};

/* ---------------- cookie helpers ---------------- */

const readLines = async (): Promise<CartLine[]> => {
  const c = (await cookies()).get(CART_COOKIE)?.value;
  if (!c) return [];
  try {
    const arr = JSON.parse(c) as CartLine[];
    if (!Array.isArray(arr)) return [];
    return arr
      .map((l) => ({
        productId: String(l.productId),
        variantId: l.variantId ? String(l.variantId) : null,
        qty: Math.max(1, parseInt(String(l.qty || 1), 10) || 1),
      }))
      .slice(0, 200);
  } catch {
    return [];
  }
};

const writeLines = async (lines: CartLine[]) => {
  const clean = lines.filter((l) => l.qty > 0);
  (await cookies()).set(CART_COOKIE, JSON.stringify(clean), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
  });
};

/* ---------------- public APIs ---------------- */

export const getCart = async (): Promise<CartItem[]> => {
  const lines = await readLines();
  if (lines.length === 0) return [];

  const productIds = [...new Set(lines.map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: { variants: { orderBy: { name: 'asc' } } },
  });
  const map = new Map(products.map((p) => [p.id, p]));

  const items: CartItem[] = lines.map((line) => {
    const p = map.get(line.productId);
    if (!p) {
      return {
        product: { id: line.productId, slug: '', name: '[삭제된 상품]', price: 0 },
        variant: null,
        line: { ...line, qty: 0 },
        unitPrice: 0,
        subtotal: 0,
      };
    }
    const v = line.variantId ? p.variants.find((x) => x.id === line.variantId) ?? null : null;
    const extra = v?.extra ?? 0;
    const unitPrice = Math.max(0, p.price + extra);
    const subtotal = unitPrice * Math.max(1, line.qty);
    return {
      product: { id: p.id, slug: p.slug, name: p.name, price: p.price },
      variant: v ? { id: v.id, name: v.name, stock: v.stock, extra: v.extra ?? 0 } : null,
      line,
      unitPrice,
      subtotal,
    };
  });

  const fixed = items.filter((it) => it.line.qty > 0 && it.product.slug !== '');
  if (fixed.length !== items.length) {
    await writeLines(fixed.map((it) => it.line));
    return fixed;
  }
  return items;
};

export const addLine = async (input: { productId: string; variantId: string | null; qty: number }) => {
  const qty = Math.max(1, parseInt(String(input.qty || 1), 10) || 1);
  const lines = await readLines();
  const idx = lines.findIndex((l) => l.productId === input.productId && l.variantId === input.variantId);
  if (idx >= 0) lines[idx].qty += qty;
  else lines.unshift({ productId: input.productId, variantId: input.variantId, qty });
  await writeLines(lines);
};

export const updateQty = async (input: { productId: string; variantId: string | null; qty: number }) => {
  const qty = Math.max(1, parseInt(String(input.qty || 1), 10) || 1);
  const lines = await readLines();
  const idx = lines.findIndex((l) => l.productId === input.productId && l.variantId === input.variantId);
  if (idx >= 0) {
    lines[idx].qty = qty;
    await writeLines(lines);
  }
};

export const removeLine = async (input: { productId: string; variantId: string | null }) => {
  const lines = (await readLines()).filter(
    (l) => !(l.productId === input.productId && l.variantId === input.variantId),
  );
  await writeLines(lines);
};

export const clearCart = async () => {
  await writeLines([]);
};

// 추가로 한 번 더 명시 export (정적분석 꼬임 방지)
export {
  readLines as _readLinesInternal,
  writeLines as _writeLinesInternal,
};
