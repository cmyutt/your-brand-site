// src/app/admin/products/[id]/variants/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function parseIntGuard(val: FormDataEntryValue | null, {
  field,
  min = -2147483648,
  max = 2147483647,
}: { field: string; min?: number; max?: number }) {
  const s = String(val ?? "").replace(/[^\d-]/g, "");
  const n = Number.parseInt(s || "0", 10);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`${field} 범위 오류`);
  }
  return n;
}

function revalidateTargets(productId: string) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
}

export async function updateVariant(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const stock = parseIntGuard(formData.get("stock"), { field: "stock", min: 0, max: 2_147_483_647 });
  const extra = parseIntGuard(formData.get("extra"), { field: "extra", min: -2_147_483_648, max: 2_147_483_647 });

  if (!productId || !id) throw new Error("invalid params");
  await prisma.variant.update({ where: { id }, data: { name, stock, extra } });
  revalidateTargets(productId);
}

export async function deleteVariant(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!productId || !id) throw new Error("invalid params");

  await prisma.variant.delete({ where: { id } });
  revalidateTargets(productId);
}

export async function createVariant(formData: FormData) {
  const productId = String(formData.get("productId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const stock = parseIntGuard(formData.get("stock"), { field: "stock", min: 0, max: 2_147_483_647 });
  const extra = parseIntGuard(formData.get("extra"), { field: "extra", min: -2_147_483_648, max: 2_147_483_647 });

  if (!productId || !name) throw new Error("invalid params");

  await prisma.variant.create({
    data: { productId, name, stock, extra },
  });

  revalidateTargets(productId);
}
