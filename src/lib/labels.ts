// CODPATCH: Unified Korean labels for order status
import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_LABEL_KO: Record<OrderStatus, string> = {
  PENDING: "대기중",
  PAID: "결제완료",
  FULFILLED: "배송완료",
  CANCELED: "취소됨",
  REFUNDED: "환불됨",
};

export function tOrderStatus(s: OrderStatus | string | null | undefined): string {
  if (!s) return "";
  try {
    const key = String(s) as OrderStatus;
    return (ORDER_STATUS_LABEL_KO as any)[key] ?? String(s);
  } catch {
    return String(s);
  }
}

