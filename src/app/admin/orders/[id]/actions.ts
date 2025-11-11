// src/app/admin/orders/[id]/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { setOrderStatus, addOrderNote as addOrderNoteCentral } from "../_actions";

function revalidate(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${orderId}`);
}

export async function transitionOrderStatus(formData: FormData): Promise<void> {
  const orderId = String(formData.get("orderId") ?? "");
  const toRaw = String(formData.get("to") ?? "");
  const note = (formData.get("note") as string | null) ?? null;

  if (!orderId) throw new Error("orderId required");
  await setOrderStatus(orderId, toRaw as OrderStatus, note);
  revalidate(orderId);
}

export async function addOrderNote(formData: FormData): Promise<void> {
  await addOrderNoteCentral(formData);
  const orderId = String(formData.get("orderId") ?? "");
  if (orderId) revalidate(orderId);
}
