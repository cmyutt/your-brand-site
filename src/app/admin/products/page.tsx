// src/app/admin/products/page.tsx  (수정: slug 중복 시 redirect로 에러 표시)
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// 관계 포함 타입
type ProductWithRels = Prisma.ProductGetPayload<{
  include: { images: true; variants: { orderBy: { name: "asc" } } };
}>;

/* ----------------------- util ----------------------- */
function parsePrice(input: FormDataEntryValue | null) {
  const s = String(input ?? "").replace(/[^\d]/g, "");
  const n = parseInt(s || "0", 10);
  if (!Number.isFinite(n) || n < 0 || n > 2147483647) {
    throw new Error("price는 0~2,147,483,647");
  }
  return n;
}

function buildQS(q: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => {
    if (v !== undefined && v !== "") u.set(k, String(v));
  });
  return `?${u.toString()}`;
}

function revalidateAdminAndStore() {
  revalidatePath("/admin/products");
  revalidatePath("/");            // 홈에 리스트가 있을 때
  revalidatePath("/products");    // /products 페이지를 별도로 쓰는 경우 대비
}

function isP2002Slug(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    const target = (e.meta as Record<string, unknown> | undefined)?.target;
    return Array.isArray(target) && target.includes("slug");
  }
  return false;
}

/* ----------------------- server actions ----------------------- */
// 생성 (slug 중복 사전 체크 + P2002 이중 방어) - ❗에러는 throw하지 않고 redirect로 전달
async function createProduct(formData: FormData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const imagesRaw = String(formData.get("images") || "").trim();
  const variantsRaw = String(formData.get("variants") || "").trim();

  if (!name || !slugInput) {
    redirect(`/admin/products?error=${encodeURIComponent("name/slug 필요")}`);
  }

  let price: number;
  try {
    price = parsePrice(formData.get("price"));
  } catch (e: any) {
    redirect(`/admin/products?error=${encodeURIComponent(e?.message || "가격 형식 오류")}`);
  }

  // 사전 중복 체크
  const exists = await prisma.product.findUnique({ where: { slug: slugInput } });
  if (exists) {
    const msg = `slug 중복: "${slugInput}" 은(는) 이미 사용 중입니다. 다른 slug로 시도해 주세요.`;
    redirect(`/admin/products?error=${encodeURIComponent(msg)}`);
  }

  const imageArr: Prisma.ProductImageCreateWithoutProductInput[] = imagesRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((url, i) => ({ url, sort: i }));

  const variantArr: Prisma.VariantCreateWithoutProductInput[] = variantsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((v) => ({ name: v, stock: 0, extra: 0 }));

  try {
    await prisma.product.create({
      data: {
        name,
        slug: slugInput,
        price,
        description: description || null,
        images: { create: imageArr },
        variants: {
          create: variantArr.length > 0 ? variantArr : [{ name: "Default", stock: 0, extra: 0 }],
        },
        published: true,
      },
    });
  } catch (err: unknown) {
    if (isP2002Slug(err)) {
      const msg = `slug 중복: "${slugInput}" 이(가) 방금 사용되었습니다. 다른 slug로 다시 시도해 주세요.`;
      redirect(`/admin/products?error=${encodeURIComponent(msg)}`);
    }
    redirect(`/admin/products?error=${encodeURIComponent("상품 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.")}`);
  }

  revalidateAdminAndStore();
  redirect(`/admin/products?success=1`);
}

// 삭제 (CASCADE 전제)
async function deleteProduct(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  if (!id) {
    redirect(`/admin/products?error=${encodeURIComponent("id 필요")}`);
  }
  await prisma.product.delete({ where: { id } });
  revalidateAdminAndStore();
  // 현재 페이지 유지
}

// 인라인 가격 수정
async function updatePrice(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  let price: number;
  try {
    price = parsePrice(formData.get("price"));
  } catch (e: any) {
    redirect(`/admin/products?error=${encodeURIComponent(e?.message || "가격 형식 오류")}`);
  }
  if (!id) {
    redirect(`/admin/products?error=${encodeURIComponent("id 필요")}`);
  }
  await prisma.product.update({ where: { id }, data: { price } });
  revalidateAdminAndStore();
}

// 첫 번째 옵션 재고 수정(예시)
async function updateFirstVariantStock(formData: FormData) {
  "use server";
  const productId = String(formData.get("productId") || "");
  const stockStr = String(formData.get("stock") || "").replace(/[^\d-]/g, "");
  const stock = parseInt(stockStr || "0", 10);
  if (!productId || !Number.isFinite(stock)) {
    redirect(`/admin/products?error=${encodeURIComponent("입력 확인")}`);
  }

  const v = await prisma.variant.findFirst({
    where: { productId },
    orderBy: { name: "asc" },
  });
  if (!v) {
    redirect(`/admin/products?error=${encodeURIComponent("Variant 없음")}`);
  }

  await prisma.variant.update({ where: { id: v!.id }, data: { stock } });
  revalidateAdminAndStore();
}

// 공개/비공개 토글
async function togglePublish(formData: FormData) {
  "use server";
  const id = String(formData.get("id") || "");
  const next = String(formData.get("next") || "") === "true";
  if (!id) {
    redirect(`/admin/products?error=${encodeURIComponent("id 필요")}`);
  }
  await prisma.product.update({ where: { id }, data: { published: next } });
  revalidateAdminAndStore();
}

// 검색 액션
async function searchAction(formData: FormData) {
  "use server";
  const q = String(formData.get("q") || "");
  const only = String(formData.get("only") || "");
  const per = String(formData.get("per") || "");
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (only) qs.set("only", only);
  if (per) qs.set("per", per);
  redirect(`/admin/products?${qs.toString()}`);
}

/* ----------------------- components ----------------------- */

function Pagination({
  total,
  page,
  per,
  carry,
}: {
  total: number;
  page: number;
  per: number;
  carry?: { q?: string; only?: string };
}) {
  const pages = Math.max(1, Math.ceil(total / per));
  const prev = Math.max(1, page - 1);
  const next = Math.min(pages, page + 1);
  return (
    <nav style={{ display: "flex", gap: 8, marginTop: 12 }}>
      <Link href={buildQS({ ...carry, page: prev, per })}>← Prev</Link>
      <span style={{ opacity: 0.7 }}>
        Page {page} / {pages}
      </span>
      <Link href={buildQS({ ...carry, page: next, per })}>Next →</Link>
    </nav>
  );
}

function SearchBar() {
  return (
    <form action={searchAction} style={{ display: "flex", gap: 8 }}>
      <input name="q" placeholder="검색어 (name/slug)" />
      <select name="only" defaultValue="">
        <option value="">전체</option>
        <option value="published">Published만</option>
        <option value="unpublished">Draft만</option>
      </select>
      <select name="per" defaultValue="10">
        <option value="10">10개</option>
        <option value="20">20개</option>
        <option value="50">50개</option>
      </select>
      <button type="submit">검색</button>
    </form>
  );
}

/* ----------------------- page ----------------------- */

type SP = Record<string, string | string[] | undefined>;

export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  // ✅ 페이지 접근 가드
  const jar = await cookies();
  const authed = jar.get("admin")?.value === "1";
  if (!authed) redirect("/admin/login?next=/admin/products");

  const sp = await searchParams;

  const q = typeof sp?.q === "string" ? sp.q.trim() : "";
  const page = parseInt(typeof sp?.page === "string" ? sp.page : "1", 10) || 1;

  const perRaw = parseInt(typeof sp?.per === "string" ? sp.per : "10", 10) || 10;
  const per = Math.min(50, Math.max(5, perRaw));

  const only =
    typeof sp?.only === "string"
      ? (sp.only as "published" | "unpublished" | "")
      : "";

  const errorMsg = typeof sp?.error === "string" ? sp.error : "";
  const success = String(sp?.success || "") === "1";

  const where: Prisma.ProductWhereInput = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      only === "published" ? { published: true } : {},
      only === "unpublished" ? { published: false } : {},
    ],
  };

  // NOTE: Supabase pooler with connection_limit=1 can time out if we run in parallel.
  // Run sequentially to use a single connection reliably.
  const total = await prisma.product.count({ where });
  const products = await prisma.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { images: true, variants: { orderBy: { name: "asc" } } },
    skip: (page - 1) * per,
    take: per,
  }) as ProductWithRels[];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* 상단 알림 */}
      {(errorMsg || success) && (
        <div
          style={{
            border: "1px solid",
            borderColor: errorMsg ? "#fda4af" : "#86efac",
            background: errorMsg ? "#fef2f2" : "#f0fdf4",
            color: errorMsg ? "#b91c1c" : "#065f46",
            padding: 12,
            borderRadius: 10,
          }}
        >
          {errorMsg ? errorMsg : "상품이 생성되었습니다."}
        </div>
      )}

      <SearchBar />

      {/* 생성 폼 (서버 액션은 redirect로 에러/성공 전달) */}
      <form
        action={createProduct}
        style={{
          display: "grid",
          gap: 8,
          border: "1px solid #eee",
          padding: 16,
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>상품 등록</h2>

        <input name="name" placeholder="name" required />
        <input name="slug" placeholder="slug (영문/하이픈)" required />
        <input
          name="price"
          type="text"
          inputMode="numeric"
          placeholder="price (원) — 199,000도 가능"
          title="숫자 또는 숫자+쉼표"
          required
        />
        <textarea name="description" placeholder="description(optional)" />
        <textarea
          name="images"
          placeholder={`이미지 URL(줄바꿈)\nhttps://picsum.photos/seed/a/800/1000`}
          rows={3}
        />
        <input name="variants" placeholder="옵션(콤마 구분) 예: S,M,L" />

        <button type="submit">Create</button>
      </form>

      {/* 목록 */}
      <div style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>상품 목록 ({total})</h2>
          <small style={{ opacity: 0.7 }}>
            {page}/{Math.max(1, Math.ceil(total / per))} pages · per {per}
          </small>
        </div>

        {/* 카드 한 장에 행별 borderTop */}
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {products.map((p, i) => (
              <li
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12,
                  alignItems: "center",
                  padding: 12,
                  borderTop: i === 0 ? "none" : "1px solid #e5e7eb",
                }}
              >
                {/* left */}
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <strong>{p.name}</strong>
                    <span style={{ opacity: 0.7 }}>{p.slug}</span>
                    <span style={{ opacity: 0.7 }}>
                      · {p.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <div style={{ opacity: 0.7, marginTop: 4 }}>
                    {p.images[0]?.url ? (
                      <a href={p.images[0].url} target="_blank" rel="noreferrer">
                        대표이미지
                      </a>
                    ) : (
                      "이미지 없음"
                    )}{" "}
                    · 옵션 {p.variants.length}개
                  </div>
                </div>

                {/* right: actions */}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Link href={`/admin/products/${p.id}`}>Edit</Link>

                  {/* 인라인 가격 수정 */}
                  <form action={updatePrice} style={{ display: "flex", gap: 4 }}>
                    <input type="hidden" name="id" value={p.id} />
                    <input
                      name="price"
                      defaultValue={p.price}
                      inputMode="numeric"
                      style={{ width: 100 }}
                    />
                    <button type="submit">Save ₩</button>
                  </form>

                  {/* 첫 옵션 재고 수정 */}
                  <form action={updateFirstVariantStock} style={{ display: "flex", gap: 4 }}>
                    <input type="hidden" name="productId" value={p.id} />
                    <input
                      name="stock"
                      placeholder="stock"
                      defaultValue={p.variants[0]?.stock ?? 0}
                      inputMode="numeric"
                      style={{ width: 80 }}
                    />
                    <button type="submit">Save 재고</button>
                  </form>

                  {/* 공개/비공개 */}
                  <form action={togglePublish}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="next" value={(!p.published).toString()} />
                    <button type="submit" style={{ padding: "4px 8px" }}>
                      {p.published ? "Unpublish" : "Publish"}
                    </button>
                  </form>

                  {/* 삭제 */}
                  <form action={deleteProduct}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      style={{ background: "#fee", border: "1px solid #f88", padding: "4px 8px" }}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Pagination total={total} page={page} per={per} carry={{ q, only }} />
      </div>
    </div>
  );
}
