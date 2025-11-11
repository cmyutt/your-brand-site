"use client";

import Link from "next/link";

export type StatusItem = {
  label: string;      // 표시 텍스트 (예: 대기중, 결제완료 ...)
  href: string;       // 이동 링크 (/admin/orders?... )
  count: number;      // 건수
};

export default function StatusCountListClient({ items }: { items: StatusItem[] }) {
  return (
    <ul
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 8,
        listStyle: "none",
        margin: 0,
        padding: 0,
      }}
    >
      {items.map((it) => (
        <li
          key={it.label}
          style={{
            border: "1px dashed #eee",
            borderRadius: 10,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
          }}
          title={`${it.label} 주문 보기`}
        >
          <Link
            href={it.href}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <span>{it.label}</span>
            <strong>{it.count.toLocaleString()}</strong>
          </Link>
        </li>
      ))}
    </ul>
  );
}
