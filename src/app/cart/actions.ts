"use server";

import { addLine, removeLine, updateQty, clearCart } from "@/lib/cart";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

function resolveNextPath(fallback: string) {
  const referer = headers().get("referer");
  if (!referer) return fallback;
  try {
    const url = new URL(referer);
    return url.pathname + url.search;
  } catch {
    return fallback;
  }
}

async function assertAuthenticated(fallback: string) {
  const session = await getSession();
  if (session) return session;
  const next = resolveNextPath(fallback);
  redirect(`/login?next=${encodeURIComponent(next)}`);
}

export async function addToCart(formData: FormData) {
  await assertAuthenticated("/cart");

  const productId = String(formData.get("productId") || "");
  const v = String(formData.get("variantId") || "");
  const variantId = v || null;
  const qty = Math.max(1, parseInt(String(formData.get("qty") || "1"), 10) || 1);
  if (!productId) throw new Error("productId required");

  // Ensure we are not adding more than available stock for optioned items
  if (variantId) {
    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
      select: { stock: true, name: true },
    });
    const stock = variant?.stock ?? 0;
    if (stock <= 0) {
      throw new Error(`Variant is sold out: ${variant?.name ?? variantId}`);
    }
    if (qty > stock) {
      throw new Error(`Insufficient stock: up to ${stock} unit(s) available.`);
    }
  }

  await addLine({ productId, variantId, qty });
  redirect("/cart");
}

export async function removeFromCart(formData: FormData) {
  await assertAuthenticated("/cart");

  const productId = String(formData.get("productId") || "");
  const v = String(formData.get("variantId") || "");
  const variantId = v || null;

  await removeLine({ productId, variantId });
  redirect("/cart");
}

export async function updateCartQty(formData: FormData) {
  await assertAuthenticated("/cart");

  const productId = String(formData.get("productId") || "");
  const v = String(formData.get("variantId") || "");
  const variantId = v || null;
  const qty = Math.max(1, parseInt(String(formData.get("qty") || "1"), 10) || 1);

  // Prevent quantities beyond current stock
  if (variantId) {
    const stock = (await prisma.variant.findUnique({
      where: { id: variantId },
      select: { stock: true },
    }))?.stock ?? 0;
    if (qty > stock) {
      throw new Error(`Insufficient stock: up to ${stock} unit(s) allowed.`);
    }
  }

  await updateQty({ productId, variantId, qty });
  // Refresh cart data without a full redirect
  revalidatePath("/cart");
}

export async function clearCartAction() {
  await assertAuthenticated("/cart");

  await clearCart();
  redirect("/cart");
}
