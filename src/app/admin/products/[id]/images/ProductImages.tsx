"use client";
import Image from "next/image";

type Img = { id: string; url: string; alt?: string | null; sort: number };

export default function ProductImages({ images }: { images: Img[] }) {
  if (!images?.length) {
    return <p className="text-gray-500">등록된 이미지가 없습니다.</p>;
  }

  return (
    <ul
      className="grid gap-4"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
      }}
    >
      {images.map((img) => (
        <li
          key={img.id}
          // ✅ 고정 크기 박스(overflow 숨김) — 레이아웃 붕괴 방지
          style={{
            position: "relative",
            width: "100%",
            paddingBottom: "100%", // 1:1 정사각
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <Image
            src={img.url}
            alt={img.alt ?? "상품 이미지"}
            fill
            className="object-cover"
            sizes="160px"
            // 혹시 큰 원본이 로드되어도 레이아웃 안 깨지도록
            priority={false}
          />
        </li>
      ))}
    </ul>
  );
}
