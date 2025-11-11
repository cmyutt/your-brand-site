import type { OrderStatus } from "@prisma/client";

/**
 * 총 수량 기반 재고 delta 미리보기
 * - 음수: 차감, 양수: 복원, 0: 변화 없음
 */
export function previewTotalDelta(
  from: OrderStatus,
  to: OrderStatus,
  totalQty: number
): number {
  const isDecrease = from === "PENDING" && (to === "PAID" || to === "FULFILLED");
  const isRestore =
    (from === "PAID" || from === "FULFILLED") &&
    (to === "CANCELED" || to === "REFUNDED");
  if (isDecrease) return -Math.max(0, totalQty | 0);
  if (isRestore) return Math.max(0, totalQty | 0);
  return 0;
}

/** 한국어 툴팁 문자열 생성 (예: "대기 → 결제완료 • 예상 재고 -3") */
export function formatDeltaTooltip(
  from: OrderStatus,
  to: OrderStatus,
  delta: number,
  kStatus: (s: OrderStatus) => string
): string {
  const base = `${kStatus(from)} → ${kStatus(to)}`;
  if (!delta) return base;
  const signed = delta > 0 ? `+${delta}` : `${delta}`;
  return `${base} • 예상 재고 ${signed}`;
}
