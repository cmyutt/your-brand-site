import prisma from "@/lib/prisma";
import type { Variant } from "@prisma/client";
import ProductImages from "./images/ProductImages";
import { uploadProductImage, deleteProductImage } from "./images/actions";

export const runtime = "nodejs";

// ── 인라인 업로드 폼(Server Component)
function UploadFormInline({ productId }: { productId: string }) {
  return (
    <form
      action={uploadProductImage} // ✅ 서버 액션 직접 연결
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        border: "1px dashed #ccc",
        padding: 12,
        borderRadius: 12,
      }}
    >
      <input type="hidden" name="productId" value={productId} />
      <input type="file" name="file" accept="image/*" required />
      <input type="text" name="alt" placeholder="대체 텍스트(선택)" style={{ width: 200 }} />
      <button type="submit">업로드</button>
    </form>
  );
}

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;

  const product = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: {
      variants: { orderBy: { name: "asc" } },
      images: { orderBy: { sort: "asc" } },
    },
  });

  return (
    <section style={{ display: "grid", gap: 24 }}>
      {/* 이미지 섹션 */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>이미지</h2>

        <UploadFormInline productId={product.id} />

        <div style={{ marginTop: 12 }}>
          <ProductImages images={product.images} />
        </div>

        {product.images.length > 0 && (
          <ul
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            {product.images.map((img) => (
              <li key={img.id} style={{ display: "flex", justifyContent: "flex-end" }}>
                <form action={deleteProductImage}>
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="imageId" value={img.id} />
                  <input type="hidden" name="imageUrl" value={img.url} />
                  <button
                    type="submit"
                    style={{
                      background: "#fee",
                      border: "1px solid #f88",
                      padding: "4px 8px",
                      borderRadius: 8,
                    }}
                  >
                    삭제
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 옵션 섹션 (기존 그대로) */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>옵션</h2>

        <ul style={{ display: "grid", gap: 8, marginBottom: 12 }}>
          {product.variants.map((v: Variant) => (
            <li key={v.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <form
                action="/admin/products/update-variant"
                style={{ display: "flex", gap: 8, alignItems: "center" }}
              >
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="id" value={v.id} />
                <input name="name" placeholder="name" defaultValue={v.name || ""} />
                <input
                  name="stock"
                  inputMode="numeric"
                  placeholder="stock"
                  defaultValue={v.stock ?? 0}
                  style={{ width: 100 }}
                />
                <input
                  name="extra"
                  inputMode="numeric"
                  placeholder="extra(원)"
                  defaultValue={v.extra ?? 0}
                  style={{ width: 120 }}
                />
                <button type="submit">Save</button>
              </form>

              <form action="/admin/products/delete-variant">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="id" value={v.id} />
                <button
                  type="submit"
                  style={{
                    background: "#fee",
                    border: "1px solid #f88",
                    padding: "4px 8px",
                  }}
                >
                  삭제
                </button>
              </form>
            </li>
          ))}
          {product.variants.length === 0 && <li style={{ opacity: 0.7 }}>옵션 없음</li>}
        </ul>

        <form action="/admin/products/create-variant" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="hidden" name="productId" value={product.id} />
          <input name="name" placeholder="name (예: S)" />
          <input name="stock" inputMode="numeric" placeholder="stock" defaultValue={0} style={{ width: 100 }} />
          <input name="extra" inputMode="numeric" placeholder="extra(원)" defaultValue={0} style={{ width: 120 }} />
          <button type="submit">옵션 추가</button>
        </form>
      </div>
    </section>
  );
}
