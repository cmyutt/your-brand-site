// src/app/admin/products/[id]/images/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "product-images";

// 🔒 지연 생성 + 친절한 에러 메시지 (빌드 중 crash 방지)
let _sb: SupabaseClient | null = null;
function mustEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE") {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`[config] ${name} is required. Set it in Vercel Environment Variables.`);
  return v;
}
function getSupabase(): SupabaseClient {
  if (_sb) return _sb;
  _sb = createClient(mustEnv("SUPABASE_URL"), mustEnv("SUPABASE_SERVICE_ROLE"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _sb;
}

// -------- util --------
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
function revalidateTargets(productId: string) {
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/"); // 홈에 리스트가 있을 수 있으므로
}

// -------- actions --------
export async function uploadProductImage(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("file") as File | null;
  const alt = (formData.get("alt") as string | null) ?? null;

  if (!productId) throw new Error("productId required");
  if (!file) throw new Error("file required");

  const safe = sanitizeKey(file.name || "image");
  const ext = getExt(file, "bin");
  const objectKey = `${productId}/${Date.now()}_${safe}.${ext}`;

  const supabase = getSupabase();

  // 업로드
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(objectKey, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (upErr) {
    throw new Error(`storage.upload failed: ${upErr.message} (key=${objectKey})`);
  }

  // 공개 URL
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectKey);
  const publicUrl = pub.publicUrl;

  // 정렬값 계산 후 DB 기록
  const sort = await prisma.productImage.count({ where: { productId } });
  await prisma.productImage.create({
    data: { productId, url: publicUrl, alt, sort },
  });

  revalidateTargets(productId);
}

export async function deleteProductImage(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const imageId = String(formData.get("imageId") ?? "");
  const imageUrl = String(formData.get("imageUrl") ?? "");

  if (!productId || !imageId || !imageUrl) throw new Error("invalid params");

  // 공개 URL → 스토리지 키 추출 (보다 견고하게 URL 파싱)
  let storageKey: string | undefined;
  try {
    const u = new URL(imageUrl);
    const m = u.pathname.match(/\/storage\/v1\/object\/public\/product-images\/(.+)$/);
    storageKey = m?.[1];
  } catch {
    // fallback: 기존 방식
    storageKey = imageUrl.split("/object/public/")[1]?.replace(`product-images/`, "");
  }

  if (storageKey) {
    const supabase = getSupabase();
    await supabase.storage.from(BUCKET).remove([storageKey]);
  }

  await prisma.productImage.delete({ where: { id: imageId } });

  revalidateTargets(productId);
}
