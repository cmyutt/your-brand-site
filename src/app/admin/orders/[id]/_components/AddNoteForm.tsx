"use client";

import { useFormStatus } from "react-dom";
// ✅ 공용 액션 파일로 경로 수정 (한 단계 위)
import { addOrderNote } from "../../_actions";

export default function AddNoteForm({ orderId }: { orderId: string }) {
  return (
    <form action={addOrderNote} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input
        name="note"
        placeholder="이력 메모 추가"
        className="h-9 rounded-xl ring-1 ring-gray-200 bg-white px-3 text-sm w-80"
        required
      />
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-9 rounded-2xl px-3 text-sm font-medium ring-1 ring-gray-300 enabled:hover:bg-gray-50 disabled:opacity-50"
    >
      {pending ? "추가 중…" : "추가"}
    </button>
  );
}
