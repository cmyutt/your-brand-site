"use client";

import { useEffect } from "react";

/**
 * ↑ / ↓ : 행 포커스 이동
 * Space  : 현재 행 체크박스 토글
 */
export default function OrdersKeyboardNav() {
  useEffect(() => {
    function getRows(): HTMLElement[] {
      return Array.from(document.querySelectorAll<HTMLElement>('[data-order-row="1"]'));
    }
    function getIndex(el: Element | null) {
      if (!el) return -1;
      const rows = getRows();
      return rows.findIndex((r) => r === el);
    }
    function focusRow(idx: number) {
      const rows = getRows();
      if (idx < 0 || idx >= rows.length) return;
      rows[idx].focus();
      rows[idx].scrollIntoView({ block: "nearest" });
    }
    function toggleRow(row: HTMLElement | null) {
      if (!row) return;
      const cb = row.querySelector<HTMLInputElement>('input[name="selectOrder"]');
      if (cb) {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    const onKey = (e: KeyboardEvent) => {
      // 입력 중엔 패스
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      const rows = getRows();
      if (rows.length === 0) return;

      let current = document.activeElement as HTMLElement | null;
      if (!current || getIndex(current) === -1) {
        current = rows[0];
        current.focus();
      }
      const curIdx = getIndex(document.activeElement);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusRow(Math.min(curIdx + 1, rows.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusRow(Math.max(curIdx - 1, 0));
      } else if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        toggleRow(document.activeElement as HTMLElement);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return null;
}
