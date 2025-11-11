// CODPATCH: orders inline actions — no-redirect server action wrappers (Korean messages)
"use server";

import type { OrderStatus } from "@prisma/client";
import { userOk, userFail } from "@/lib/result";
import { statusChangeMessage } from "@/lib/flashMessage";
// CODPATCH: inline actions — domain guard + admin audit
import { assertAllowedTransition } from "@/lib/orderDomain";
import { recordAdminAudit } from "@/lib/adminAudit";
import { setOrderStatus, deleteOrder } from "./_actions";

// useActionState용 서버 액션: (prevState, formData) => Result
export async function changeStatusInline(_: unknown, formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const to = String(formData.get("to") || formData.get("toStatus") || "") as OrderStatus | "";
  const note = (formData.get("note") as string) || null;
  if (!orderId || !to) return userFail("요청이 올바르지 않습니다");
  try {
    // 도메인 가드: 현재 상태는 setOrderStatus에서 조회되므로
    // 여기서는 to만 전달하고 중앙 로직에서 검증함
    await setOrderStatus(orderId, to as OrderStatus, note);
    await recordAdminAudit({ action: "ORDER_STATUS_CHANGE", target: orderId, meta: { to }, ok: true, message: "상태 변경 성공" });
    return userOk(statusChangeMessage(to));
  } catch (e: any) {
    await recordAdminAudit({ action: "ORDER_STATUS_CHANGE", target: orderId, meta: { to }, ok: false, message: e?.message });
    return userFail(e?.message || "상태 변경 중 오류가 발생했습니다");
  }
}

// Inline delete wrapper: uses existing deleteOrder(FormData) and returns Result
export async function deleteOrderInline(_: unknown, formData: FormData) {
  const id = String(formData.get("orderId") || "");
  if (!id) return userFail("orderId가 필요합니다");
  try {
    await deleteOrder(formData);
    return userOk("주문을 삭제했습니다");
  } catch (e: any) {
    return userFail(e?.message || "삭제 중 오류가 발생했습니다");
  }
}

// === Bulk helpers (no redirect) ===

export async function bulkSetStatusInline(params: { ids: string[]; toStatus: OrderStatus }) {
  const { ids, toStatus } = params;
  if (!ids?.length) return userFail("선택된 주문이 없습니다");
  try {
    // 순차 처리: setOrderStatus가 재고/이벤트/SSE까지 처리함
    for (const id of ids) {
      await setOrderStatus(id, toStatus, null);
      await recordAdminAudit({ action: "ORDER_BULK_STATUS_CHANGE", target: id, meta: { toStatus }, ok: true });
    }
    return userOk(`${ids.length}건 ${toStatus} 처리했습니다`);
  } catch (e: any) {
    return userFail(e?.message || "일괄 변경 중 오류가 발생했습니다");
  }
}

export async function bulkDeleteInline(ids: string[]) {
  if (!ids?.length) return userFail("선택된 주문이 없습니다");
  try {
    for (const id of ids) {
      const fd = new FormData();
      fd.set("orderId", id);
      await deleteOrder(fd);
    }
    return userOk(`${ids.length}건 삭제했습니다`);
  } catch (e: any) {
    return userFail(e?.message || "일괄 삭제 중 오류가 발생했습니다");
  }
}

// Alias for naming consistency with spec
export const setOrderStatusInline = changeStatusInline;
