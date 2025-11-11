// src/lib/stockDelta.ts
import type { OrderStatus } from "@prisma/client";

/**
 * 상태 전이별 재고 증감 방향 계산
 * - 소비 상태: PAID, FULFILLED
 * - 비소비 상태: PENDING, CANCELED, REFUNDED
 * - 소비↔비소비 전이에서만 delta 발생
 */
export function stockDeltaDirection(from: OrderStatus, to: OrderStatus): -1 | 0 | 1 {
  const consume = new Set<OrderStatus>(["PAID", "FULFILLED"]);
  const wasConsume = consume.has(from);
  const willConsume = consume.has(to);
  if (!wasConsume && willConsume) return -1; // 차감
  if (wasConsume && !willConsume) return 1;  // 복원
  return 0;                                   // 변화 없음
}

/**
 * 주어진 라인아이템 수량 합계를 기반으로 전체 재고 delta 산출
 */
export function calcStockDelta(
  from: OrderStatus,
  to: OrderStatus,
  items: { qty: number }[],
): number {
  const dir = stockDeltaDirection(from, to);
  if (dir === 0) return 0;
  const totalQty = items.reduce((a, it) => a + (it?.qty ?? 0), 0);
  return dir * totalQty;
}

