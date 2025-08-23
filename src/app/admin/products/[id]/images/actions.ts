"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const BUCKET = "product-images";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

function sanitizeKey(input: string, fallback = "file") {
  const base =
    (input || fallback)
      .replace(/\.[^/.]+$/, "")
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\.+/, "")
      .slice(0, 80) || fallback;
  return base;
}

function getExt(file: File, fallback = "bin") {
  const byType = file.type?.split("/")[1];
  const byName = file.name?.split(".").pop();
  return (byType || byName || fallback).toLowerCase();
}

export async function uploadProductImage(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file") as File | null;
  const alt = (formData.get("alt") as string | null) ?? null;

  if (!productId) throw new Error("productId required");
  if (!file) throw new Error("file required");

  const safeName = sanitizeKey(file.name || "image");
  const ext = getExt(file, "bin");
  const objectKey = `${productId}/${Date.now()}_${safeName}.${ext}`;

  const up = await supabase.storage.from(BUCKET).upload(objectKey, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (up.error) {
    throw new Error(`storage.upload failed: ${up.error.message} (key=${objectKey})`);
  }

  const pub = supabase.storage.from(BUCKET).getPublicUrl(objectKey);
  const publicUrl = pub.data.publicUrl;

  const sort = await prisma.productImage.count({ where: { productId } });

  await prisma.productImage.create({
    data: { productId, url: publicUrl, alt, sort },
  });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}

export async function deleteProductImage(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const imageId = String(formData.get("imageId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "");

  if (!productId || !imageId || !imageUrl) throw new Error("invalid params");

  const path = imageUrl.split("/object/public/")[1]?.replace(`product-images/`, "");
  if (path) {
    await supabase.storage.from(BUCKET).remove([path]);
  }

  await prisma.productImage.delete({ where: { id: imageId } });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
}
