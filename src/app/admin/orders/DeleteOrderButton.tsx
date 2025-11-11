// src/app/admin/orders/DeleteOrderButton.tsx
"use client";

// CODPATCH: DeleteOrderButton — inline delete (no redirect) + top popup
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOrderInline } from "./inlineActions";
import SubmitButton from "@/components/SubmitButton";

export default function DeleteOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  // @ts-ignore server action signature (prev, formData)
  const [result, formAction] = useActionState(deleteOrderInline as any, null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!result) return;
    const ok = (result as any)?.kind !== "userFail";
    const msg = (result as any)?.message || (ok ? "삭제했습니다" : "삭제 중 오류가 발생했습니다");
    setToast({ msg, type: ok ? "success" : "error" });
    if (ok) router.refresh();
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [result, router]);

  return (
    <>
      {toast ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div
            className={`rounded-xl px-4 py-3 text-xs ring-1 ${
              toast.type === "success"
                ? "bg-green-50 text-green-800 ring-green-200"
                : "bg-red-50 text-red-800 ring-red-200"
            }`}
            role="status"
            aria-live="polite"
            data-codpatch="inline-flash"
          >
            {toast.msg}
          </div>
        </div>
      ) : null}

      <form
        action={formAction as any}
        onSubmit={(e) => {
          const ok = confirm(`주문 #${orderId.slice(0, 8)} 을(를) 삭제할까요?\n삭제는 되돌릴 수 없습니다.`);
          if (!ok) e.preventDefault();
        }}
        className="inline-block"
      >
        <input type="hidden" name="orderId" value={orderId} />
        <SubmitButton className="h-8 rounded-xl px-3 text-xs font-medium ring-1 ring-red-300 text-red-700 hover:bg-red-50">
          삭제
        </SubmitButton>
      </form>
    </>
  );
}

