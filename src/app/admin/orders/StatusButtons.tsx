"use client";

import { OrderStatus } from "@prisma/client";
import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { changeStatusInline } from "./inlineActions";
import { useRowPatch } from "./RowPatchContext";
import FormLiveHint from "./FormLiveHint";
import { previewTotalDelta } from "@/lib/stockDeltaPreview";
import SubmitButton from "@/components/SubmitButton";
import { tOrderStatus } from "@/lib/labels";

type Props = { orderId: string; current: OrderStatus; totalQty?: number };

const ALL: OrderStatus[] = ["PENDING", "PAID", "FULFILLED", "CANCELED", "REFUNDED"];

// Client-side rule mirrors server domain guard (original app rules)
const ALLOWED_CLIENT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PAID", "FULFILLED"],
  PAID: ["FULFILLED", "CANCELED", "REFUNDED"],
  FULFILLED: ["REFUNDED"],
  CANCELED: ["PENDING"],
  REFUNDED: ["PENDING"],
};

export default function StatusButtons({ orderId, current, totalQty = 0 }: Props) {
  const nexts = ALLOWED_CLIENT[current] ?? [];
  const router = useRouter();
  // @ts-ignore — React 19 useActionState for server actions
  const [result, formAction] = useActionState(changeStatusInline as any, null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [lastTo, setLastTo] = useState<OrderStatus | null>(null);
  const { patchRow } = useRowPatch();

  useEffect(() => {
    if (!result) return;
    const ok = (result as any)?.kind !== "userFail";
    const msg = (result as any)?.message || (ok ? "완료되었습니다" : "오류가 발생했습니다");
    setToast({ msg, type: ok ? "success" : "error" });
    if (ok) {
      if (lastTo) {
        try { patchRow(orderId, { status: lastTo }); }
        catch { router.refresh(); }
      } else {
        router.refresh();
      }
    }
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [result, router]);

  return (
    <form action={formAction as any} className="flex flex-wrap gap-2">
      {toast ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div
            className={`rounded-xl px-4 py-3 text-sm ring-1 ${
              toast.type === "success"
                ? "bg-green-50 text-green-800 ring-green-200"
                : "bg-red-50 text-red-800 ring-red-200"
            }`}
            data-codpatch="inline-flash"
            role="status"
            aria-live="polite"
          >
            {toast.msg}
          </div>
        </div>
      ) : null}
      <FormLiveHint />
      <input type="hidden" name="orderId" value={orderId} />
      {ALL.map((to) => {
        const disabled = to === current || !nexts.includes(to);
        const delta = previewTotalDelta(current, to, totalQty);
        const label = tOrderStatus(to);
        const deltaText = delta ? ` · 예상 재고 ${delta > 0 ? "+" + delta : delta}` : "";
        const title = `${label}${disabled ? " (불가)" : ""}${deltaText}`;
        return (
          <SubmitButton
            key={to}
            name="to"
            value={to}
            title={title}
            disabled={disabled}
            className="rounded-lg px-2.5 py-1 text-sm ring-1 ring-gray-200 hover:bg-gray-50"
            data-delta={delta}
            onMouseDown={() => setLastTo(to)}
            onClick={() => setLastTo(to)}
          >
            {label}
          </SubmitButton>
        );
      })}
    </form>
  );
}
