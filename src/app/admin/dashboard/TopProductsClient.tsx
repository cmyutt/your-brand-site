"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Item = { productId: string; name: string; qty: number; amount: number };

export default function TopProductsClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  const onClick = (name: string) => {
    // 예: q 파라미터로 필터링
    const u = new URLSearchParams(sp);
    u.set("q", name);
    router.push(`/admin/orders?${u.toString()}`);
  };

  return (
    <ul className="grid gap-2">
      {items.map((it) => (
        <li
          key={it.productId}
          onClick={() => onClick(it.name)}
          className="cursor-pointer rounded-lg border px-3 py-2 hover:bg-gray-50"
          title="이 상품으로 주문 목록 필터링"
        >
          <div className="font-medium">{it.name}</div>
          <div className="text-sm text-gray-600">
            수량 {it.qty.toLocaleString()} · 매출 {it.amount.toLocaleString()}원
          </div>
        </li>
      ))}
    </ul>
  );
}
