// src/app/admin/orders/_actions.ts
"use server";

import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

function revalidateAdminAndStore() {
  revalidatePath("/admin/orders");
  revalidatePath("/");         // 스토어 홈에 요약 뱃지 등이 있다면
  revalidatePath("/orders");   // 스토어 주문목록/내역이 있다면
}

/** 재고 조정이 필요한 전이인지 계산 */
function stockDeltaDirection(oldS: OrderStatus, newS: OrderStatus): -1 | 0 | 1 {
  // 결제 확정 계열로 들어갈 때(판매 확정) → 재고 감소
  if (oldS === OrderStatus.PENDING && (newS === OrderStatus.PAID || newS === OrderStatus.FULFILLED)) {
    return -1;
  }
  // 확정 상태에서 취소/환불로 돌아갈 때 → 재고 복구
  if ((oldS === OrderStatus.PAID || oldS === OrderStatus.FULFILLED) &&
      (newS === OrderStatus.CANCELED || newS === OrderStatus.REFUNDED)) {
    return 1;
  }
  return 0;
}

export async function setOrderStatus(id: string, status: OrderStatus) {
  if (!id) throw new Error("id 필요");
  if (!Object.values(OrderStatus).includes(status)) throw new Error("잘못된 상태");

  // 기존 상태 + 라인아이템 조회
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        select: { id: true, qty: true, variantId: true },
      },
    },
  });
  if (!order) throw new Error("주문이 존재하지 않습니다");
  if (order.status === status) {
    revalidateAdminAndStore();
    return;
  }

  const dir = stockDeltaDirection(order.status, status);

  // 트랜잭션으로 재고/주문 동시 반영
  await prisma.$transaction(async (tx) => {
    // 재고 조정이 필요한 경우
    if (dir !== 0) {
      // 변형(variant) 있는 아이템만 재고 조정
      const variantIds = order.items
        .filter((it) => it.variantId)
        .map((it) => it.variantId as string);

      if (variantIds.length > 0) {
        // 현재 재고 조회
        const variants = await tx.variant.findMany({
          where: { id: { in: variantIds } },
          select: { id: true, stock: true },
        });
        const stockMap = new Map(variants.map((v) => [v.id, v.stock]));

        // 마이너스 재고 가드
        for (const it of order.items) {
          if (!it.variantId) continue;
          const curr = stockMap.get(it.variantId) ?? 0;
          const next = curr + dir * it.qty; // dir:-1 → 감소, dir:+1 → 증가
          if (next < 0) {
            throw new Error(`재고 부족: 옵션(${it.variantId}) ${curr}개, 필요한 수량 ${it.qty}개`);
          }
          stockMap.set(it.variantId, next);
        }

        // 실제 업데이트
        await Promise.all(
          Array.from(stockMap.entries()).map(([id, nextStock]) =>
            tx.variant.update({ where: { id }, data: { stock: nextStock } })
          )
        );
      }
    }

    // 주문 상태 업데이트
    await tx.order.update({
      where: { id },
      data: { status },
    });
  });

  revalidateAdminAndStore();
}
