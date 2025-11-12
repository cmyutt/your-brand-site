"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";
import { changeStatusInline } from "../../inlineActions";

type Option = { value: OrderStatus; label: string; disabled?: boolean; title?: string };

type ToastState = { msg: string; type: "success" | "error" } | null;

export default function StatusChangeInline({
  orderId,
  options,
}: {
  orderId: string;
  options: Option[];
}) {
  const router = useRouter();
  // @ts-ignore
  const [result, formAction] = useActionState(changeStatusInline as any, null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    if (!result) return;
    const ok = (result as any)?.kind !== "userFail";
    const msg = (result as any)?.message || (ok ? "처리가 완료되었습니다" : "오류가 발생했습니다");
    setToast({ msg, type: ok ? "success" : "error" });
    if (ok) router.refresh();
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [result, router]);

  const toastClassName = toast
    ? toast.type === "success"
      ? "rounded-xl px-4 py-2 text-xs ring-1 shadow bg-emerald-50 text-emerald-900 ring-emerald-200"
      : "rounded-xl px-4 py-2 text-xs ring-1 shadow bg-rose-50 text-rose-900 ring-rose-200"
    : "";

  return (
    <>
      {toast ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div className={toastClassName} role="status" aria-live="polite">
            {toast.msg}
          </div>
        </div>
      ) : null}

      <form action={formAction as any} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="orderId" value={orderId} />
        <select
          name="to"
          defaultValue=""
          className="h-9 rounded-xl ring-1 ring-gray-200 bg-white px-2 text-sm text-gray-900"
          title="상태 변경과 변경 사유를 함께 남겨 주세요"
        >
          <option value="" disabled>
            상태 선택
          </option>
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={Boolean(opt.disabled)}
              title={opt.title}
            >
              {opt.label}
            </option>
          ))}
        </select>
        <input
          name="note"
          placeholder="사유/메모 (선택)"
          className="h-9 rounded-xl ring-1 ring-gray-200 bg-white px-3 text-sm w-64"
        />
        <button
          type="submit"
          className="h-9 rounded-2xl px-3 text-sm font-medium ring-1 ring-gray-300 hover:bg-gray-50"
          title="선택한 상태로 변경합니다"
        >
          변경
        </button>
      </form>
    </>
  );
}
