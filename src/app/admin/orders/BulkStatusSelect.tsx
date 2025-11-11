"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { OrderStatus } from "@prisma/client";

const ALL: OrderStatus[] = ["PENDING", "PAID", "FULFILLED", "CANCELED", "REFUNDED"];
const LABEL: Record<OrderStatus, string> = {
  PENDING: "대기중",
  PAID: "결제완료",
  FULFILLED: "배송완료",
  CANCELED: "취소됨",
  REFUNDED: "환불됨",
};

/** 서버 가드와 동일: 취소↔환불 상호 금지, 그 외 허용 */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  PENDING:   ["PAID", "CANCELED"],
  PAID:      ["FULFILLED", "REFUNDED", "CANCELED"],
  FULFILLED: ["REFUNDED"],
  CANCELED:  ["PENDING", "PAID", "FULFILLED"],
  REFUNDED:  ["PENDING", "PAID", "FULFILLED"],
};

type Props = {
  formId: string;
  checkboxSelector?: string; // 기본: 목록 체크박스
};

/** 선택된 주문들의 상태를 읽어서, 공통 허용 전이만 select에 활성화 */
export default function BulkStatusSelect({
  formId,
  checkboxSelector = 'input[name="selectOrder"]',
}: Props) {
  const [sel, setSel] = useState<Array<{ id: string; status: OrderStatus }>>([]);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  // 선택 동기화
  useEffect(() => {
    const sync = () => {
      const boxes = Array.from(
        document.querySelectorAll<HTMLInputElement>(checkboxSelector)
      );
      const picked = boxes
        .filter((b) => b.checked && b.dataset.orderId)
        .map((b) => ({
          id: String(b.dataset.orderId),
          status: (b.dataset.status as OrderStatus) || "PENDING",
        }));
      setSel(picked);
    };

    // 초기 + 변화 관찰
    const iv = setInterval(sync, 300);
    document.addEventListener("change", sync, true);
    return () => {
      clearInterval(iv);
      document.removeEventListener("change", sync, true);
    };
  }, [checkboxSelector]);

  // 상태별 개수
  const counts = useMemo(() => {
    const c: Record<OrderStatus, number> = {
      PENDING: 0, PAID: 0, FULFILLED: 0, CANCELED: 0, REFUNDED: 0,
    };
    for (const s of sel) c[s.status]++;
    return c;
  }, [sel]);

  // 공통 허용 전이(교집합)
  const allowedSet = useMemo(() => {
    if (sel.length === 0) return new Set<OrderStatus>(ALL);
    let cur = new Set<OrderStatus>(ALLOWED[sel[0].status]);
    for (let i = 1; i < sel.length; i++) {
      const a = new Set<OrderStatus>(ALLOWED[sel[i].status]);
      cur = new Set([...cur].filter((x) => a.has(x)));
    }
    return cur;
  }, [sel]);

  // 현재 허용값이 바뀌면 select 값을 첫 허용값으로 자동 보정
  useEffect(() => {
    const el = selectRef.current;
    if (!el) return;
    const first = ALL.find((st) => allowedSet.has(st));
    if (first) el.value = first;
  }, [allowedSet]);

  const summary =
    sel.length > 0
      ? ALL.map((st) => (counts[st] ? `${LABEL[st]} ${counts[st]}건` : null))
          .filter(Boolean)
          .join(" · ")
      : "선택 없음";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        ref={selectRef}
        name="toStatus"
        defaultValue="PAID"
        className="rounded-lg border px-3 py-1.5 text-sm"
      >
        {ALL.map((st) => (
          <option key={st} value={st} disabled={!allowedSet.has(st)}>
            {LABEL[st]} {!allowedSet.has(st) ? " (불가)" : ""}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-500">
        선택 {sel.length}건{sel.length ? ` · ${summary}` : ""}
        {sel.length > 0 && allowedSet.size === 0 ? " · 공통으로 가능한 전이가 없습니다" : ""}
      </span>
    </div>
  );
}
