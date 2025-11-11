"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

// 공용 유틸 (price 정수 가드)
function parsePrice(input: FormDataEntryValue | null) {
  const s = String(input ?? "").replace(/[^\d]/g, "");
  const n = parseInt(s || "0", 10);
  if (!Number.isFinite(n) || n < 0 || n > 2147483647) {
    throw new Error("price는 0~2,147,483,647");
  }
  return n;
}

function isP2002Slug(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002" &&
    Array.isArray((e.meta as any)?.target) &&
    (e.meta as any)?.target.includes("slug")
  );
}

function revalidateAdminAndStore() {
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/products");
}

// ✅ 서버 액션: 에러를 throw 하지 말고 상태로 반환
export async function createProduct(
  prevState: { error?: string },
  formData: FormData
) {
  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const imagesRaw = String(formData.get("images") || "").trim();
  const variantsRaw = String(formData.get("variants") || "").trim();

  if (!name || !slugInput) return { error: "name/slug 필요" };

  let price: number;
  try {
    price = parsePrice(formData.get("price"));
  } catch (e: any) {
    return { error: e?.message || "가격 형식이 올바르지 않습니다." };
  }

  try {
    await prisma.product.create({
      data: {
        name,
        slug: slugInput,
        price,
        description: description || null,
        images: {
          create: imagesRaw
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
            .map((url, i) => ({ url, sort: i })),
        },
        variants: {
          create: (() => {
            const arr = variantsRaw
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
              .map((v) => ({ name: v, stock: 0, extra: 0 }));
            return arr.length ? arr : [{ name: "Default", stock: 0, extra: 0 }];
          })(),
        },
        published: true,
      },
    });
  } catch (err) {
    if (isP2002Slug(err)) {
      return { error: `slug 중복: "${slugInput}" 이미 사용 중입니다.` };
    }
    return { error: "상품 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  revalidateAdminAndStore();
  return { error: undefined };
}
