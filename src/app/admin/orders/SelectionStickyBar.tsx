// src/app/admin/orders/SelectionStickyBar.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  deleteFormId: string; // ex) "bulkDeleteForm"
  checkboxName?: string; // default "selectOrder"
  statusFormId?: string; // ex) "bulkStatusForm"
};

function collectSelection(checkboxName = "selectOrder") {
  const boxes = Array.from(
    document.querySelectorAll<HTMLInputElement>(`input[name="${checkboxName}"]:checked`)
  );
  const count = boxes.length;
  const items = boxes.reduce((a, el) => a + Number(el.dataset.items || 0), 0);
  const total = boxes.reduce((a, el) => a + Number(el.dataset.total || 0), 0);
  const ids = boxes
    .map((el) => String(el.dataset.orderId || el.getAttribute("data-order-id") || el.value))
    .filter(Boolean);
  return { count, items, total, ids };
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "대기중" },
  { value: "PAID", label: "결제완료" },
  { value: "FULFILLED", label: "배송완료" },
  { value: "CANCELED", label: "취소됨" },
  { value: "REFUNDED", label: "환불됨" },
] as const;

export default function SelectionStickyBar({
  deleteFormId,
  checkboxName = "selectOrder",
  statusFormId = "bulkStatusForm",
}: Props) {
  const [sel, setSel] = useState(() =>
    typeof window === "undefined"
      ? { count: 0, items: 0, total: 0, ids: [] as string[] }
      : collectSelection(checkboxName)
  );
  const [toStatus, setToStatus] = useState<string>("");

  useEffect(() => {
    const handler = () => setSel(collectSelection(checkboxName));
    document.addEventListener("change", handler, true);
    handler();
    return () => document.removeEventListener("change", handler, true);
  }, [checkboxName]);

  const hasSelection = sel.count > 0;
  const fmtTotal = useMemo(() => new Intl.NumberFormat("ko-KR").format(sel.total), [sel.total]);

  const setAll = (checked: boolean) => {
    const boxes = Array.from(
      document.querySelectorAll<HTMLInputElement>(`input[name="${checkboxName}"]`)
    );
    for (const el of boxes) {
      if (el.disabled) continue;
      el.checked = checked;
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const onDelete = () => {
    const form = document.getElementById(deleteFormId) as HTMLFormElement | null;
    if (!form || sel.ids.length === 0) return;
    form.querySelectorAll('input[name="ids"], input[name="ids[]"]').forEach((n) => n.remove());
    sel.ids.forEach((id) => {
      const a = document.createElement("input");
      a.type = "hidden";
      a.name = "ids";
      a.value = id;
      form.appendChild(a);
    });
    const submitter = form.querySelector<HTMLButtonElement>("#bulkStatusSubmit");
    if (submitter) submitter.click(); else form.requestSubmit();
  };

  const onExportSelected = () => {
    if (!sel.ids.length) return;
    const base = new URL("/admin/orders/export", location.origin);
    const qs = new URLSearchParams(location.search);
    qs.set("bom", "1");
    sel.ids.forEach((id) => qs.append("ids", id));
    window.open(`${base.pathname}?${qs.toString()}`, "_blank", "noopener");
  };

  const onBulkStatus = () => {
    const current = collectSelection(checkboxName);
    if (!current.ids.length || !toStatus) return;
    const form = document.getElementById(statusFormId) as HTMLFormElement | null;
    if (!form) return;
    form.querySelectorAll('input[name="ids"], input[name="ids[]"], input[name="toStatus"]').forEach((n) => n.remove());
    const t = document.createElement("input");
    t.type = "hidden";
    t.name = "toStatus";
    t.value = toStatus;
    form.appendChild(t);
    current.ids.forEach((id) => {
      const a = document.createElement("input");
      a.type = "hidden";
      a.name = "ids";
      a.value = id;
      form.appendChild(a);
    });
    form.requestSubmit();
  };

  return (
    <div
      className={[
        "sticky top-0 z-40",
        hasSelection ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1",
        "transition-all",
      ].join(" ")}
      aria-hidden={!hasSelection}
    >
      <div className="mx-auto max-w-5xl">
        <div className="m-2 rounded-2xl border bg-white/95 shadow-sm backdrop-blur px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-gray-800">
              <strong className="font-semibold">{sel.count}</strong>건 선택됨
              <span className="mx-1">·</span>
              아이템 <strong className="font-semibold">{sel.items}</strong>개
              <span className="mx-1">·</span>
              총액 <strong className="font-semibold">₩{fmtTotal}</strong>
              <span className="ml-2 text-gray-500">/ 1 ~ 이동, Space로 선택 해제</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAll(true)}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 whitespace-nowrap"
                title="현재 페이지의 모든 주문 선택"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={() => setAll(false)}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 whitespace-nowrap"
                title="현재 페이지의 선택 해제"
              >
                전체 해제
              </button>

              <button
                type="button"
                onClick={onDelete}
                className="ml-1 rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 whitespace-nowrap"
                title="선택 삭제"
              >
                선택 삭제
              </button>

              <button
                type="button"
                onClick={onExportSelected}
                className="ml-1 rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50 whitespace-nowrap"
                title="선택 주문을 CSV로 내보내기"
              >
                선택 CSV
              </button>

              <div className="ml-2 flex items-center gap-2">
                <select
                  className="h-9 min-w-[120px] rounded-lg border px-2 text-sm whitespace-nowrap"
                  value={toStatus}
                  onChange={(e) => setToStatus(e.currentTarget.value)}
                  title="변경할 상태 선택"
                >
                  <option value="">상태변경…</option>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onBulkStatus}
                  disabled={!toStatus || !hasSelection}
                  className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  title="선택 주문 일괄 상태 변경"
                >
                  선택 상태변경
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
