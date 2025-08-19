// src/app/admin/products/_actions.ts
"use server";

import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

/* 공통: 숫자 파싱 가드(Int) */
function parseIntGuard(v: FormDataEntryValue | null, name: string) {
  const s = String(v ?? "").replace(/[^\d-]/g, "");
  const n = parseInt(s || "0", 10);
  if (!Number.isFinite(n) || n < -2147483648 || n > 2147483647) {
    throw new Error(`${name}는 -2,147,483,648 ~ 2,147,483,647 범위의 정수`);
  }
  return n;
}

function revalidateProduct(productId: string) {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");          // 스토어에 반영 필요 시
  revalidatePath("/products");  // 스토어 목록 별도 경로 대비
}

/* 옵션 생성 */
export async function createVariant(formData: FormData) {
  const productId = String(formData.get("productId") || "");
  const name = String(formData.get("name") || "").trim();
  const stock = parseIntGuard(formData.get("stock"), "stock");
  const extra = parseIntGuard(formData.get("extra"), "extra");
  if (!productId || !name) throw new Error("productId/name 필요");

  await prisma.variant.create({
    data: { productId, name, stock, extra },
  });

  revalidateProduct(productId);
}

export async function setOrderStatus(id: string, status: OrderStatus) {
  if (!id) throw new Error("id 필요");
  if (!Object.values(OrderStatus).includes(status)) throw new Error("잘못된 상태");

  await prisma.order.update({ where: { id }, data: { status } });

  revalidatePath("/admin/orders");
  revalidatePath("/");
  revalidatePath("/orders");
}
/* 옵션 수정 */
export async function updateVariant(formData: FormData) {
  const id = String(formData.get("id") || "");
  const productId = String(formData.get("productId") || "");
  const name = String(formData.get("name") || "").trim();
  const stock = parseIntGuard(formData.get("stock"), "stock");
  const extra = parseIntGuard(formData.get("extra"), "extra");
  if (!id || !productId) throw new Error("id/productId 필요");

  await prisma.variant.update({
    where: { id },
    data: { name, stock, extra },
  });

  revalidateProduct(productId);
}

/* 옵션 삭제 */
export async function deleteVariant(formData: FormData) {
  const id = String(formData.get("id") || "");
  const productId = String(formData.get("productId") || "");
  if (!id || !productId) throw new Error("id/productId 필요");

  await prisma.variant.delete({ where: { id } });

  revalidateProduct(productId);
}
