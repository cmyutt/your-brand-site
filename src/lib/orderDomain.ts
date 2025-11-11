// CODPATCH: order domain — allowed transitions & guard
import type { OrderStatus } from "@prisma/client";

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  // 앱 기존 규칙 존중: PENDING에서 바로 FULFILLED 허용, 종결(CANCELED/REFUNDED) → PENDING 재오픈 허용
  PENDING: ["PAID", "FULFILLED"],
  PAID: ["FULFILLED", "REFUNDED", "CANCELED"],
  FULFILLED: ["REFUNDED"],
  CANCELED: ["PENDING"],
  REFUNDED: ["PENDING"],
};

export function isAllowedTransition(from: OrderStatus | null | undefined, to: OrderStatus): boolean {
  if (!from) return to === "PENDING" || to === "PAID"; // 초기 생성/마이그레이션 완충
  return (ALLOWED[from] ?? []).includes(to);
}

export function assertAllowedTransition(
  from: OrderStatus | null | undefined,
  to: OrderStatus
) {
  if (!isAllowedTransition(from as OrderStatus, to)) {
    const msg = `허용되지 않은 상태 전이: ${from ?? "∅"} -> ${to}`;
    const err = new Error(msg);
    (err as any).status = 400;
    throw err;
  }
}
