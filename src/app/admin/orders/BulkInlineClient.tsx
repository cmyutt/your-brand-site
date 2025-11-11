"use client";
// CODPATCH: BulkInlineClient — inline bulk actions (no redirect) + top popup 3s
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkSetStatus, bulkDelete } from "./bulkInlineActions";
// CODPATCH: BulkInlineClient — submit helper
import SubmitButton from "@/components/SubmitButton";
import { ORDER_STATUS_LABEL_KO } from "@/lib/labels";

type Props = { selectedIds: string[] };

export default function BulkInlineClient({ selectedIds }: Props) {
  const router = useRouter();
  const [toStatus, setToStatus] = useState<string>("FULFILLED");
  const hasSel = (selectedIds?.length ?? 0) > 0;

  // 일괄 상태변경
  // @ts-ignore (prevState, formData)
  const [resStatus, actStatus] = useActionState(async (_: any, fd: FormData) => {
    const ids = fd.getAll("ids").map(String);
    const to = String(fd.get("toStatus") ?? "");
    const r = await bulkSetStatus(ids, to as any);
    if (r?.kind === "userOk") router.refresh();
    return r;
  }, null);

  // 일괄 삭제
  // @ts-ignore
  const [resDelete, actDelete] = useActionState(async (_: any, fd: FormData) => {
    const ids = fd.getAll("ids").map(String);
    const r = await bulkDelete(ids);
    if (r?.kind === "userOk") router.refresh();
    return r;
  }, null);

  // 상단 팝업(3초)
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  useEffect(() => {
    const r = resStatus ?? resDelete;
    // @ts-ignore
    if (!r?.kind) return;
    // @ts-ignore
    const type = r.kind === "userFail" ? "error" : "success";
    // @ts-ignore
    setToast({ msg: r.message ?? (type === "success" ? "완료되었습니다" : "오류가 발생했습니다"), type });
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [resStatus, resDelete]);

  return (
    <>
      {/* 상단 팝업 */}
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

      <div className="flex items-center gap-2">
        {/* 상태 선택 */}
        <select
          className="rounded-md border px-2 py-1 text-sm"
          value={toStatus}
          onChange={(e) => setToStatus(e.currentTarget.value)}
          disabled={!hasSel}
        >
          {Object.entries(ORDER_STATUS_LABEL_KO).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        {/* 일괄 상태변경 */}
        <form action={actStatus as any} className="inline">
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <input type="hidden" name="toStatus" value={toStatus} />
          <SubmitButton className="rounded-md bg-blue-600 px-3 py-1 text-sm text-white" disabled={!hasSel}>
            선택 상태변경
          </SubmitButton>
        </form>

        {/* 일괄 삭제 */}
        <form action={actDelete as any} className="inline">
          {selectedIds.map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}
          <SubmitButton className="rounded-md bg-rose-600 px-3 py-1 text-sm text-white" disabled={!hasSel}>
            선택 삭제
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
