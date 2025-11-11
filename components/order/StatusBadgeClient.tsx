"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  orderId: string;
  initialStatus: "PENDING" | "PAID" | "FULFILLED" | "CANCELED" | "REFUNDED";
  initialUpdatedAt?: string | null;
  intervalMs?: number; // 기본 5000
};

export default function StatusBadgeClient({
  orderId,
  initialStatus,
  initialUpdatedAt,
  intervalMs = 5000,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [lastSync, setLastSync] = useState<Date | null>(
    initialUpdatedAt ? new Date(initialUpdatedAt) : null
  );
  const [errorCount, setErrorCount] = useState(0);
  const timer = useRef<number | null>(null);

  const color = useMemo(() => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "PAID":
        return "bg-blue-100 text-blue-800";
      case "FULFILLED":
        return "bg-green-100 text-green-800";
      case "REFUNDED":
        return "bg-purple-100 text-purple-800";
      case "CANCELED":
        return "bg-zinc-200 text-zinc-700";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  }, [status]);

  async function refreshOnce() {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.status && json.status !== status) {
        setStatus(json.status);
      }
      setLastSync(new Date());
      setErrorCount(0);
    } catch {
      setErrorCount((c) => c + 1);
    }
  }

  useEffect(() => {
    // 첫 로드 시 1회 동기화
    refreshOnce();

    // 폴링 시작
    timer.current = window.setInterval(refreshOnce, intervalMs) as unknown as number;
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [orderId, intervalMs]);

  const tooManyErrors = errorCount >= 3;

  return (
    <div className="flex items-center gap-3">
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${color}`}>
        {status}
      </span>

      <button
        type="button"
        onClick={refreshOnce}
        className="text-sm underline decoration-dotted hover:opacity-80"
        aria-label="상태 새로고침"
      >
        새로고침
      </button>

      <span className="text-xs text-zinc-500">
        {lastSync ? `마지막 동기화: ${lastSync.toLocaleTimeString()}` : "동기화 대기중"}
      </span>

      {tooManyErrors && (
        <span className="text-xs text-amber-600">네트워크 불안정—수동 새로고침 권장</span>
      )}
    </div>
  );
}
