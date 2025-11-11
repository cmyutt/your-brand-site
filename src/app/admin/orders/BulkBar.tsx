"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  deleteFormId: string;
  statusFormId?: string;      // ✅ 선택값
  enableStatus?: boolean;     // ✅ 기본 true, false면 상태변경 버튼 숨김
  checkboxSelector?: string;  // 체크박스 쿼리
};

export default function BulkBar({
  statusFormId,
  deleteFormId,
  enableStatus = true,
  checkboxSelector = 'input[name="selectOrder"]',
}: Props) {
  const [count, setCount] = useState(0);

  const getBoxes = useCallback(() => {
    return Array.from(document.querySelectorAll<HTMLInputElement>(checkboxSelector));
  }, [checkboxSelector]);

  const getSelectedIds = useCallback(() => {
    return getBoxes()
      .filter((b) => b.checked && b.dataset.orderId)
      .map((b) => String(b.dataset.orderId));
  }, [getBoxes]);

  const syncCount = useCallback(() => setCount(getSelectedIds().length), [getSelectedIds]);

  useEffect(() => {
    const i = setInterval(syncCount, 300);
    return () => clearInterval(i);
  }, [syncCount]);

  const toggleAll = useCallback(() => {
    const boxes = getBoxes();
    const allChecked = boxes.length > 0 && boxes.every((b) => b.checked);
    boxes.forEach((b) => (b.checked = !allChecked));
    syncCount();
  }, [getBoxes, syncCount]);

  const injectIds = useCallback((formId?: string) => {
    if (!formId) return null;
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return null;
    Array.from(form.querySelectorAll('input[name="ids"]')).forEach((n) => n.remove());
    const ids = getSelectedIds();
    ids.forEach((id) => {
      const h = document.createElement("input");
      h.type = "hidden";
      h.name = "ids";
      h.value = id;
      form.appendChild(h);
    });
    return form;
  }, [getSelectedIds]);

  const submitStatus = useCallback(() => {
    if (!enableStatus || !statusFormId) return;
    const form = injectIds(statusFormId);
    if (!form) return;
    if (count === 0) {
      alert("선택된 주문이 없습니다.");
      return;
    }
    form.requestSubmit();
  }, [injectIds, statusFormId, count, enableStatus]);

  const submitDelete = useCallback(() => {
    const form = injectIds(deleteFormId);
    if (!form) return;
    if (count === 0) {
      alert("선택된 주문이 없습니다.");
      return;
    }
    if (!confirm(`선택된 ${count}건을 삭제할까요?\n삭제 후 복구할 수 없습니다.`)) return;
    form.requestSubmit();
  }, [injectIds, deleteFormId, count]);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button type="button" onClick={toggleAll}>전체선택/해제</button>
      <span style={{ fontSize: 12, opacity: 0.7 }}>선택 {count}건</span>
      {enableStatus && statusFormId ? (
        <button type="button" onClick={submitStatus} title="선택 상태 변경">상태 변경</button>
      ) : null}
      <button type="button" onClick={submitDelete} title="선택 삭제" style={{ color: "#b00020" }}>
        선택 삭제
      </button>
    </div>
  );
}
