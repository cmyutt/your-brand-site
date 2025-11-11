"use client";

import { OrderStatus } from "@prisma/client";

type Event = {
  id: string;
  type: string; // "STATUS_CHANGED" | "NOTE" | ... (원본 영문)
  from: OrderStatus | null;
  to: OrderStatus | null;
  note: string | null;
  actor: string | null;
  createdAt: string; // ISO
};

export default function Events({ events }: { events: Event[] }) {
  const koStatus = (s: OrderStatus | null) => {
    switch (s) {
      case "PENDING":
        return "대기중";
      case "PAID":
        return "결제완료";
      case "FULFILLED":
        return "배송완료";
      case "CANCELED":
        return "취소됨";
      case "REFUNDED":
        return "환불됨";
      default:
        return "";
    }
  };

  const koType = (t: string) => {
    switch (t) {
      case "STATUS_CHANGED":
        return "상태 변경";
      case "NOTE":
        return "메모";
      default:
        return t;
    }
  };

  if (!events?.length) {
    return <p style={{ opacity: 0.7 }}>이력 없음</p>;
  }

  return (
    <ul style={{ display: "grid", gap: 8 }}>
      {events.map((e) => (
        <li
          key={e.id}
          style={{
            border: "1px solid #eee",
            borderRadius: 10,
            padding: 10,
            display: "grid",
            gap: 6,
          }}
        >
          <div style={{ fontWeight: 700 }}>
            {koType(e.type)}
            <span style={{ opacity: 0.6, marginLeft: 6 }}>
              · {new Date(e.createdAt).toLocaleString()}
            </span>
          </div>

          {e.type === "STATUS_CHANGED" ? (
            <div>
              상태: {koStatus(e.from)} → {koStatus(e.to)}
              {e.note ? <span> · {e.note}</span> : null}
            </div>
          ) : null}

          {e.type !== "STATUS_CHANGED" && e.note ? (
            <div>{e.note}</div>
          ) : null}

          <div style={{ opacity: 0.6 }}>
            by {e.actor?.trim() || "system"}
          </div>
        </li>
      ))}
    </ul>
  );
}
