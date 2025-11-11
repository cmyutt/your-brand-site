"use client";

import { useEffect } from "react";

/**
 * 폼 제출 직전 'to'를 동적으로 읽고(CANCELED/REFUNDED면)
 * note가 비어 있으면 prompt로 입력받아 hidden으로 주입한다.
 */
export default function ReasonOnSubmit({
  formId,
  minLen = 2,
  toInputName = "to",
  noteName = "note",
}: {
  formId: string;
  minLen?: number;
  toInputName?: string;  // 기본 "to"
  noteName?: string;     // 기본 "note"
}) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const readTo = () => {
      // 1) select[name=to] 우선
      const sel = form.querySelector<HTMLSelectElement>(`select[name="${toInputName}"]`);
      if (sel && sel.value) return sel.value.toUpperCase();

      // 2) hidden/input[name=to]
      const hid = form.querySelector<HTMLInputElement>(`input[name="${toInputName}"]`);
      if (hid && hid.value) return hid.value.toUpperCase();

      return "";
    };

    const readNoteEl = () =>
      form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${noteName}"]`);

    const onSubmit = (e: Event) => {
      const to = readTo();
      if (to !== "CANCELED" && to !== "REFUNDED") return;

      let noteEl = readNoteEl();
      let val = (noteEl as HTMLInputElement | HTMLTextAreaElement)?.value?.trim() ?? "";

      if (!val || val.length < minLen) {
        const label = to === "CANCELED" ? "취소" : "환불";
        val = window.prompt(`${label} 사유를 입력해 주세요 (최소 ${minLen}자)`)?.trim() ?? "";
      }
      if (!val || val.length < minLen) {
        e.preventDefault();
        return;
      }

      if (!noteEl) {
        // 없으면 hidden으로 생성
        const h = document.createElement("input");
        h.type = "hidden";
        h.name = noteName;
        h.value = val;
        form.appendChild(h);
      } else {
        (noteEl as HTMLInputElement | HTMLTextAreaElement).value = val;
      }
    };

    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [formId, minLen, toInputName, noteName]);

  return null;
}
