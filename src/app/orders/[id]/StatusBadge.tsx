"use client";

import { useEffect, useState } from "react";

type Props = {
  orderId: string;
  initialStatus: "PENDING" | "PAID" | "FULFILLED" | "CANCELED" | "REFUNDED";
};

export default function StatusBadge({ orderId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        const json = await res.json();
        if (json?.status && json.status !== status) setStatus(json.status);
      } catch {
        // 네트워크 에러는 조용히 무시
      }
    }, 5000); // 5초 폴링
    return () => clearInterval(iv);
  }, [orderId, status]);

  const tone =
    status === "PAID" ? "border-green-500 text-green-700" :
    status === "FULFILLED" ? "border-blue-500 text-blue-700" :
    status === "CANCELED" || status === "REFUNDED" ? "border-red-500 text-red-700" :
    "border-yellow-500 text-yellow-700";

  return (
    <span className={`text-xs rounded-full border px-2 py-0.5 ${tone}`}>
      {status}
    </span>
  );
}
