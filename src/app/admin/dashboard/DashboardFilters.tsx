"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OrderStatus } from "@prisma/client";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PENDING", label: "대기중" },
  { value: "PAID", label: "결제완료" },
  { value: "FULFILLED", label: "배송완료" },
  { value: "CANCELED", label: "취소됨" },
  { value: "REFUNDED", label: "환불됨" },
];

export default function DashboardFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const range = sp.get("range") || "7d";
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  const status = sp.get("status") || ""; // comma-separated

  const statusSet = useMemo(() => new Set(status.split(",").filter(Boolean)), [status]);

  const [dateError, setDateError] = useState<string>("");

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === "") next.delete(k);
      else next.set(k, v);
    });
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  // 사용자 지정 날짜 유효성 검사
  useEffect(() => {
    if (range !== "custom") {
      setDateError("");
      return;
    }
    if (!from || !to) {
      setDateError("");
      return;
    }
    const f = Number.isNaN(Date.parse(from)) ? null : new Date(`${from}T00:00:00Z`);
    const t = Number.isNaN(Date.parse(to)) ? null : new Date(`${to}T00:00:00Z`);
    if (!f || !t) {
      setDateError("날짜 형식이 올바르지 않습니다.");
      return;
    }
    if (f > t) setDateError("시작일이 종료일보다 클 수 없습니다.");
    else setDateError("");
  }, [range, from, to]);

  const onToggleStatus = (s: OrderStatus) => {
    const next = new Set(statusSet);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    const val = Array.from(next).join(",");
    update({ status: val || undefined });
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-end gap-8">
      {/* 기간 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">기간</label>
        <select
          className="h-9 rounded-lg border px-2 text-sm"
          value={range}
          onChange={(e) => update({ range: e.target.value })}
        >
          <option value="today">오늘</option>
          <option value="yesterday">어제</option>
          <option value="7d">최근 7일</option>
          <option value="30d">최근 30일</option>
          <option value="custom">사용자 지정</option>
        </select>
      </div>

      {/* 사용자 지정 from/to */}
      {range === "custom" && (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">From (KST)</label>
            <input
              type="date"
              className="h-9 rounded-lg border px-2 text-sm"
              value={from}
              onChange={(e) => update({ from: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-600">To (KST)</label>
            <input
              type="date"
              className="h-9 rounded-lg border px-2 text-sm"
              value={to}
              onChange={(e) => update({ to: e.target.value })}
            />
          </div>
          {dateError && (
            <div className="text-xs text-red-600">
              {dateError}
            </div>
          )}
        </>
      )}

      {/* 상태 멀티 토글 */}
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-600">상태</label>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const active = statusSet.has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onToggleStatus(opt.value)}
                className={[
                  "rounded-lg px-2.5 py-1 text-sm ring-1",
                  active
                    ? "ring-blue-300 bg-blue-50 text-blue-700"
                    : "ring-gray-200 hover:bg-gray-50",
                ].join(" ")}
                title={opt.label}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <button
            type="button"
            className="underline"
            onClick={() => update({ status: undefined })}
            title="필터 초기화"
          >
            상태 초기화
          </button>
        </div>
      </div>
    </form>
  );
}
