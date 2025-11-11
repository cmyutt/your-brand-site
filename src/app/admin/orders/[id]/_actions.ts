// src/app/admin/orders/[id]/_actions.ts
"use server";

import type { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
// CODPATCH: order detail actions — use redirector + status message
import { redirectOk } from "@/lib/redirector";
import { statusChangeMessage, deletedMessage } from "@/lib/flashMessage";
import {
  setOrderStatus,
  addOrderNote as addOrderNoteCentral,
  deleteOrderDirect as deleteOrderDirectCentral,
} from "../_actions";

/** 상태 전환 → 중앙 액션 위임 (재고 delta/로그/알림 일관) */
export async function transitionOrderStatus(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const to = String(formData.get("to") || "") as OrderStatus;
  const note = (formData.get("note") as string) || null;
  if (!orderId || !to) return;
  await setOrderStatus(orderId, to, note);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/admin/orders`);
  // CODPATCH: show banner on detail page after change
  redirectOk(`/admin/orders/${orderId}`, statusChangeMessage(to));
}

/** 메모 추가 → 중앙 액션 위임 (actor/로그/알림 일관) */
export async function addNote(formData: FormData) {
  await addOrderNoteCentral(formData);
  const orderId = String(formData.get("orderId") || "");
  if (orderId) {
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/admin/orders`);
  }
}

/** 단건 삭제 → 중앙 액션 위임 */
export async function deleteOrderDirect(orderId: string) {
  await deleteOrderDirectCentral(orderId);
  // 중앙에서 redirect 처리
}
