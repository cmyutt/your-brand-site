// CODPATCH: flash message helpers (Korean)
import type { OrderStatus } from "@prisma/client";
import { tOrderStatus } from "@/lib/labels";

export function statusLabel(code: string | null | undefined): string {
  if (!code) return "";
  return tOrderStatus(code as OrderStatus);
}

export function statusChangeMessage(toStatus: string): string {
  const label = statusLabel(toStatus) || toStatus;
  return `${label}로 변경했습니다`;
}

export function bulkStatusMessage(toStatus: string, count: number): string {
  const label = statusLabel(toStatus) || toStatus;
  return `${count}건 ${label} 처리했습니다`;
}

export function deletedMessage(count = 1): string {
  return count > 1 ? `${count}건 삭제했습니다` : "주문을 삭제했습니다";
}

