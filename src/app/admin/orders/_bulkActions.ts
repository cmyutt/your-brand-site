"use server";
// CODPATCH: bulk actions — redirect & message helpers
import { redirectOk, redirectError } from "@/lib/redirector";
import { bulkStatusMessage, deletedMessage } from "@/lib/flashMessage";

import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setOrderStatus, deleteOrder } from "./_actions";
import { notifyAdmin } from "@/lib/notify";

/** ids 파싱: ids, ids[], ids=csv 모두 지원 */
function parseIds(formData: FormData): string[] {
  const set = new Set<string>();

  // ids (다중 / csv 허용)
  formData.getAll("ids").forEach(v => {
    String(v || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(s => set.add(s));
  });

  // ids[] (다중)
  formData.getAll("ids[]")
    .map(String)
    .map(s => s.trim())
    .filter(Boolean)
    .forEach(s => set.add(s));

  return Array.from(set);
}

function revalidateAll() {
  revalidatePath("/admin/orders");
  revalidatePath("/");
}

export async function bulkSetOrderStatus(formData: FormData) {
  const to = String(formData.get("toStatus") || "");
  if (!Object.values(OrderStatus).includes(to as OrderStatus)) {
    throw new Error("유효하지 않은 상태값");
  }

  const ids = parseIds(formData);
  if (ids.length === 0) {
    revalidateAll();
    return redirectOk("/admin/orders", bulkStatusMessage(to, 0));
  }

  const MAX = 200;
  const target = ids.slice(0, MAX);

  let ok = 0;
  let fail = 0;

  for (const id of target) {
    try {
      await setOrderStatus(id, to as OrderStatus);
      ok++;
    } catch (e) {
      console.warn(`[bulkSetOrderStatus] ${id} 실패:`, e);
      fail++;
    }
  }

  try {
    await notifyAdmin(`🔁 일괄 상태 변경\n• 대상: ${target.length}건\n• 성공: ${ok} / 실패: ${fail}\n• 새 상태: ${to}`);
  } catch {}

  revalidateAll();
  return redirectOk("/admin/orders", bulkStatusMessage(to, ok));
}

export async function bulkDeleteOrders(formData: FormData) {
  const ids = parseIds(formData);
  if (ids.length === 0) {
    revalidateAll();
    return redirectOk("/admin/orders", deletedMessage(0));
  }

  const MAX = 200;
  const target = ids.slice(0, MAX);

  let ok = 0;
  let fail = 0;

  for (const id of target) {
    const fd = new FormData();
    fd.set("orderId", id);
    try {
      await deleteOrder(fd);
      ok++;
    } catch (e) {
      console.warn(`[bulkDeleteOrders] ${id} 실패:`, e);
      fail++;
    }
  }

  try {
    await notifyAdmin(`🗑️ 일괄 주문 삭제\n• 요청: ${target.length}건\n• 성공: ${ok} / 실패: ${fail}`);
  } catch {}

  revalidateAll();
  return redirectOk("/admin/orders", deletedMessage(ok));
}
