// CODPATCH: orders bulk inline actions — no-redirect
"use server";

import type { OrderStatus } from "@prisma/client";
import { userOk, userFail } from "@/lib/result";
import { bulkSetStatusInline, bulkDeleteInline } from "./inlineActions";

export async function bulkSetStatus(ids: string[], toStatus: OrderStatus) {
  try {
    return await bulkSetStatusInline({ ids, toStatus });
  } catch (e: any) {
    return userFail(e?.message ?? "일괄 변경 중 오류가 발생했습니다");
  }
}

export async function bulkDelete(ids: string[]) {
  try {
    return await bulkDeleteInline(ids);
  } catch (e: any) {
    return userFail(e?.message ?? "일괄 삭제 중 오류가 발생했습니다");
  }
}

