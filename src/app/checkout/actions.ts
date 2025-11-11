"use server";

import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { OrderStatus } from "@prisma/client";

/**
 * 카트 구조는 프로젝트의 /lib/cart 구현을 따릅니다.
 * 여기서는 cookie에 저장된 카트를 읽었다고 가정하고, 서버에서 다시 가격/재고 정합성 검증을 진행합니다.
 */
type CartLine = {
  productId: string;
  variantId: string | null;
  qty: number;
};

async function readCartFromCookie(): Promise<CartLine[]> {
  const jar = await cookies();
  const raw = jar.get("cart")?.value ?? "[]";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((l) => ({
          productId: String(l.productId || ""),
          variantId: l.variantId ? String(l.variantId) : null,
          qty: Math.max(1, parseInt(String(l.qty || "1"), 10) || 1),
        }))
        .filter((l) => l.productId);
    }
  } catch {}
  return [];
}

function parseIntGuard(n: number, msg = "정수 값이 필요합니다"): number {
  if (!Number.isFinite(n) || n < 0 || n > 2_147_483_647) throw new Error(msg);
  return Math.floor(n);
}

export async function checkout({
  customerEmail,
  customerName,
  receiverName,
  phone,
  addressLine1,
  addressLine2,
  postalCode,
}: {
  customerEmail: string;
  customerName?: string;
  receiverName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode: string;
}) {
  if (!customerEmail || !receiverName || !phone || !addressLine1 || !postalCode) {
    throw new Error("필수 배송/연락처 정보가 누락되었습니다.");
  }

  const cart = await readCartFromCookie();
  if (cart.length === 0) {
    throw new Error("장바구니가 비어 있습니다.");
  }

  // 제품/옵션 가격 스냅샷 가져오기
  const productIds = Array.from(new Set(cart.map((l) => l.productId)));
  const variantIds = Array.from(new Set(cart.map((l) => l.variantId).filter(Boolean))) as string[];

  const [products, variants] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, published: true },
      select: { id: true, name: true, price: true },
    }),
    prisma.variant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, name: true, stock: true, extra: true },
    }),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  // 서버에서 라인 금액 계산
  const lines = cart.map((l) => {
    const prod = productMap.get(l.productId);
    if (!prod) throw new Error("상품 정보를 찾을 수 없습니다.");
    const v = l.variantId ? variantMap.get(l.variantId) : undefined;
    // 옵션 금액 반영
    const unitPrice = parseIntGuard(prod.price + (v?.extra ?? 0), "가격 계산 오류");
    return {
      productId: l.productId,
      variantId: l.variantId,
      name: v ? `${prod.name} / ${v.name}` : prod.name,
      unitPrice,
      qty: parseIntGuard(l.qty, "수량 오류"),
    };
  });

  const orderTotal = lines.reduce((a, it) => a + it.unitPrice * it.qty, 0);
  const status: OrderStatus = "PENDING";

  // 트랜잭션: 주문 생성 + ★조건부 재고 감소(옵션 존재 시)
  const order = await prisma.$transaction(async (tx) => {
    // 고객 upsert
    const customer = await tx.customer.upsert({
      where: { email: customerEmail },
      create: { email: customerEmail, name: customerName || null },
      update: { name: customerName || null },
      select: { id: true },
    });

    // 주문 본문
    const created = await tx.order.create({
      data: {
        customerId: customer.id,
        status,
        totalAmount: orderTotal,
        receiverName,
        phone,
        addressLine1,
        addressLine2: addressLine2 || null,
        postalCode,
      },
      select: { id: true },
    });

    // 각 라인에 대해: 옵션이 있으면 조건부 재고 차감
    for (const it of lines) {
      if (it.variantId) {
        const updated = await tx.variant.updateMany({
          where: { id: it.variantId, stock: { gte: it.qty } },
          data: { stock: { decrement: it.qty } },
        });
        if (updated.count !== 1) {
          throw new Error(`재고 부족: 선택한 옵션의 수량이 모자랍니다.`);
        }
      }

      await tx.orderItem.create({
        data: {
          orderId: created.id,
          productId: it.productId,
          variantId: it.variantId,
          unitPrice: it.unitPrice,
          qty: it.qty,
          name: it.name,
          subtotal: it.unitPrice * it.qty,
        },
      });
    }

    return created;
  });

  // 장바구니 비우기(쿠키 삭제)
  const jar = await cookies();
  jar.set("cart", "[]", { path: "/" });

  // 성공 이동: 주문 상세로
  redirect(`/admin/orders/${order.id}`);
}
