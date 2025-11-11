"use client";

import { OrderStatus } from "@prisma/client";

type Props = {
  statusCount: Record<OrderStatus, number>;
  /** YYYY-MM-DD (KST) */
  rangeStart: string;
  /** YYYY-MM-DD (KST) */
  rangeEnd: string;
};

export default function StatusCountList({ statusCount, rangeStart, rangeEnd }: Props) {
  const fmt = (n: number) => n.toLocaleString();

  const ordersLink = (status: string) => {
    const u = new URLSearchParams();
    u.set("status", status);
    u.set("from", rangeStart);
    u.set("to", rangeEnd);
    return `/admin/orders?${u.toString()}`;
  };

  const labelKo = (s: OrderStatus) =>
    s === "PENDING" ? "대기중" :
    s === "PAID" ? "결제완료" :
    s === "FULFILLED" ? "배송완료" :
    s === "CANCELED" ? "취소됨" : "환불됨";

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
      {(["PENDING","PAID","FULFILLED","CANCELED","REFUNDED"] as OrderStatus[]).map((s) => {
        const href = ordersLink(s);
        return (
          <li
            key={s}
            onClick={() => (location.href = href)}
            style={{
              border: "1px dashed #eee",
              borderRadius: 10,
              padding: "10px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            title={`${labelKo(s)} 주문 보기`}
          >
            <span>{labelKo(s)}</span>
            <strong>{fmt(statusCount[s])}</strong>
          </li>
        );
      })}
    </ul>
  );
}
