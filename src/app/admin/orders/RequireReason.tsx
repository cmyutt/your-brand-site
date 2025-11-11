"use client";

import { useEffect } from "react";

/**
 * 상세 페이지 상태 변경 폼용 가드.
 * - select[name=to]가 CANCELED/REFUNDED면 note를 필수로 전환
 * - 제출 시 사유 미입력이면 제출 막고 포커스/알림
 */
export default function RequireReason({
  formId,
  selectName = "to",
  noteName = "note",
  minLen = 2,
}: {
  formId: string;
  selectName?: string;
  noteName?: string;
  minLen?: number;
}) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    const sel = form.querySelector<HTMLSelectElement>(`select[name="${selectName}"]`);
    const note = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${noteName}"]`);
    if (!sel || !note) return;

    const needsReason = () => sel.value === "CANCELED" || sel.value === "REFUNDED";

    const updateAttrs = () => {
      const need = needsReason();
      note.toggleAttribute("required", need);
      // minlength는 문자열 속성이라 0/숫자 모두 문자열로
      if (need) {
        note.setAttribute("minlength", String(minLen));
        note.setAttribute("placeholder", "사유(필수)");
      } else {
        note.removeAttribute("minlength");
        note.setAttribute("placeholder", "사유/메모 (선택)");
      }
    };

    const onSubmit = (e: Event) => {
      if (!needsReason()) return;
      const val = (note as HTMLInputElement).value?.trim() ?? "";
      if (val.length < minLen) {
        e.preventDefault();
        // 사용자에게 바로 안내하고 입력 칸에 포커스
        alert(`취소/환불 사유를 입력해 주세요 (최소 ${minLen}자).`);
        (note as HTMLInputElement).focus();
      }
    };

    sel.addEventListener("change", updateAttrs);
    form.addEventListener("submit", onSubmit);
    updateAttrs(); // 최초 1회 적용

    return () => {
      sel.removeEventListener("change", updateAttrs);
      form.removeEventListener("submit", onSubmit);
    };
  }, [formId, selectName, noteName, minLen]);

  return null;
}
