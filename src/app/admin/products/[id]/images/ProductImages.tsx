// src/app/admin/products/[id]/images/ProductImages.tsx
"use client";

import { deleteProductImage } from "./actions";

type Img = { id: string; url: string; alt?: string | null; sort: number };

/**
 * 요구사항
 * - 이미지 높이는 고정(200px)
 * - 가로 길이는 원본 비율대로 자동 조절
 * - 여러 장이 자연스럽게 줄바꿈되며 나열
 *
 * 구현
 * - 그리드 대신 flex-wrap 사용 (각 항목 너비가 이미지 비율에 따라 달라지므로)
 * - <img> 태그로 height:100% + width:auto 적용 (비율 유지)
 *   (관리자용 썸네일 영역이라 next/image 최적화 없이 충분)
 */
export default function ProductImages({
  productId,
  images,
}: {
  productId: string;
  images: Img[];
}) {
  if (!images?.length) {
    return <p className="text-gray-500">등록된 이미지가 없습니다.</p>;
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      {images.map((img) => (
        <div
          key={img.id}
          style={{
            position: "relative",
            height: 200, // ✅ 높이 고정
            // 너비는 내부 이미지(width:auto)로 자연 결정
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
            background: "#fafafa",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
          }}
          title={img.alt || undefined}
        >
          {/* 비율 유지: 높이 채우고 가로는 자동 */}
          <img
            src={img.url}
            alt={img.alt ?? "상품 이미지"}
            style={{
              height: "100%",
              width: "auto",
              display: "block",
              objectFit: "contain",
            }}
          />

          {/* 삭제 버튼 (우하단) */}
          <form
            action={deleteProductImage}
            style={{ position: "absolute", right: 6, bottom: 6, margin: 0 }}
          >
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="imageId" value={img.id} />
            <input type="hidden" name="imageUrl" value={img.url} />
            <button
              type="submit"
              style={{
                background: "#fee",
                border: "1px solid #f88",
                padding: "2px 6px",
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              삭제
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
